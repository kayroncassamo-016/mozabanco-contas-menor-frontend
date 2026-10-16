
// import * as XLSX from "xlsx";
// import type { PeriodValue } from "./parsePlano";

// export class EactParseError extends Error {}

// function normalize(v: unknown): string {
//   if (v === null || v === undefined) return "";
//   return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
// }

// export interface EactRawResult {
//   totalBruto: number;
//   encerradas: number;
//   entidadesSoltas: number;
  
//   totalEntidades: number;
//   fiabilizadas: number;
//   porFiabilizar: number;
// }

// /**
//  * O EACT pode ter centenas de milhares de linhas — grande demais para o
//  * limite de string do JavaScript no browser. Por isso o ficheiro é enviado
//  * para /api/eact, que o lê em streaming (exceljs) no PRÓPRIO servidor da
//  * aplicação (não um serviço externo — mesma fronteira de segurança).
//  *
//  * Regras aplicadas lá:
//  *  1. Encerradas: DSC_SIT = "Encerrada", sem duplicados por COD_CONTRATO
//  *  2. Entidades soltas: ENTIDADE_SOLTA = "SIM", sem duplicados por ENTIDADE_ASSOCIADA
//  */
// export async function parseEactRawWorkbook(file: File): Promise<EactRawResult> {
//   const form = new FormData();
//   form.append("file", file);
//   const res = await fetch("/api/eact", { method: "POST", body: form });
//   if (!res.ok) {
//     const body = await res.json().catch(() => ({}));
//     throw new EactParseError(body.error ?? "Não consegui processar o ficheiro EACT no servidor.");
//   }
//   return res.json();
// }

// export interface EactMetric {
//   key: "encerradas" | "entidadesSoltas";
//   label: string;
//   series: PeriodValue[];
//   current: number | null;
//   currentPeriod: string | null;
//   previous: number | null;
//   deltaPct: number | null;
// }

// export interface EactPlanoResult {
//   sheetName: string;
//   metrics: EactMetric[];
//   targetPeriod: string | null;
// }

// const MONTH_NAMES_PT = [
//   "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
//   "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
// ];
// function formatMonthCell(raw: unknown): string {
//   if (typeof raw === "number") {
//     const d = XLSX.SSF.parse_date_code(raw);
//     if (d) return `${MONTH_NAMES_PT[d.m - 1]} ${d.y}`;
//   }
//   if (raw instanceof Date) return `${MONTH_NAMES_PT[raw.getUTCMonth()]} ${raw.getUTCFullYear()}`;
//   return String(raw).trim();
// }

// const ROW_TARGETS: { key: EactMetric["key"]; label: string; match: string }[] = [
//   { key: "encerradas", label: "Encerradas", match: normalize("Encerradas") },
//   { key: "entidadesSoltas", label: "Entidades Soltas", match: normalize("Entidades Soltas") },
// ];

// export function parseEactFromPlano(buffer: ArrayBuffer): EactPlanoResult {
//   const wb = XLSX.read(buffer, { type: "array" });
//   let sheetName = wb.SheetNames.find((n) => normalize(n).includes("mapa"));
//   if (!sheetName) sheetName = wb.SheetNames[0];

//   const ws = wb.Sheets[sheetName];
//   const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

//   let subRowIdx = -1;
//   for (let i = 0; i < Math.min(12, rows.length); i++) {
//     const rowNorm = (rows[i] || []).map(normalize);
//     if (rowNorm.some((c) => c.includes("semana") || c.includes("quinzena"))) {
//       subRowIdx = i;
//       break;
//     }
//   }
//   if (subRowIdx === -1) throw new EactParseError("Não consegui identificar a estrutura de semanas/quinzenas nesta folha.");

//   const monthRowIdx = Math.max(0, subRowIdx - 1);
//   const monthRow = rows[monthRowIdx] || [];
//   const subRow = rows[subRowIdx] || [];
//   const maxCol = rows.reduce((m, r) => Math.max(m, (r || []).length), 0);

//   const monthLabels: string[] = [];
//   let lastMonth = "";
//   for (let c = 0; c < maxCol; c++) {
//     const raw = monthRow[c];
//     if (raw !== null && raw !== undefined && String(raw).trim() !== "") lastMonth = formatMonthCell(raw);
//     monthLabels[c] = lastMonth;
//   }

//   const dataCols: number[] = [];
//   for (let c = 1; c < maxCol; c++) {
//     const sub = normalize(subRow[c]);
//     if (!sub || sub.includes("dif")) continue;
//     dataCols.push(c);
//   }
//   if (dataCols.length === 0) throw new EactParseError("Não encontrei colunas de dados (Semana/Quinzena) válidas nesta folha.");

//   const metrics: EactMetric[] = ROW_TARGETS.map((target) => {
//     let rowIdx = -1;
//     for (let r = subRowIdx + 1; r < rows.length; r++) {
//       if (normalize(rows[r]?.[0]) === target.match) {
//         rowIdx = r;
//         break;
//       }
//     }
//     if (rowIdx === -1) {
//       return { key: target.key, label: target.label, series: [], current: null, currentPeriod: null, previous: null, deltaPct: null };
//     }
//     const row = rows[rowIdx];
//     const series: PeriodValue[] = [];
//     for (const c of dataCols) {
//       const val = row[c];
//       if (typeof val === "number" && Number.isFinite(val)) {
//         series.push({
//           label: `${monthLabels[c]} · ${String(subRow[c]).trim()}`,
//           month: monthLabels[c],
//           sub: String(subRow[c]).trim(),
//           value: val,
//         });
//       }
//     }
//     const current = series.length > 0 ? series[series.length - 1] : null;
//     const previous = series.length > 1 ? series[series.length - 2] : null;
//     const deltaPct =
//       current && previous && previous.value !== 0 ? (current.value - previous.value) / previous.value : null;
//     return {
//       key: target.key,
//       label: target.label,
//       series,
//       current: current?.value ?? null,
//       currentPeriod: current?.label ?? null,
//       previous: previous?.value ?? null,
//       deltaPct,
//     };
//   });

//   const ref = metrics.find((m) => m.key === "encerradas")!;
//   let targetPeriod: string | null = null;
//   if (ref.series.length > 0) {
//     const lastLabel = ref.series[ref.series.length - 1].label;
//     const lastIdx = dataCols.findIndex((c) => `${monthLabels[c]} · ${String(subRow[c]).trim()}` === lastLabel);
//     if (lastIdx !== -1 && lastIdx + 1 < dataCols.length) {
//       const c = dataCols[lastIdx + 1];
//       targetPeriod = `${monthLabels[c]} · ${String(subRow[c]).trim()}`;
//     }
//   }

//   return { sheetName, metrics, targetPeriod };
// }

// export function mergeEactIntoPlano(plano: EactPlanoResult, raw: EactRawResult): EactPlanoResult {
//   if (!plano.targetPeriod) return plano;

//   const values: Record<EactMetric["key"], number> = {
//     encerradas: raw.encerradas,
//     entidadesSoltas: raw.entidadesSoltas,
//   };

//   const metrics = plano.metrics.map((m) => {
//     const newValue = values[m.key];
//     const previous = m.series.length > 0 ? m.series[m.series.length - 1].value : null;
//     const deltaPct = previous && previous !== 0 ? (newValue - previous) / previous : null;
//     const newSeries: PeriodValue[] = [
//       ...m.series,
//       { label: plano.targetPeriod as string, month: "", sub: "", value: newValue },
//     ];
//     return { ...m, series: newSeries, current: newValue, currentPeriod: plano.targetPeriod, previous, deltaPct };
//   });

//   return { ...plano, metrics };
// }

// =============================================================================================================//


// import * as XLSX from "xlsx";
// import type { PeriodValue } from "./parsePlano";

// export class EactParseError extends Error {}

// function normalize(v: unknown): string {
//   if (v === null || v === undefined) return "";
//   return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
// }

// /**
//  * Detalhe opcional devolvido pelo backend (passos 1 a 10.4).
//  * Serve para auditoria; o dashboard não depende dele.
//  */
// export interface EactDetalhe {
//   excluidasPorValor?: Record<string, number>;
//   fiabilizadasAlgumaLinha?: number;
//   [chave: string]: unknown;
// }

// /**
//  * Resultado devolvido pelo backend (main.py → process_eact).
//  *
//  * Pré-passo 1:
//  *   totalBruto, encerradas, entidadesSoltas
//  *
//  * Passos 1 a 10.4 (uma linha por entidade, sem duplicados):
//  *   totalEntidades / entidadesEact ............ total de entidades (passo 8)
//  *   fiabilizadas ............................. 10.1
//  *   porFiabilizar ............................ 9
//  *   porFiabilizarConsiderandoPrioritarias .... 10.3
//  *   entidadesEactConsiderandoPrioritarias .... 10.2
//  *   excluidas ................................ 10.4
//  *
//  * Relações que o backend já garante:
//  *   totalEntidades = fiabilizadas + porFiabilizar
//  *   porFiabilizar  = porFiabilizarConsiderandoPrioritarias + excluidas
//  *   totalEntidades = entidadesEactConsiderandoPrioritarias + excluidas
//  */
// export interface EactRawResult {
//   totalBruto: number;
//   encerradas: number;
//   entidadesSoltas: number;

//   totalEntidades: number;
//   entidadesEact: number;
//   fiabilizadas: number;
//   porFiabilizar: number;
//   porFiabilizarConsiderandoPrioritarias: number;
//   entidadesEactConsiderandoPrioritarias: number;
//   excluidas: number;

//   detalhe?: EactDetalhe;
//   verificacoes?: Record<string, boolean>;
// }

// const EACT_REQUIRED_NUMBERS: (keyof EactRawResult)[] = [
//   "totalBruto",
//   "encerradas",
//   "entidadesSoltas",
//   "totalEntidades",
//   "entidadesEact",
//   "fiabilizadas",
//   "porFiabilizar",
//   "porFiabilizarConsiderandoPrioritarias",
//   "entidadesEactConsiderandoPrioritarias",
//   "excluidas",
// ];

// /**
//  * Garante que o backend devolveu todos os indicadores como números.
//  * Se faltar algum (ex.: backend desactualizado), falha com uma
//  * mensagem clara em vez de mostrar valores em branco/NaN no dashboard.
//  */
// function assertEactRawResult(result: unknown): EactRawResult {
//   if (typeof result !== "object" || result === null) {
//     throw new EactParseError("O servidor devolveu um resultado EACT inválido.");
//   }

//   const record = result as Record<string, unknown>;
//   const missing = EACT_REQUIRED_NUMBERS.filter((key) => {
//     const value = record[key];
//     return typeof value !== "number" || !Number.isFinite(value);
//   });

//   if (missing.length > 0) {
//     throw new EactParseError(
//       `O servidor não devolveu todos os indicadores EACT (em falta: ${missing.join(", ")}). ` +
//         "Verifique se o backend está actualizado."
//     );
//   }

//   return record as unknown as EactRawResult;
// }





// export async function parseEactRawWorkbook(
//   file: File,
//   onUploadProgress?: (percentage: number) => void
// ): Promise<EactRawResult> {
//   const backendBase =
//     process.env.NEXT_PUBLIC_EACT_BACKEND_URL ?? "";

//   const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por pedaço
//   const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
//   const uploadId = crypto.randomUUID();

//   let jobId: string | null = null;

//   // 1. Envia o ficheiro em pedaços pequenos, um de cada vez.
//   //    Cada pedaço é um request rápido — nunca chega perto de
//   //    nenhum timeout de proxy, mesmo com upload lento.
//   for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
//     const start = chunkIndex * CHUNK_SIZE;
//     const end = Math.min(start + CHUNK_SIZE, file.size);
//     const chunk = file.slice(start, end);

//     const form = new FormData();
//     form.append("file", chunk, file.name);
//     form.append("uploadId", uploadId);
//     form.append("chunkIndex", String(chunkIndex));
//     form.append("totalChunks", String(totalChunks));

//     const res = await fetch(`${backendBase}/api/eact/upload-chunk`, {
//       method: "POST",
//       body: form,
//     });

//     if (!res.ok) {
//       const body = await res.json().catch(() => ({}));
//       throw new EactParseError(
//         body.error ??
//           body.detail ??
//           `Falha ao enviar o pedaço ${chunkIndex + 1}/${totalChunks} do ficheiro EACT.`
//       );
//     }

//     const data = await res.json();

//     onUploadProgress?.(Math.round(((chunkIndex + 1) / totalChunks) * 100));

//     if (data.done) {
//       jobId = data.job_id;
//     }
//   }

//   if (!jobId) {
//     throw new EactParseError(
//       "O upload terminou mas o servidor não devolveu um identificador de processamento."
//     );
//   }

//   // 2. Faz polling ao estado do job até terminar.
//   const POLL_INTERVAL_MS = 3000;
//   // O processamento no servidor demora cerca de 8 minutos num ficheiro
//   // grande (passos 1 a 10.4), por isso o limite sobe para ~20 minutos.
//   const MAX_ATTEMPTS = 400;

//   for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
//     await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

//     const statusRes = await fetch(`${backendBase}/api/eact/status/${jobId}`, {
//       cache: "no-store",
//     });

//     if (!statusRes.ok) {
//       const body = await statusRes.json().catch(() => ({}));
//       throw new EactParseError(
//         body.error ??
//           body.detail ??
//           "Não consegui verificar o estado do processamento."
//       );
//     }

//     const status = await statusRes.json();

//     if (status.status === "done") {
//       return assertEactRawResult(status.result);
//     }

//     if (status.status === "error") {
//       throw new EactParseError(
//         status.error ?? "Erro ao processar o ficheiro EACT no servidor."
//       );
//     }
//   }

//   throw new EactParseError(
//     "O processamento demorou demasiado tempo. Tente novamente."
//   );
// }




// export interface EactMetric {
//   key: "encerradas" | "entidadesSoltas";
//   label: string;
//   series: PeriodValue[];
//   current: number | null;
//   currentPeriod: string | null;
//   previous: number | null;
//   deltaPct: number | null;
// }

// export interface EactPlanoResult {
//   sheetName: string;
//   metrics: EactMetric[];
//   targetPeriod: string | null;
// }

// const MONTH_NAMES_PT = [
//   "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
//   "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
// ];
// function formatMonthCell(raw: unknown): string {
//   if (typeof raw === "number") {
//     const d = XLSX.SSF.parse_date_code(raw);
//     if (d) return `${MONTH_NAMES_PT[d.m - 1]} ${d.y}`;
//   }
//   if (raw instanceof Date) return `${MONTH_NAMES_PT[raw.getUTCMonth()]} ${raw.getUTCFullYear()}`;
//   return String(raw).trim();
// }

// const ROW_TARGETS: { key: EactMetric["key"]; label: string; match: string }[] = [
//   { key: "encerradas", label: "Encerradas", match: normalize("Encerradas") },
//   { key: "entidadesSoltas", label: "Entidades Soltas", match: normalize("Entidades Soltas") },
// ];

// export function parseEactFromPlano(buffer: ArrayBuffer): EactPlanoResult {
//   const wb = XLSX.read(buffer, { type: "array" });
//   let sheetName = wb.SheetNames.find((n) => normalize(n).includes("mapa"));
//   if (!sheetName) sheetName = wb.SheetNames[0];

//   const ws = wb.Sheets[sheetName];
//   const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

//   let subRowIdx = -1;
//   for (let i = 0; i < Math.min(12, rows.length); i++) {
//     const rowNorm = (rows[i] || []).map(normalize);
//     if (rowNorm.some((c) => c.includes("semana") || c.includes("quinzena"))) {
//       subRowIdx = i;
//       break;
//     }
//   }
//   if (subRowIdx === -1) throw new EactParseError("Não consegui identificar a estrutura de semanas/quinzenas nesta folha.");

//   const monthRowIdx = Math.max(0, subRowIdx - 1);
//   const monthRow = rows[monthRowIdx] || [];
//   const subRow = rows[subRowIdx] || [];
//   const maxCol = rows.reduce((m, r) => Math.max(m, (r || []).length), 0);

//   const monthLabels: string[] = [];
//   let lastMonth = "";
//   for (let c = 0; c < maxCol; c++) {
//     const raw = monthRow[c];
//     if (raw !== null && raw !== undefined && String(raw).trim() !== "") lastMonth = formatMonthCell(raw);
//     monthLabels[c] = lastMonth;
//   }

//   const dataCols: number[] = [];
//   for (let c = 1; c < maxCol; c++) {
//     const sub = normalize(subRow[c]);
//     if (!sub || sub.includes("dif")) continue;
//     dataCols.push(c);
//   }
//   if (dataCols.length === 0) throw new EactParseError("Não encontrei colunas de dados (Semana/Quinzena) válidas nesta folha.");

//   const metrics: EactMetric[] = ROW_TARGETS.map((target) => {
//     let rowIdx = -1;
//     for (let r = subRowIdx + 1; r < rows.length; r++) {
//       if (normalize(rows[r]?.[0]) === target.match) {
//         rowIdx = r;
//         break;
//       }
//     }
//     if (rowIdx === -1) {
//       return { key: target.key, label: target.label, series: [], current: null, currentPeriod: null, previous: null, deltaPct: null };
//     }
//     const row = rows[rowIdx];
//     const series: PeriodValue[] = [];
//     for (const c of dataCols) {
//       const val = row[c];
//       if (typeof val === "number" && Number.isFinite(val)) {
//         series.push({
//           label: `${monthLabels[c]} · ${String(subRow[c]).trim()}`,
//           month: monthLabels[c],
//           sub: String(subRow[c]).trim(),
//           value: val,
//         });
//       }
//     }
//     const current = series.length > 0 ? series[series.length - 1] : null;
//     const previous = series.length > 1 ? series[series.length - 2] : null;
//     const deltaPct =
//       current && previous && previous.value !== 0 ? (current.value - previous.value) / previous.value : null;
//     return {
//       key: target.key,
//       label: target.label,
//       series,
//       current: current?.value ?? null,
//       currentPeriod: current?.label ?? null,
//       previous: previous?.value ?? null,
//       deltaPct,
//     };
//   });

//   const ref = metrics.find((m) => m.key === "encerradas")!;
//   let targetPeriod: string | null = null;
//   if (ref.series.length > 0) {
//     const lastLabel = ref.series[ref.series.length - 1].label;
//     const lastIdx = dataCols.findIndex((c) => `${monthLabels[c]} · ${String(subRow[c]).trim()}` === lastLabel);
//     if (lastIdx !== -1 && lastIdx + 1 < dataCols.length) {
//       const c = dataCols[lastIdx + 1];
//       targetPeriod = `${monthLabels[c]} · ${String(subRow[c]).trim()}`;
//     }
//   }

//   return { sheetName, metrics, targetPeriod };
// }

// export function mergeEactIntoPlano(plano: EactPlanoResult, raw: EactRawResult): EactPlanoResult {
//   if (!plano.targetPeriod) return plano;

//   const values: Record<EactMetric["key"], number> = {
//     encerradas: raw.encerradas,
//     entidadesSoltas: raw.entidadesSoltas,
//   };

//   const metrics = plano.metrics.map((m) => {
//     const newValue = values[m.key];
//     const previous = m.series.length > 0 ? m.series[m.series.length - 1].value : null;
//     const deltaPct = previous && previous !== 0 ? (newValue - previous) / previous : null;
//     const newSeries: PeriodValue[] = [
//       ...m.series,
//       { label: plano.targetPeriod as string, month: "", sub: "", value: newValue },
//     ];
//     return { ...m, series: newSeries, current: newValue, currentPeriod: plano.targetPeriod, previous, deltaPct };
//   });

//   return { ...plano, metrics };
// }

import * as XLSX from "xlsx";
import type { PeriodValue } from "./parsePlano";

export class EactParseError extends Error {}

function normalize(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Detalhe opcional devolvido pelo backend (passos 1 a 10.4).
 * Serve para auditoria; o dashboard não depende dele.
 */
export interface EactDetalhe {
  excluidasPorValor?: Record<string, number>;
  fiabilizadasAlgumaLinha?: number;
  semNuitOutros?: number;
  [chave: string]: unknown;
}

/**
 * Uma entidade sem NUIT (passo 11): linha que ficou depois da tripla
 * remoção de duplicados (passos 6 a 8), com OBS diferente de "BOM".
 */
export interface EactEntidadeSemNuit {
  entidade: string | number;
  nome: string | number;
  nuit: string | number;
  obs: string | number;
  categoria: string;
  segmento: string | number;
  titularidade: string | number;
  conta: string | number;
  fiabilizada: string;
  exclusaoPorCliente: string;
}

/**
 * Resultado devolvido pelo backend (main.py → process_eact).
 *
 * Pré-passo 1:
 *   totalBruto, encerradas, entidadesSoltas
 *
 * Passos 1 a 10.4 (uma linha por entidade, sem duplicados):
 *   totalEntidades / entidadesEact ............ total de entidades (passo 8)
 *   fiabilizadas ............................. 10.1
 *   porFiabilizar ............................ 9
 *   porFiabilizarConsiderandoPrioritarias .... 10.3
 *   entidadesEactConsiderandoPrioritarias .... 10.2
 *   excluidas ................................ 10.4
 *
 * Passo 11 (sobre a folha do passo 8):
 *   entidadesSemNuit ......................... 11.1 OBS diferente de BOM
 *   semNuitNumeroIncorrectoDigitos ........... 11.2
 *   semNuitNaoPreenchido ..................... 11.3 (sem Conta Interna)
 *   contasTecnicasSemNuit .................... 11.4 (Conta Interna)
 *   entidadesSemNuitLista .................... todas as entidades sem NUIT
 *
 * Relações que o backend já garante:
 *   totalEntidades = fiabilizadas + porFiabilizar
 *   porFiabilizar  = porFiabilizarConsiderandoPrioritarias + excluidas
 *   totalEntidades = entidadesEactConsiderandoPrioritarias + excluidas
 *   entidadesSemNuit = semNuitNumeroIncorrectoDigitos
 *                    + semNuitNaoPreenchido + contasTecnicasSemNuit
 *                    (+ detalhe.semNuitOutros, normalmente 0)
 */
export interface EactRawResult {
  totalBruto: number;
  encerradas: number;
  entidadesSoltas: number;

  totalEntidades: number;
  entidadesEact: number;
  fiabilizadas: number;
  porFiabilizar: number;
  porFiabilizarConsiderandoPrioritarias: number;
  entidadesEactConsiderandoPrioritarias: number;
  excluidas: number;

  entidadesSemNuit: number;
  semNuitNumeroIncorrectoDigitos: number;
  semNuitNaoPreenchido: number;
  contasTecnicasSemNuit: number;
  entidadesSemNuitLista: EactEntidadeSemNuit[];

  detalhe?: EactDetalhe;
  verificacoes?: Record<string, boolean>;
}

const EACT_REQUIRED_NUMBERS: (keyof EactRawResult)[] = [
  "totalBruto",
  "encerradas",
  "entidadesSoltas",
  "totalEntidades",
  "entidadesEact",
  "fiabilizadas",
  "porFiabilizar",
  "porFiabilizarConsiderandoPrioritarias",
  "entidadesEactConsiderandoPrioritarias",
  "excluidas",
  "entidadesSemNuit",
  "semNuitNumeroIncorrectoDigitos",
  "semNuitNaoPreenchido",
  "contasTecnicasSemNuit",
];

/**
 * Garante que o backend devolveu todos os indicadores como números.
 * Se faltar algum (ex.: backend desactualizado), falha com uma
 * mensagem clara em vez de mostrar valores em branco/NaN no dashboard.
 */
function assertEactRawResult(result: unknown): EactRawResult {
  if (typeof result !== "object" || result === null) {
    throw new EactParseError("O servidor devolveu um resultado EACT inválido.");
  }

  const record = result as Record<string, unknown>;
  const missing = EACT_REQUIRED_NUMBERS.filter((key) => {
    const value = record[key];
    return typeof value !== "number" || !Number.isFinite(value);
  });

  if (missing.length > 0) {
    throw new EactParseError(
      `O servidor não devolveu todos os indicadores EACT (em falta: ${missing.join(", ")}). ` +
        "Verifique se o backend está actualizado."
    );
  }

  if (!Array.isArray(record.entidadesSemNuitLista)) {
    throw new EactParseError(
      "O servidor não devolveu a lista de entidades sem NUIT (em falta: entidadesSemNuitLista). " +
        "Verifique se o backend está actualizado."
    );
  }

  return record as unknown as EactRawResult;
}

/**
 * Constrói o Excel das entidades sem NUIT (passo 11):
 *  - folha "Entidades sem NUIT": todas as entidades, uma por linha;
 *  - folha "Resumo": os totais do passo 11.
 * Separado do download para poder ser testado sem browser.
 */
export function buildEntidadesSemNuitWorkbook(raw: EactRawResult): XLSX.WorkBook {
  const linhas = raw.entidadesSemNuitLista.map((e) => ({
    "Entidade Associada": e.entidade,
    "Nome": e.nome,
    "NUIT": e.nuit === "" ? "" : String(e.nuit),
    "OBS": e.obs,
    "Categoria": e.categoria,
    "DSC_SEG": e.segmento,
    "Titularidade": e.titularidade,
    "Conta": e.conta,
    "Fiabilizada": e.fiabilizada,
    "Exclusão por Cliente": e.exclusaoPorCliente,
  }));

  const cabecalho = [
    "Entidade Associada", "Nome", "NUIT", "OBS", "Categoria",
    "DSC_SEG", "Titularidade", "Conta", "Fiabilizada", "Exclusão por Cliente",
  ];

  const wsEntidades = XLSX.utils.json_to_sheet(linhas, { header: cabecalho });
  wsEntidades["!cols"] = [
    { wch: 20 }, { wch: 34 }, { wch: 14 }, { wch: 36 }, { wch: 36 },
    { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 20 },
  ];

  const resumo: (string | number)[][] = [
    ["Indicador", "Total"],
    ["Entidades sem NUIT (OBS diferente de BOM)", raw.entidadesSemNuit],
    ["Com número incorrecto de dígitos", raw.semNuitNumeroIncorrectoDigitos],
    ["NUIT não preenchido (sem Conta Interna)", raw.semNuitNaoPreenchido],
    ["Contas técnicas sem NUIT (Conta Interna)", raw.contasTecnicasSemNuit],
    ["Total de Entidades EACT", raw.totalEntidades],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo["!cols"] = [{ wch: 46 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsEntidades, "Entidades sem NUIT");
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
  return wb;
}

/** Descarrega o Excel das entidades sem NUIT no browser. */
export function downloadEntidadesSemNuit(raw: EactRawResult): void {
  const wb = buildEntidadesSemNuitWorkbook(raw);
  const hoje = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `entidades-sem-nuit-${hoje}.xlsx`, { compression: true });
}





export async function parseEactRawWorkbook(
  file: File,
  onUploadProgress?: (percentage: number) => void
): Promise<EactRawResult> {
  const backendBase =
    process.env.NEXT_PUBLIC_EACT_BACKEND_URL ?? "";

  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por pedaço
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = crypto.randomUUID();

  let jobId: string | null = null;

  // 1. Envia o ficheiro em pedaços pequenos, um de cada vez.
  //    Cada pedaço é um request rápido — nunca chega perto de
  //    nenhum timeout de proxy, mesmo com upload lento.
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const form = new FormData();
    form.append("file", chunk, file.name);
    form.append("uploadId", uploadId);
    form.append("chunkIndex", String(chunkIndex));
    form.append("totalChunks", String(totalChunks));

    const res = await fetch(`${backendBase}/api/eact/upload-chunk`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new EactParseError(
        body.error ??
          body.detail ??
          `Falha ao enviar o pedaço ${chunkIndex + 1}/${totalChunks} do ficheiro EACT.`
      );
    }

    const data = await res.json();

    onUploadProgress?.(Math.round(((chunkIndex + 1) / totalChunks) * 100));

    if (data.done) {
      jobId = data.job_id;
    }
  }

  if (!jobId) {
    throw new EactParseError(
      "O upload terminou mas o servidor não devolveu um identificador de processamento."
    );
  }

  // 2. Faz polling ao estado do job até terminar.
  const POLL_INTERVAL_MS = 3000;
  // O processamento no servidor demora cerca de 8 minutos num ficheiro
  // grande (passos 1 a 10.4), por isso o limite sobe para ~20 minutos.
  const MAX_ATTEMPTS = 400;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const statusRes = await fetch(`${backendBase}/api/eact/status/${jobId}`, {
      cache: "no-store",
    });

    if (!statusRes.ok) {
      const body = await statusRes.json().catch(() => ({}));
      throw new EactParseError(
        body.error ??
          body.detail ??
          "Não consegui verificar o estado do processamento."
      );
    }

    const status = await statusRes.json();

    if (status.status === "done") {
      return assertEactRawResult(status.result);
    }

    if (status.status === "error") {
      throw new EactParseError(
        status.error ?? "Erro ao processar o ficheiro EACT no servidor."
      );
    }
  }

  throw new EactParseError(
    "O processamento demorou demasiado tempo. Tente novamente."
  );
}




export interface EactMetric {
  key: "encerradas" | "entidadesSoltas";
  label: string;
  series: PeriodValue[];
  current: number | null;
  currentPeriod: string | null;
  previous: number | null;
  deltaPct: number | null;
}

export interface EactPlanoResult {
  sheetName: string;
  metrics: EactMetric[];
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

const ROW_TARGETS: { key: EactMetric["key"]; label: string; match: string }[] = [
  { key: "encerradas", label: "Encerradas", match: normalize("Encerradas") },
  { key: "entidadesSoltas", label: "Entidades Soltas", match: normalize("Entidades Soltas") },
];

export function parseEactFromPlano(buffer: ArrayBuffer): EactPlanoResult {
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
  if (subRowIdx === -1) throw new EactParseError("Não consegui identificar a estrutura de semanas/quinzenas nesta folha.");

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
  if (dataCols.length === 0) throw new EactParseError("Não encontrei colunas de dados (Semana/Quinzena) válidas nesta folha.");

  const metrics: EactMetric[] = ROW_TARGETS.map((target) => {
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

  const ref = metrics.find((m) => m.key === "encerradas")!;
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

export function mergeEactIntoPlano(plano: EactPlanoResult, raw: EactRawResult): EactPlanoResult {
  if (!plano.targetPeriod) return plano;

  const values: Record<EactMetric["key"], number> = {
    encerradas: raw.encerradas,
    entidadesSoltas: raw.entidadesSoltas,
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