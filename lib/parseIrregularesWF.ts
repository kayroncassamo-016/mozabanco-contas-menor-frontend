
import * as XLSX from "xlsx";
import type { PeriodValue } from "./parsePlano";

export class IrregularesParseError extends Error {}

function normalize(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function normCollapse(v: unknown): string {
  return normalize(v).replace(/\s+/g, " ").trim();
}
function normVal(v: unknown): string {
  return String(v ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

// DATA_DESBLOQUEIO vem no formato "AA.MM.DD"
function parseDataDesbloqueio(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  // Formato texto "AA.MM.DD" (usado nalguns exports)
  const m = String(v).trim().match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (m) {
    const [, yy, mm, dd] = m;
    return new Date(2000 + parseInt(yy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  }
  // Formato número de série do Excel (célula formatada como data) — usar
  // SSF.parse_date_code em vez de new Date(), para não sofrer o mesmo bug
  // de fuso horário já corrigido noutros módulos.
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  return null;
}

export interface IrregularesRawResult {
  refDate: Date;
  inicioJanela: Date;
  bloqueadasAntigo: number;
  anuladasNovo: number;
  bloqueadasNovo: number;
  condicionalismoNovo: number;
  totalAntigo: number;
  totalNovo: number;
  totalGeral: number;
}

/**
 * Lê o ficheiro bruto "CONTAS_IRREGULARES_WF" e aplica, por esta ordem:
 *  1. Remove COD_SIT = "E" (encerradas)
 *  2. Remove DSC_ACTIVIDADE_WF: Confirmar desbloqueio manual / Digitalização
 *     de assinaturas / Digitalização de documentos em falta
 *  3. Mantém só DSC_TIPO_TITULARIDADE = "Titular 01"
 *  4. Remove duplicados por COD_CONTRATO
 *  5. Separa por ORIGEM_WF_NOVO_OU_ANTIGO
 *  6. Antigo WF: só "Bloqueadas" (DSC_ESTADO_WF = "Em Curso") — o Antigo WF
 *     foi descontinuado, por isso Anuladas/Desbloqueadas não se calculam.
 *     Novo WF: "Anuladas Bloqueadas" (Anulado), "Bloqueadas" (Em Curso), e
 *     "Desbloqueadas com condicionalismos" (janela de 3 meses a contar do
 *     penúltimo dia de DATA_DESBLOQUEIO no ficheiro, DSC_ACTIVIDADE_WF =
 *     "Digitalização de Documentos", USER_DESBLOQUEIO = "PAMUSR01").
 */
export function parseIrregularesRawWorkbook(buffer: ArrayBuffer): IrregularesRawResult {
  const wb = XLSX.read(buffer, { type: "array" });
  let sheetName = wb.SheetNames.find((n) => normalize(n).includes("export"));
  if (!sheetName) sheetName = wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null });
  if (rows.length === 0) throw new IrregularesParseError("O ficheiro não tem linhas de dados.");

  const cols = Object.keys(rows[0]);
  const col = (needle: string) => cols.find((c) => normalize(c) === normalize(needle));
  const cSit = col("COD_SIT");
  const cAct = col("DSC_ACTIVIDADE_WF");
  const cTitular = col("DSC_TIPO_TITULARIDADE");
  const cContrato = col("COD_CONTRATO");
  const cOrigem = col("ORIGEM_WF_NOVO_OU_ANTIGO");
  const cEstado = col("DSC_ESTADO_WF");
  const cDataDesb = col("DATA_DESBLOQUEIO");
  if (!cSit || !cAct || !cTitular || !cContrato || !cOrigem || !cEstado || !cDataDesb) {
    throw new IrregularesParseError(
      "Não encontrei todas as colunas esperadas (COD_SIT, DSC_ACTIVIDADE_WF, DSC_TIPO_TITULARIDADE, COD_CONTRATO, ORIGEM_WF_NOVO_OU_ANTIGO, DSC_ESTADO_WF, DATA_DESBLOQUEIO)."
    );
  }

  const isExcludedActivity = (v: unknown) => {
    const a = normVal(v);
    return a.includes("DESBLOQUEIO MANUAL") || a.includes("ASSINATURA") || a.includes("DOCUMENTOS EM FALTA");
  };

  // Ordem exacta pedida: 1) sem encerradas, 2) sem as 3 actividades,
  // 3) só Titular 01, 4) dedup por COD_CONTRATO (nesta ordem, não trocar).
  const step1 = rows.filter((r) => normVal(r[cSit]) !== "E");
  const step2 = step1.filter((r) => !isExcludedActivity(r[cAct]));
  const step3 = step2.filter((r) => normVal(r[cTitular]) === "TITULAR 01");

  const seen = new Set<unknown>();
  const step4: Record<string, unknown>[] = [];
  for (const r of step3) {
    const key = r[cContrato];
    if (seen.has(key)) continue;
    seen.add(key);
    step4.push(r);
  }

  const antigo = step4.filter((r) => normVal(r[cOrigem]) === "ANTIGO WORKFLOW");
  const novo = step4.filter((r) => normVal(r[cOrigem]) === "NOVO WORKFLOW");

  const totalAntigo = antigo.length;
  const totalNovo = novo.length;
  const bloqueadasAntigo = antigo.filter((r) => normVal(r[cEstado]) === "EM CURSO").length;
  const anuladasNovo = novo.filter((r) => normVal(r[cEstado]) === "ANULADO").length;

  // "Em Curso" (Novo WF) é a base de onde saem tanto as "Desbloqueadas com
  // condicionalismo" (o subconjunto dentro da janela de 3 meses) como as
  // "Bloqueadas" (tudo o resto de "Em Curso" que não caiu nessa janela).
  const emCursoNovo = novo.filter((r) => normVal(r[cEstado]) === "EM CURSO");

  // Janela: se o último dia de DATA_DESBLOQUEIO (dentro de "Em Curso") for o
  // MESMO dia em que o ficheiro Excel foi criado, esse dia ainda não terminou
  // e a informação pode estar incompleta — usa-se o penúltimo dia. Caso
  // contrário, usa-se o próprio último dia. A partir daí, recua-se 3 meses.
  let maxDate: Date | null = null;
  for (const r of emCursoNovo) {
    const d = parseDataDesbloqueio(r[cDataDesb]);
    if (d && (!maxDate || d.getTime() > maxDate.getTime())) maxDate = d;
  }

  const createdDate: Date | null = wb.Props?.CreatedDate ? new Date(wb.Props.CreatedDate) : null;

  // Se não houver nenhuma DATA_DESBLOQUEIO válida em "Em Curso" (ex: nenhum
  // desbloqueio nessa semana), não há como calcular a janela — em vez de
  // falhar, considera-se 0 "condicionalismo" e todas as contas ficam como
  // "Bloqueadas". A referência da janela cai para a data de criação do
  // ficheiro (ou hoje, em último caso), só para efeitos de exibição.
  const refDate = new Date(maxDate ?? createdDate ?? new Date());
  const createdSameDayAsMax =
    maxDate !== null &&
    createdDate !== null &&
    maxDate.getFullYear() === createdDate.getFullYear() &&
    maxDate.getMonth() === createdDate.getMonth() &&
    maxDate.getDate() === createdDate.getDate();
  if (createdSameDayAsMax) refDate.setDate(refDate.getDate() - 1);
  const inicioJanela = new Date(refDate);
  inicioJanela.setMonth(inicioJanela.getMonth() - 4);

  // Sem filtro de USER_DESBLOQUEIO — considera-se qualquer utilizador.
  const condicionalismoNovo = maxDate
    ? emCursoNovo.filter((r) => {
        const d = parseDataDesbloqueio(r[cDataDesb]);
        if (!d || d.getTime() < inicioJanela.getTime() || d.getTime() > refDate.getTime()) return false;
        if (normVal(r[cAct]) !== "DIGITALIZAÇÃO DE DOCUMENTOS") return false;
        return true;
      }).length
    : 0;

  // Bloqueadas = tudo em "Em Curso" que NÃO entrou no condicionalismo.
  const bloqueadasNovo = emCursoNovo.length - condicionalismoNovo;

  return {
    refDate, inicioJanela, bloqueadasAntigo, anuladasNovo, bloqueadasNovo, condicionalismoNovo,
    totalAntigo, totalNovo, totalGeral: totalAntigo + totalNovo,
  };
}

// ---------------------------------------------------------------------------
// Leitura do Plano de Actividades (secções "Contas Irregulares antigo WF" e
// "Contas Irregulares WF actual" — rótulos de linha repetidos entre as duas,
// por isso a busca é sempre limitada à secção certa).
// ---------------------------------------------------------------------------

export interface IrregularesMetric {
  key: "bloqueadasAntigo" | "anuladasNovo" | "bloqueadasNovo" | "condicionalismoNovo";
  label: string;
  series: PeriodValue[];
  current: number | null;
  currentPeriod: string | null;
  previous: number | null;
  deltaPct: number | null;
}

export interface IrregularesPlanoResult {
  sheetName: string;
  metrics: IrregularesMetric[];
  targetPeriod: string | null;
}

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
function formatMonthCell(raw: unknown): string {
  if (typeof raw === "number") {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) return `${MONTH_NAMES_PT[d.m - 1]} ${d.y}`;
  }
  if (raw instanceof Date) return `${MONTH_NAMES_PT[raw.getUTCMonth()]} ${raw.getUTCFullYear()}`;
  return String(raw).trim();
}

export function parseIrregularesFromPlano(buffer: ArrayBuffer): IrregularesPlanoResult {
  const wb = XLSX.read(buffer, { type: "array" });
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
  if (subRowIdx === -1) throw new IrregularesParseError("Não consegui identificar a estrutura de semanas/quinzenas nesta folha.");

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

  // Localizar as duas secções (Antigo / Actual) para escopar a busca.
  function findSection(needle: string): number {
    for (let r = subRowIdx + 1; r < rows.length; r++) {
      if (normCollapse(rows[r]?.[0]).includes(needle)) return r;
    }
    return -1;
  }
  const antigoStart = findSection("contas irregulares antigo wf");
  const novoStart = findSection("contas irregulares wf actual");
  if (antigoStart === -1 || novoStart === -1) {
    throw new IrregularesParseError(
      "Não encontrei as secções 'Contas Irregulares antigo WF' / 'Contas Irregulares WF actual' nesta folha."
    );
  }

  function findRowInSection(sectionStart: number, sectionEnd: number, label: string): number {
    for (let r = sectionStart + 1; r < Math.min(sectionEnd, rows.length); r++) {
      if (normCollapse(rows[r]?.[0]) === label) return r;
    }
    return -1;
  }

  function buildMetric(key: IrregularesMetric["key"], label: string, rowIdx: number): IrregularesMetric {
    if (rowIdx === -1) {
      return { key, label, series: [], current: null, currentPeriod: null, previous: null, deltaPct: null };
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
      key,
      label,
      series,
      current: current?.value ?? null,
      currentPeriod: current?.label ?? null,
      previous: previous?.value ?? null,
      deltaPct,
    };
  }

  const bloqueadasAntigoRow = findRowInSection(antigoStart, novoStart, "bloqueadas");
  const anuladasNovoRow = findRowInSection(novoStart, rows.length, "anuladas bloqueadas");
  const bloqueadasNovoRow = findRowInSection(novoStart, rows.length, "bloqueadas");
  const condicionalismoNovoRow = findRowInSection(novoStart, rows.length, "desbloqueadas com condicionalismos");

  const metrics: IrregularesMetric[] = [
    buildMetric("bloqueadasAntigo", "Bloqueadas (antigo WF)", bloqueadasAntigoRow),
    buildMetric("anuladasNovo", "Anuladas Bloqueadas (WF actual)", anuladasNovoRow),
    buildMetric("bloqueadasNovo", "Bloqueadas (WF actual)", bloqueadasNovoRow),
    buildMetric("condicionalismoNovo", "Desbloqueadas com condicionalismos (WF actual)", condicionalismoNovoRow),
  ];

  // Alvo = coluna a seguir à última preenchida de "Bloqueadas (WF actual)"
  // (a série mais fiável, sempre preenchida em ambas as secções).
  const ref = metrics.find((m) => m.key === "bloqueadasNovo")!;
  let targetPeriod: string | null = null;
  if (ref.series.length > 0) {
    const lastLabel = ref.series[ref.series.length - 1].label;
    const lastIdx = dataCols.findIndex((c) => `${monthLabels[c]} · ${String(subRow[c]).trim()}` === lastLabel);
    if (lastIdx !== -1 && lastIdx + 1 < dataCols.length) {
      const c = dataCols[lastIdx + 1];
      targetPeriod = `${monthLabels[c]} · ${String(subRow[c]).trim()}`;
    }
  }

  return { sheetName, metrics, targetPeriod };
}

/**
 * Combina os dois ficheiros: preenche a 1ª semana em branco de "Bloqueadas
 * (antigo)", "Anuladas" e "Bloqueadas" e "Desbloqueadas com condicionalismos"
 * (WF actual). NUNCA preenche "Anuladas"/"Desbloqueadas" do Antigo WF —
 * o Antigo WF está descontinuado, por isso essas linhas ficam sempre em branco.
 */
export function mergeIrregularesIntoPlano(
  plano: IrregularesPlanoResult,
  raw: IrregularesRawResult
): IrregularesPlanoResult {
  if (!plano.targetPeriod) return plano;

  const values: Record<IrregularesMetric["key"], number> = {
    bloqueadasAntigo: raw.bloqueadasAntigo,
    anuladasNovo: raw.anuladasNovo,
    bloqueadasNovo: raw.bloqueadasNovo,
    condicionalismoNovo: raw.condicionalismoNovo,
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
