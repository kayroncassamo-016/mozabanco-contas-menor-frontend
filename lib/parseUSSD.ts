
import * as XLSX from "xlsx";
import type { PeriodValue } from "./parsePlano";

export class UssdParseError extends Error {}


export interface UssdDaily {
  date: string; // dd/mm
  count: number;
}

export interface UssdResult {
  refDate: Date;
  inicioSemana: Date;
  totalBruto: number;
  semEncerradas: number;
  totalServicos: number; // sem encerradas + sem duplicados por Cliente
  servicosSemana: number;
  convergentes: number;
  divergentes: number;
  divergentesEntidades: string[]; // COD_ENT dos contactos divergentes
  serieDiaria: UssdDaily[];


  convergentesTotal: number;
  divergentesTotal: number;
  divergentesEntidadesTotal: string[];
}

function normalize(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Como normalize() não colapsa espaços duplos, e os rótulos no Plano têm
// espaços a mais (ex: "Contactos  (Contas vs Moza Já) "), usamos esta versão
// para comparações de secção.
function normCollapse(v: unknown): string {
  return normalize(v).replace(/\s+/g, " ").trim();
}

export interface UssdPlanoMetric {
  key: "servicosSemana" | "divergentes" | "convergentes";
  label: string;
  series: PeriodValue[];
  current: number | null;
  currentPeriod: string | null;
  previous: number | null;
  deltaPct: number | null;
}

export interface UssdPlanoResult {
  sheetName: string;
  metrics: UssdPlanoMetric[];
  targetPeriod: string | null;
}

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
function formatMonthCell(raw: unknown): string {
  // Ler o número de série do Excel directamente (SSF), nunca via objecto
  // Date + cellDates:true — isso desloca a data segundo o fuso horário do
  // browser (ex: em UTC+2, Julho aparece como Junho).
  if (typeof raw === "number") {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) return `${MONTH_NAMES_PT[d.m - 1]} ${d.y}`;
  }
  if (raw instanceof Date) return `${MONTH_NAMES_PT[raw.getUTCMonth()]} ${raw.getUTCFullYear()}`;
  return String(raw).trim();
}

const PLANO_ROW_TARGETS: { key: UssdPlanoMetric["key"]; label: string; match: string }[] = [
  { key: "servicosSemana", label: "Serviços da semana", match: "servicos da semana" },
  { key: "divergentes", label: "Contacto divergentes", match: "contacto divergentes" },
  { key: "convergentes", label: "Contacto Convergentes", match: "contacto convergentes" },
];

/**
 * Lê a folha "Mapa de acompanhamento" do Plano de Actividades e devolve o
 * histórico + a 1ª semana em branco das linhas da secção
 * "Contactos (Contas vs Moza Já)" — não confundir com a secção seguinte
 * "Contactos de mail", que tem rótulos de linha iguais ("Serviços da
 * semana"), por isso procuramos só DENTRO desta secção.
 */
export function parseUssdFromPlano(buffer: ArrayBuffer): UssdPlanoResult {
  const wb = XLSX.read(buffer, { type: "array" }); // sem cellDates: evita bug de fuso horário (ver formatMonthCell)
  let sheetName = wb.SheetNames.find((n) => normalize(n).includes("mapa"));
  if (!sheetName) sheetName = wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

  let subRowIdx = -1;
  for (let i = 0; i < Math.min(12, rows.length); i++) {
    const rowNorm = (rows[i] || []).map(normalize);
    if (rowNorm.some((c) => c.includes("semana") || c.includes("quinzena"))) {
      subRowIdx = i;
      break;
    }
  }
  if (subRowIdx === -1) {
    throw new UssdParseError("Não consegui identificar a estrutura de semanas/quinzenas nesta folha.");
  }

  const monthRowIdx = Math.max(0, subRowIdx - 1);
  const monthRow = rows[monthRowIdx] || [];
  const subRow = rows[subRowIdx] || [];
  const maxCol = rows.reduce((m, r) => Math.max(m, (r || []).length), 0);

  const monthLabels: string[] = [];
  let lastMonth = "";
  for (let c = 0; c < maxCol; c++) {
    const raw = monthRow[c];
    if (raw !== null && raw !== undefined && String(raw).trim() !== "") lastMonth = formatMonthCell(raw);
    monthLabels[c] = lastMonth;
  }

  const dataCols: number[] = [];
  for (let c = 1; c < maxCol; c++) {
    const sub = normalize(subRow[c]);
    if (!sub || sub.includes("dif")) continue;
    dataCols.push(c);
  }
  if (dataCols.length === 0) {
    throw new UssdParseError("Não encontrei colunas de dados (Semana/Quinzena) válidas nesta folha.");
  }

  // Localizar a secção "Contactos (Contas vs Moza Já)" para não confundir
  // com a secção seguinte "Contactos de mail", que repete os mesmos rótulos.
  let sectionStart = -1;
  for (let r = subRowIdx + 1; r < rows.length; r++) {
    const label = normCollapse(rows[r]?.[0]);
    if (label.includes("contactos") && label.includes("moza") && label.includes("ja")) {
      sectionStart = r;
      break;
    }
  }
  if (sectionStart === -1) {
    throw new UssdParseError(
      "Não encontrei a secção 'Contactos (Contas vs Moza Já)' nesta folha do Plano de Actividades."
    );
  }
  const sectionEnd = sectionStart + 10; // janela suficiente até à próxima secção

  const metrics: UssdPlanoMetric[] = PLANO_ROW_TARGETS.map((target) => {
    let rowIdx = -1;
    for (let r = sectionStart + 1; r < Math.min(sectionEnd, rows.length); r++) {
      if (normCollapse(rows[r]?.[0]) === target.match) {
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

  // Alvo = coluna a seguir à última preenchida da série "Serviços da semana".
  const servicosSemana = metrics.find((m) => m.key === "servicosSemana")!;
  let targetPeriod: string | null = null;
  if (servicosSemana.series.length > 0) {
    const lastLabel = servicosSemana.series[servicosSemana.series.length - 1].label;
    const lastIdx = dataCols.findIndex((c) => `${monthLabels[c]} · ${String(subRow[c]).trim()}` === lastLabel);
    if (lastIdx !== -1 && lastIdx + 1 < dataCols.length) {
      const c = dataCols[lastIdx + 1];
      targetPeriod = `${monthLabels[c]} · ${String(subRow[c]).trim()}`;
    }
  }

  return { sheetName, metrics, targetPeriod };
}

/**
 * Combina os dois ficheiros: preenche, no resultado do Plano, a 1ª semana em
 * branco de "Serviços da semana", "Contacto divergentes" e "Contacto
 * Convergentes" com os valores calculados a partir do ficheiro bruto USSD.
 */
export function mergeUssdIntoPlano(plano: UssdPlanoResult, raw: UssdResult): UssdPlanoResult {
  if (!plano.targetPeriod) return plano;

  const values: Record<UssdPlanoMetric["key"], number> = {
    servicosSemana: raw.servicosSemana,
    divergentes: raw.divergentes,
    convergentes: raw.convergentes,
  };

  const metrics = plano.metrics.map((m) => {
    const newValue = values[m.key];
    const previous = m.series.length > 0 ? m.series[m.series.length - 1].value : null;
    const deltaPct = previous && previous !== 0 ? (newValue - previous) / previous : null;
    const newSeries: PeriodValue[] = [
      ...m.series,
      { label: plano.targetPeriod as string, month: "", sub: "", value: newValue },
    ];
    return { ...m, series: newSeries, current: newValue, currentPeriod: plano.targetPeriod, previous, deltaPct };
  });

  return { ...plano, metrics };
}

// DATA_ADESAO vem no formato "AA.MM.DD" (ex: "26.07.23" = 23/07/2026)
// function parseDataAdesao(v: unknown): Date | null {
//   if (v === null || v === undefined) return null;
//   const s = String(v).trim();
//   const m = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
//   if (!m) return null;
//   const [, yy, mm, dd] = m;
//   return new Date(2000 + parseInt(yy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
// }

const MONTH_ABBR: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

// function parseDataAdesao(v: unknown): Date | null {
//   if (v === null || v === undefined) return null;
//   // Formato texto "AA.MM.DD"
//   const m = String(v).trim().match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
//   if (m) {
//     const [, yy, mm, dd] = m;
//     return new Date(2000 + parseInt(yy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
//   }
//   // Formato número de série do Excel (célula formatada como data)
//   if (typeof v === "number") {
//     const d = XLSX.SSF.parse_date_code(v);
//     if (d) return new Date(d.y, d.m - 1, d.d);
//   }
//   return null;
// }

// Números vêm em formatos diferentes (com/sem espaço) — normaliza antes de comparar.

function parseDataAdesao(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
 
  // Formato texto "AA.MM.DD" (pontos)
  const m1 = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (m1) {
    const [, yy, mm, dd] = m1;
    return new Date(2000 + parseInt(yy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  }
 
  // Formato texto "DD-MMM-AA" (ex: "17-APR-23", "31-JUL-26")
  const m2 = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (m2) {
    const [, dd, mon, yy] = m2;
    const monthIdx = MONTH_ABBR[mon.toUpperCase()];
    if (monthIdx !== undefined) {
      return new Date(2000 + parseInt(yy, 10), monthIdx, parseInt(dd, 10));
    }
  }
 
// Formato texto "MM/DD/AA" ou "MM/DD/AAAA" (barras)
const m3 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

if (m3) {
    const [, mm, dd, yyRaw] = m3;

    const year =
        yyRaw.length === 2
            ? 2000 + parseInt(yyRaw, 10)
            : parseInt(yyRaw, 10);

    return new Date(
        year,
        parseInt(mm, 10) - 1,
        parseInt(dd, 10)
    );
}

  // Formato número de série do Excel (célula formatada como data)
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  return null;
}


function normPhone(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v).trim().replace(/[\s-]/g, "").split(".")[0];
}

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Lê o ficheiro "Export Worksheet" do USSD Moza Já e aplica:
 *  1. Remove COD_SIT = "E" (contas encerradas)
 *  2. Remove duplicados por COD_CNT (cliente)
 *  -> dá o total de serviços (contactos)
 *  3. Dentro desse total, filtra DATA_ADESAO nos últimos 7 dias a contar da
 *     data mais recente do PRÓPRIO ficheiro (não a data de hoje)
 *  -> dá os serviços da semana
 *  4. Dentro dos serviços da semana, compara CONTACTO_USSD com
 *     TELEFONE_BANKA_1/2/3 -> convergentes (bate) / divergentes (não bate)
 */
export function parseUssdWorkbook(buffer: ArrayBuffer): UssdResult {
  const wb = XLSX.read(buffer, { type: "array" });
  let sheetName = wb.SheetNames.find((n) => normalize(n).includes("export"));
  if (!sheetName) sheetName = wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null });
  if (rows.length === 0) {
    throw new UssdParseError("O ficheiro não tem linhas de dados na folha esperada.");
  }

  const cols = Object.keys(rows[0]);
  const findCol = (needle: string) => cols.find((c) => normalize(c) === normalize(needle));
  const colSit = findCol("COD_SIT");
  const colCnt = findCol("COD_CNT");
  const colData = findCol("DATA_ADESAO");
  const colUssd = findCol("CONTACTO_USSD");
  const colB1 = findCol("TELEFONE_BANKA_1");
  const colB2 = findCol("TELEFONE_BANKA_2");
  const colB3 = findCol("TELEFONE_BANKA_3");
  const colEnt = findCol("COD_ENT");

  if (!colSit || !colCnt || !colData || !colUssd || !colB1 || !colB2 || !colB3) {
    throw new UssdParseError(
      "Não encontrei todas as colunas esperadas (COD_SIT, COD_CNT, DATA_ADESAO, CONTACTO_USSD, TELEFONE_BANKA_1/2/3)."
    );
  }

  const totalBruto = rows.length;

  const step1 = rows.filter((r) => normalize(r[colSit]) !== "e");
  const semEncerradas = step1.length;

  const seen = new Set<unknown>();
  const step2: Record<string, unknown>[] = [];
  for (const r of step1) {
    const key = r[colCnt];
    if (seen.has(key)) continue;
    seen.add(key);
    step2.push(r);
  }
  const totalServicos = step2.length;

  // Data de referência = a mais recente encontrada no próprio ficheiro
  let refDate: Date | null = null;
  for (const r of step2) {
    const d = parseDataAdesao(r[colData]);
    if (d && (!refDate || d.getTime() > refDate.getTime())) refDate = d;
  }
  if (!refDate) throw new UssdParseError("Não consegui interpretar nenhuma DATA_ADESAO válida no ficheiro.");


  const createdDate = wb.Props?.CreatedDate ? new Date(wb.Props.CreatedDate) : null;
  const sameDay =
    createdDate !== null &&
    refDate.getFullYear() === createdDate.getFullYear() &&
    refDate.getMonth() === createdDate.getMonth() &&
    refDate.getDate() === createdDate.getDate();
  if (sameDay) refDate.setDate(refDate.getDate() - 1);

  const inicioSemana = new Date(refDate);
  inicioSemana.setDate(inicioSemana.getDate() - 7);

  const semana = step2.filter((r) => {
    const d = parseDataAdesao(r[colData]);
    return d && d.getTime() >= inicioSemana.getTime() && d.getTime() <= refDate!.getTime();
  });

  let convergentes = 0;
  let divergentes = 0;
  const divergentesEntidades: string[] = [];
  for (const r of semana) {
    const ussd = normPhone(r[colUssd]);
    const b1 = normPhone(r[colB1]);
    const b2 = normPhone(r[colB2]);
    const b3 = normPhone(r[colB3]);
    const bate = ussd !== null && (ussd === b1 || ussd === b2 || ussd === b3);
    if (bate) convergentes++;
    else {
      divergentes++;
      if (colEnt) divergentesEntidades.push(String(r[colEnt] ?? "—"));
    }
  }

  let convergentesTotal = 0;
  let divergentesTotal = 0;
const divergentesEntidadesTotal: string[] = [];
for (const r of step2) {
  const ussd = normPhone(r[colUssd]);
  const b1 = normPhone(r[colB1]);
  const b2 = normPhone(r[colB2]);
  const b3 = normPhone(r[colB3]);
  const bate = ussd !== null && (ussd === b1 || ussd === b2 || ussd === b3);
  if (bate) convergentesTotal++;
  else {
    divergentesTotal++;
    if (colEnt) divergentesEntidadesTotal.push(String(r[colEnt] ?? "—"));
  }
}

  const dailyMap = new Map<string, number>();
  for (const r of semana) {
    const d = parseDataAdesao(r[colData]);
    if (!d) continue;
    const key = fmtDate(d);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const serieDiaria: UssdDaily[] = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  return {
    refDate,
    inicioSemana,
    totalBruto,
    semEncerradas,
    totalServicos,
    servicosSemana: semana.length,
    convergentes,
    divergentes,
    divergentesEntidades,
    serieDiaria,


  convergentesTotal,
  divergentesTotal,
  divergentesEntidadesTotal,
  };
}