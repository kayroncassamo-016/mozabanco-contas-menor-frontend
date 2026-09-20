
import * as XLSX from "xlsx";

export interface PeriodValue {
  label: string;
  month: string;
  sub: string;
  value: number;
}

export interface MenorMetric {
  key: "total" | "atingida" | "porAtingir" | "proximos3m" | "superior3m";
  label: string;
  series: PeriodValue[];
  current: number | null;
  currentPeriod: string | null;
  previous: number | null;
  deltaPct: number | null;
}

export interface ParsedResult {
  sheetName: string;
  metrics: MenorMetric[];
  reportPeriod: string | null;
  weeksAvailable: number;
  /** Rótulo da 1ª semana/quinzena que está em branco no ficheiro (a que falta calcular). */
  targetPeriod: string | null;
  /** Indica se já foi preenchida com os valores calculados a partir do Contas Menor. */
  targetFilled: boolean;
}

export interface ContasMenorResult {
  reportDate: Date;
  total: number;
  atingida: number;
  porAtingir: number;
  proximos3m: number;
  superior3m: number;
}

const TARGETS: { key: MenorMetric["key"]; label: string; match: string }[] = [
  { key: "total", label: "Contas Menor", match: "contas menor" },
  { key: "atingida", label: "Com maioridade atingida", match: "com maioridade atingida" },
  { key: "porAtingir", label: "Por atingir maioridade", match: "por atingir maioridade" },
  { key: "proximos3m", label: "Nos próximos 3 meses", match: "nos proximos 3 meses" },
  { key: "superior3m", label: "Superior a 3 meses", match: "superior a 3 meses" },
];

function normalize(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export class PlanoParseError extends Error {}

/**
 * Lê a folha "Mapa de acompanhamento" do Plano de Actividades.
 * Para cada métrica devolve o histórico já preenchido (series) e identifica
 * a PRIMEIRA coluna (semana/quinzena) que ainda está em branco — é essa
 * que precisa de ser calculada a partir do ficheiro Contas Menor.
 */
export function parsePlanoWorkbook(buffer: ArrayBuffer): ParsedResult {
  const wb = XLSX.read(buffer, { type: "array" }); // sem cellDates: evita bug de fuso horário (ver formatMonthCell)

  let sheetName = wb.SheetNames.find((n) => normalize(n).includes("mapa"));
  if (!sheetName) {
    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
        header: 1,
        defval: null,
      });
      if (rows.some((r) => normalize(r?.[0]).includes("contas menor"))) {
        sheetName = name;
        break;
      }
    }
  }
  if (!sheetName) {
    throw new PlanoParseError(
      "Não encontrei uma aba 'Mapa de acompanhamento' (ou equivalente) com dados de Contas Menor neste ficheiro."
    );
  }

  const ws = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: true,
  });

  let subRowIdx = -1;
  for (let i = 0; i < Math.min(12, rows.length); i++) {
    const rowNorm = (rows[i] || []).map(normalize);
    if (rowNorm.some((c) => c.includes("semana") || c.includes("quinzena"))) {
      subRowIdx = i;
      break;
    }
  }
  if (subRowIdx === -1) {
    throw new PlanoParseError(
      "Não consegui identificar a estrutura de semanas/quinzenas nesta folha."
    );
  }
  const monthRowIdx = Math.max(0, subRowIdx - 1);
  const monthRow = rows[monthRowIdx] || [];
  const subRow = rows[subRowIdx] || [];
  const maxCol = rows.reduce((m, r) => Math.max(m, (r || []).length), 0);

  const MONTH_NAMES_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  function formatMonthCell(raw: unknown): string {
    // As células de mês são datas do Excel guardadas como número de série.
    // NUNCA converter via `new Date(serial)` + cellDates:true — o SheetJS
    // desloca a data segundo o fuso horário do browser, o que troca o mês
    // (ex: em UTC+2, Julho aparece como Junho). Ler o número de série
    // directamente com SSF.parse_date_code() evita qualquer fuso horário.
    if (typeof raw === "number") {
      const d = XLSX.SSF.parse_date_code(raw);
      if (d) return `${MONTH_NAMES_PT[d.m - 1]} ${d.y}`;
    }
    if (raw instanceof Date) {
      return `${MONTH_NAMES_PT[raw.getUTCMonth()]} ${raw.getUTCFullYear()}`;
    }
    return String(raw).trim();
  }
  const monthLabels: string[] = [];
  let lastMonth = "";
  for (let c = 0; c < maxCol; c++) {
    const raw = monthRow[c];
    if (raw !== null && raw !== undefined && String(raw).trim() !== "") {
      lastMonth = formatMonthCell(raw);
    }
    monthLabels[c] = lastMonth;
  }

  const dataCols: number[] = [];
  for (let c = 1; c < maxCol; c++) {
    const sub = normalize(subRow[c]);
    if (!sub || sub.includes("dif")) continue;
    dataCols.push(c);
  }
  if (dataCols.length === 0) {
    throw new PlanoParseError("Não encontrei colunas de dados (Semana/Quinzena) válidas nesta folha.");
  }

  // Localizar a linha "Contas menor" para decidir qual é a 1ª coluna em branco
  // (assume-se que todas as métricas partilham a mesma grelha de colunas).
  let totalRowIdx = -1;
  for (let r = subRowIdx + 1; r < rows.length; r++) {
    if (normalize(rows[r]?.[0]) === "contas menor") {
      totalRowIdx = r;
      break;
    }
  }
  let targetCol: number | null = null;
  if (totalRowIdx !== -1) {
    const totalRow = rows[totalRowIdx];
    // A semana-alvo é a que vem logo a seguir à ÚLTIMA coluna preenchida em
    // toda a série (não a 1ª coluna vazia) — assim ignoramos buracos
    // históricos isolados e apanhamos mesmo a próxima semana por calcular.
    let lastFilledIdx = -1;
    dataCols.forEach((c, idx) => {
      const val = totalRow[c];
      if (typeof val === "number" && Number.isFinite(val)) lastFilledIdx = idx;
    });
    if (lastFilledIdx !== -1 && lastFilledIdx + 1 < dataCols.length) {
      targetCol = dataCols[lastFilledIdx + 1];
    }
  }
  const targetPeriod =
    targetCol !== null ? `${monthLabels[targetCol]} · ${String(subRow[targetCol]).trim()}` : null;

  const metrics: MenorMetric[] = TARGETS.map((target) => {
    let rowIdx = -1;
    for (let r = subRowIdx + 1; r < rows.length; r++) {
      if (normalize(rows[r]?.[0]) === target.match) {
        rowIdx = r;
        break;
      }
    }
    if (rowIdx === -1) {
      return { key: target.key, label: target.label, series: [], current: null, currentPeriod: null, previous: null, deltaPct: null };
    }

    const row = rows[rowIdx];
    const series: PeriodValue[] = [];
    for (const c of dataCols) {
      const val = row[c];
      if (typeof val === "number" && Number.isFinite(val)) {
        series.push({
          label: `${monthLabels[c]} · ${String(subRow[c]).trim()}`,
          month: monthLabels[c],
          sub: String(subRow[c]).trim(),
          value: val,
        });
      }
    }

    // Sem ficheiro Contas Menor ainda: mostramos o último valor JÁ PREENCHIDO
    // (isto é substituído depois por mergeContasMenorIntoPlano quando o 2º ficheiro for carregado)
    const current = series.length > 0 ? series[series.length - 1] : null;
    const previous = series.length > 1 ? series[series.length - 2] : null;
    const deltaPct =
      current && previous && previous.value !== 0 ? (current.value - previous.value) / previous.value : null;

    return {
      key: target.key,
      label: target.label,
      series,
      current: current?.value ?? null,
      currentPeriod: current?.label ?? null,
      previous: previous?.value ?? null,
      deltaPct,
    };
  });

  const totalMetric = metrics.find((m) => m.key === "total");

  return {
    sheetName,
    metrics,
    reportPeriod: totalMetric?.currentPeriod ?? null,
    weeksAvailable: totalMetric?.series.length ?? 0,
    targetPeriod,
    targetFilled: false,
  };
}

/**
 * Lê o ficheiro bruto "Contas Menor" (uma linha por conta, com a Data de
 * Nascimento) e calcula os 5 valores para a data de reporte encontrada
 * no próprio ficheiro (coluna "Dia", se existir).
 */
export function parseContasMenorWorkbook(buffer: ArrayBuffer): ContasMenorResult {
  const wb = XLSX.read(buffer, { type: "array" }); // sem cellDates: evita bug de fuso horário (ver formatMonthCell)

  // Escolhe a folha que tem as colunas necessárias (não confiar em "menos
  // duplicados" — esse era o bug: um ficheiro já vinha pré-filtrado por
  // outra pessoa e escondia a necessidade real do filtro).
  let headerRowIdx = -1;
  let rows: unknown[][] = [];

  for (const name of wb.SheetNames) {
    const r: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null });
    for (let i = 0; i < Math.min(5, r.length); i++) {
      const rowNorm = (r[i] || []).map(normalize);
      if (
        rowNorm.includes("conta") &&
        rowNorm.includes("cliente") &&
        rowNorm.includes("classe componente") &&
        rowNorm.some((c) => c.includes("nascimento"))
      ) {
        headerRowIdx = i;
        rows = r;
        break;
      }
    }
    if (headerRowIdx !== -1) break;
  }

  if (headerRowIdx === -1) {
    throw new PlanoParseError(
      "Não encontrei, neste ficheiro, as colunas 'Conta', 'Cliente', 'Classe Componente' e 'Data de Nascimento'. Confirme que carregou o ficheiro Contas Menor (bruto) correcto."
    );
  }

  const header = (rows[headerRowIdx] || []).map(normalize);
  const nascCol = header.findIndex((c) => c.includes("nascimento"));
  const diaCol = header.findIndex((c) => c === "dia");
  const clienteCol = header.findIndex((c) => c === "cliente");
  const classeComponenteCol = header.findIndex((c) => c === "classe componente");

  function toDate(v: unknown): Date | null {
    if (v instanceof Date) return v;
    if (typeof v === "number") {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return new Date(d.y, d.m - 1, d.d);
      return null;
    }
    if (typeof v === "string" && v.trim() !== "") {
      const parts = v.split(/[\/\-]/);
      if (parts.length === 3) {
        const [a, b, c] = parts.map((p) => parseInt(p, 10));
        if (a && b && c) return new Date(c, b - 1, a);
      }
    }
    return null;
  }

  function normVal(v: unknown): string {
    return String(v ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  }

  const dataRows = rows.slice(headerRowIdx + 1);

  // Filtro 1: Classe Componente = "DO" (Depósitos à Ordem) — exclui CCO, DP,
  // DS, CARC, GARR, CRR e células vazias.
  const doRows = dataRows.filter((r) => normVal(r[classeComponenteCol]) === "DO");

  // Filtro 2: remover duplicados por Cliente (um cliente pode ter várias
  // contas/produtos; só deve contar uma vez).
  const seen = new Set<unknown>();
  const uniqueRows: unknown[][] = [];
  for (const r of doRows) {
    const key = r[clienteCol];
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueRows.push(r);
  }

  // Data de reporte: usar a coluna "Dia" da 1ª linha; senão, hoje.
  let reportDate: Date | null = null;
  if (diaCol !== -1) {
    for (const r of dataRows) {
      const raw = r[diaCol];
      if (raw === null || raw === undefined) continue;
      if (typeof raw === "number" && String(raw).length === 8) {
        const s = String(raw);
        reportDate = new Date(parseInt(s.slice(0, 4)), parseInt(s.slice(4, 6)) - 1, parseInt(s.slice(6, 8)));
      } else {
        reportDate = toDate(raw);
      }
      if (reportDate) break;
    }
  }
  if (!reportDate) reportDate = new Date();

  const plus3m = new Date(reportDate);
  plus3m.setMonth(plus3m.getMonth() + 3);

  let total = 0;
  let atingida = 0;
  let proximos3m = 0;
  let porAtingir = 0;

  for (const r of uniqueRows) {
    const birth = toDate(r[nascCol]);
    if (!birth) continue;
    total++;
    const age18 = new Date(birth);
    age18.setFullYear(age18.getFullYear() + 18);

    if (age18.getTime() <= reportDate.getTime()) {
      atingida++;
    } else {
      porAtingir++;
      if (age18.getTime() <= plus3m.getTime()) proximos3m++;
    }
  }

  return {
    reportDate,
    total,
    atingida,
    porAtingir,
    proximos3m,
    superior3m: porAtingir - proximos3m,
  };
}

/**
 * Combina os dois ficheiros: preenche, no resultado do Plano de Actividades,
 * a 1ª semana em branco com os valores calculados a partir do Contas Menor.
 */
export function mergeContasMenorIntoPlano(
  plano: ParsedResult,
  cm: ContasMenorResult
): ParsedResult {
  if (!plano.targetPeriod) {
    // Não há semana em branco: não há nada para calcular.
    return plano;
  }

  const values: Record<MenorMetric["key"], number> = {
    total: cm.total,
    atingida: cm.atingida,
    porAtingir: cm.porAtingir,
    proximos3m: cm.proximos3m,
    superior3m: cm.superior3m,
  };

  const metrics = plano.metrics.map((m) => {
    const newValue = values[m.key];
    const previous = m.series.length > 0 ? m.series[m.series.length - 1].value : null;
    const deltaPct = previous && previous !== 0 ? (newValue - previous) / previous : null;
    const newSeries = [
      ...m.series,
      { label: plano.targetPeriod as string, month: "", sub: "", value: newValue },
    ];
    return {
      ...m,
      series: newSeries,
      current: newValue,
      currentPeriod: plano.targetPeriod,
      previous,
      deltaPct,
    };
  });

  return {
    ...plano,
    metrics,
    reportPeriod: plano.targetPeriod,
    targetFilled: true,
  };
}

