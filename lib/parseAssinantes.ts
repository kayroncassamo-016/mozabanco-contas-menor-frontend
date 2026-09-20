// import * as XLSX from "xlsx";
// import type { PeriodValue } from "./parsePlano";

// export class AssinantesParseError extends Error {}

// export interface AssinantesMetric {
//   key: "semAssinantes" | "assinaturasPorDigitalizar";
//   label: string;
//   series: PeriodValue[];
//   current: number | null;
//   currentPeriod: string | null;
//   previous: number | null;
//   deltaPct: number | null;
// }

// export interface AssinantesPlanoResult {
//   sheetName: string;
//   metrics: AssinantesMetric[];
//   targetPeriod: string | null;
// }

// export interface AssinantesRawResult {
//   reportDate: Date;
//   totalBruto: number;
//   aposFiltroDO: number;
//   semCI: number;
//   semDuplicados: number;
//   final: number;
// }

// function normalize(v: unknown): string {
//   if (v === null || v === undefined) return "";
//   return String(v)
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "")
//     .toLowerCase()
//     .trim();
// }

// // Normaliza nomes de entidade/valores de texto: troca NBSP e quebras de linha
// // por espaço normal e colapsa espaços repetidos (resolve o problema de
// // "ENTERPRISE MB\nDESAFIOS E IDEIAS" ou "Conta\u00a0Corrente\u00a0...").
// function normName(v: unknown): string {
//   if (v === null || v === undefined) return "";
//   return String(v)
//     .replace(/\u00a0/g, " ")
//     .replace(/[\r\n]+/g, " ")
//     .replace(/\s+/g, " ")
//     .trim()
//     .toUpperCase();
// }

// const ENTIDADES_EXCLUIR = new Set([
//   "INTERBANCOS VIRTUAL",
//   "ENTERPRISE MB",
//   "DESAFIOS E IDEIAS",
// ]);

// // "Cliente sem assinantes" e "Assinaturas por digitalizar" são tratadas como
// // a mesma métrica (confirmado com o utilizador) — ambas recebem o mesmo valor.
// const ROW_TARGETS: { key: AssinantesMetric["key"]; label: string; match: string }[] = [
//   {
//     key: "semAssinantes",
//     label: "Cliente sem assinantes (inc. ex BTM)",
//     match: normalize("Cliente sem assinantes (inc. ex BTM)"),
//   },
//   {
//     key: "assinaturasPorDigitalizar",
//     label: "Assinaturas por digitalizar",
//     match: normalize("Assinaturas por digitalizar"),
//   },
// ];

// const MONTH_NAMES_PT = [
//   "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
//   "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
// ];
// function formatMonthCell(raw: unknown): string {
//   if (raw instanceof Date) return `${MONTH_NAMES_PT[raw.getMonth()]} ${raw.getFullYear()}`;
//   return String(raw).trim();
// }

// /**
//  * Lê a folha "Mapa de acompanhamento" do Plano de Actividades e devolve o
//  * histórico + a 1ª semana em branco das linhas "Cliente sem assinantes" e
//  * "Assinaturas por digitalizar".
//  */
// export function parseAssinantesFromPlano(buffer: ArrayBuffer): AssinantesPlanoResult {
//   const wb = XLSX.read(buffer, { type: "array", cellDates: true });

//   let sheetName = wb.SheetNames.find((n) => normalize(n).includes("mapa"));
//   if (!sheetName) sheetName = wb.SheetNames[0];

//   const ws = wb.Sheets[sheetName];
//   const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
//     header: 1,
//     defval: null,
//     raw: true,
//   });

//   let subRowIdx = -1;
//   for (let i = 0; i < Math.min(12, rows.length); i++) {
//     const rowNorm = (rows[i] || []).map(normalize);
//     if (rowNorm.some((c) => c.includes("semana") || c.includes("quinzena"))) {
//       subRowIdx = i;
//       break;
//     }
//   }
//   if (subRowIdx === -1) {
//     throw new AssinantesParseError("Não consegui identificar a estrutura de semanas/quinzenas nesta folha.");
//   }

//   const monthRowIdx = Math.max(0, subRowIdx - 1);
//   const monthRow = rows[monthRowIdx] || [];
//   const subRow = rows[subRowIdx] || [];
//   const maxCol = rows.reduce((m, r) => Math.max(m, (r || []).length), 0);

//   const monthLabels: string[] = [];
//   let lastMonth = "";
//   for (let c = 0; c < maxCol; c++) {
//     const raw = monthRow[c];
//     if (raw !== null && raw !== undefined && String(raw).trim() !== "") {
//       lastMonth = formatMonthCell(raw);
//     }
//     monthLabels[c] = lastMonth;
//   }

//   const dataCols: number[] = [];
//   for (let c = 1; c < maxCol; c++) {
//     const sub = normalize(subRow[c]);
//     if (!sub || sub.includes("dif")) continue;
//     dataCols.push(c);
//   }
//   if (dataCols.length === 0) {
//     throw new AssinantesParseError("Não encontrei colunas de dados (Semana/Quinzena) válidas nesta folha.");
//   }

//   const metrics: AssinantesMetric[] = ROW_TARGETS.map((target) => {
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

//   // Alvo = coluna a seguir à última coluna preenchida da série "Cliente sem
//   // assinantes" (mesma lógica usada no módulo de Contas Menor).
//   const semAssinantes = metrics.find((m) => m.key === "semAssinantes")!;
//   let targetPeriod: string | null = null;
//   if (semAssinantes.series.length > 0) {
//     const lastLabel = semAssinantes.series[semAssinantes.series.length - 1].label;
//     const lastIdx = dataCols.findIndex(
//       (c) => `${monthLabels[c]} · ${String(subRow[c]).trim()}` === lastLabel
//     );
//     if (lastIdx !== -1 && lastIdx + 1 < dataCols.length) {
//       const c = dataCols[lastIdx + 1];
//       targetPeriod = `${monthLabels[c]} · ${String(subRow[c]).trim()}`;
//     }
//   }

//   return { sheetName, metrics, targetPeriod };
// }

// /**
//  * Lê o ficheiro bruto "Carteira Depósitos por Nr de Titulares" (Clientes sem
//  * assinantes) e aplica, por esta ordem, os 4 filtros validados:
//  *  1. Classe Componente = "DO"  (exclui vazias e "CCO")
//  *  2. Segmento Cliente != "CI"  (exclui contas internas)
//  *  3. Remove duplicados por Conta
//  *  4. Remove as entidades INTERBANCOS VIRTUAL / ENTERPRISE MB / DESAFIOS E IDEIAS
//  */
// export function parseAssinantesRawWorkbook(buffer: ArrayBuffer): AssinantesRawResult {
//   const wb = XLSX.read(buffer, { type: "array", cellDates: true });

//   let sheetName = wb.SheetNames.find((n) => normalize(n).includes("carteira"));
//   if (!sheetName) sheetName = wb.SheetNames[0];

//   const ws = wb.Sheets[sheetName];
//   const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

//   let headerRowIdx = -1;
//   for (let i = 0; i < Math.min(6, rows.length); i++) {
//     const rowNorm = (rows[i] || []).map(normalize);
//     if (rowNorm.includes("conta") && rowNorm.some((c) => c.includes("segmento cliente"))) {
//       headerRowIdx = i;
//       break;
//     }
//   }
//   if (headerRowIdx === -1) {
//     throw new AssinantesParseError(
//       "Não encontrei as colunas esperadas ('Conta', 'Segmento Cliente', 'Classe Componente') neste ficheiro."
//     );
//   }

//   const header = (rows[headerRowIdx] || []).map(normalize);
//   const contaCol = header.findIndex((c) => c === "conta");
//   const segmentoCol = header.findIndex((c) => c === "segmento cliente");
//   const classeComponenteCol = header.findIndex((c) => c === "classe componente");
//   // O nome da entidade fica na coluna logo a seguir a "Entidade 1º Titular (Act)"
//   // (essa coluna, no ficheiro original, guarda só o código numérico).
//   const entidadeCodCol = header.findIndex((c) => c.includes("entidade 1") && c.includes("titular"));
//   const entidadeNomeCol = entidadeCodCol !== -1 ? entidadeCodCol + 1 : -1;
//   const diaCol = header.findIndex((c) => c === "dia");

//   if (contaCol === -1 || segmentoCol === -1 || classeComponenteCol === -1) {
//     throw new AssinantesParseError(
//       "O ficheiro não tem as colunas 'Conta', 'Segmento Cliente' ou 'Classe Componente' esperadas."
//     );
//   }

//   const dataRows = rows.slice(headerRowIdx + 1);
//   const totalBruto = dataRows.length;

//   const step1 = dataRows.filter((r) => normName(r[classeComponenteCol]) === "DO");
//   const step2 = step1.filter((r) => normName(r[segmentoCol]) !== "CI");

//   const seen = new Set<unknown>();
//   const step3: unknown[][] = [];
//   for (const r of step2) {
//     const conta = r[contaCol];
//     if (seen.has(conta)) continue;
//     seen.add(conta);
//     step3.push(r);
//   }

//   const step4 = step3.filter((r) => {
//     if (entidadeNomeCol === -1) return true;
//     return !ENTIDADES_EXCLUIR.has(normName(r[entidadeNomeCol]));
//   });

//   let reportDate: Date | null = null;
//   if (diaCol !== -1) {
//     for (const r of dataRows) {
//       const raw = r[diaCol];
//       if (raw === null || raw === undefined) continue;
//       if (typeof raw === "number" && String(raw).length === 8) {
//         const s = String(raw);
//         reportDate = new Date(
//           parseInt(s.slice(0, 4), 10),
//           parseInt(s.slice(4, 6), 10) - 1,
//           parseInt(s.slice(6, 8), 10)
//         );
//       } else if (raw instanceof Date) {
//         reportDate = raw;
//       }
//       if (reportDate) break;
//     }
//   }
//   if (!reportDate) reportDate = new Date();

//   return {
//     reportDate,
//     totalBruto,
//     aposFiltroDO: step1.length,
//     semCI: step2.length,
//     semDuplicados: step3.length,
//     final: step4.length,
//   };
// }

// /**
//  * Combina os dois ficheiros: preenche, no resultado do Plano, a 1ª semana em
//  * branco de "Cliente sem assinantes" E "Assinaturas por digitalizar" com o
//  * mesmo valor final calculado a partir do ficheiro bruto.
//  */
// export function mergeAssinantesIntoPlano(
//   plano: AssinantesPlanoResult,
//   raw: AssinantesRawResult
// ): AssinantesPlanoResult {
//   if (!plano.targetPeriod) return plano;

//   const metrics = plano.metrics.map((m) => {
//     const previous = m.series.length > 0 ? m.series[m.series.length - 1].value : null;
//     const newValue = raw.final;
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

export class AssinantesParseError extends Error {}

export interface AssinantesMetric {
  key: "semAssinantes" | "assinaturasPorDigitalizar";
  label: string;
  series: PeriodValue[];
  current: number | null;
  currentPeriod: string | null;
  previous: number | null;
  deltaPct: number | null;
}

export interface AssinantesPlanoResult {
  sheetName: string;
  metrics: AssinantesMetric[];
  targetPeriod: string | null;
}

export interface AssinantesRawResult {
  reportDate: Date;
  totalBruto: number;
  aposFiltroDO: number;
  semCI: number;
  semDuplicados: number;
  final: number;
}

function normalize(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Normaliza nomes de entidade/valores de texto: troca NBSP e quebras de linha
// por espaço normal e colapsa espaços repetidos (resolve o problema de
// "ENTERPRISE MB\nDESAFIOS E IDEIAS" ou "Conta\u00a0Corrente\u00a0...").
function normName(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/\u00a0/g, " ")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

const ENTIDADES_EXCLUIR = new Set([
  "INTERBANCOS VIRTUAL",
  "ENTERPRISE MB",
  "DESAFIOS E IDEIAS",
]);

// "Cliente sem assinantes" e "Assinaturas por digitalizar" são tratadas como
// a mesma métrica (confirmado com o utilizador) — ambas recebem o mesmo valor.
const ROW_TARGETS: { key: AssinantesMetric["key"]; label: string; match: string }[] = [
  {
    key: "semAssinantes",
    label: "Cliente sem assinantes (inc. ex BTM)",
    match: normalize("Cliente sem assinantes (inc. ex BTM)"),
  },
  {
    key: "assinaturasPorDigitalizar",
    label: "Assinaturas por digitalizar",
    match: normalize("Assinaturas por digitalizar"),
  },
];

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

/**
 * Lê a folha "Mapa de acompanhamento" do Plano de Actividades e devolve o
 * histórico + a 1ª semana em branco das linhas "Cliente sem assinantes" e
 * "Assinaturas por digitalizar".
 */
export function parseAssinantesFromPlano(buffer: ArrayBuffer): AssinantesPlanoResult {
  const wb = XLSX.read(buffer, { type: "array" }); // sem cellDates: evita bug de fuso horário (ver formatMonthCell)

  let sheetName = wb.SheetNames.find((n) => normalize(n).includes("mapa"));
  if (!sheetName) sheetName = wb.SheetNames[0];

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
    throw new AssinantesParseError("Não consegui identificar a estrutura de semanas/quinzenas nesta folha.");
  }

  const monthRowIdx = Math.max(0, subRowIdx - 1);
  const monthRow = rows[monthRowIdx] || [];
  const subRow = rows[subRowIdx] || [];
  const maxCol = rows.reduce((m, r) => Math.max(m, (r || []).length), 0);

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
    throw new AssinantesParseError("Não encontrei colunas de dados (Semana/Quinzena) válidas nesta folha.");
  }

  const metrics: AssinantesMetric[] = ROW_TARGETS.map((target) => {
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

  // Alvo = coluna a seguir à última coluna preenchida da série "Cliente sem
  // assinantes" (mesma lógica usada no módulo de Contas Menor).
  const semAssinantes = metrics.find((m) => m.key === "semAssinantes")!;
  let targetPeriod: string | null = null;
  if (semAssinantes.series.length > 0) {
    const lastLabel = semAssinantes.series[semAssinantes.series.length - 1].label;
    const lastIdx = dataCols.findIndex(
      (c) => `${monthLabels[c]} · ${String(subRow[c]).trim()}` === lastLabel
    );
    if (lastIdx !== -1 && lastIdx + 1 < dataCols.length) {
      const c = dataCols[lastIdx + 1];
      targetPeriod = `${monthLabels[c]} · ${String(subRow[c]).trim()}`;
    }
  }

  return { sheetName, metrics, targetPeriod };
}

/**
 * Lê o ficheiro bruto "Carteira Depósitos por Nr de Titulares" (Clientes sem
 * assinantes) e aplica, por esta ordem, os 4 filtros validados:
 *  1. Classe Componente = "DO"  (exclui vazias e "CCO")
 *  2. Segmento Cliente != "CI"  (exclui contas internas)
 *  3. Remove duplicados por Conta
 *  4. Remove as entidades INTERBANCOS VIRTUAL / ENTERPRISE MB / DESAFIOS E IDEIAS
 */
export function parseAssinantesRawWorkbook(buffer: ArrayBuffer): AssinantesRawResult {
  const wb = XLSX.read(buffer, { type: "array" }); // sem cellDates: evita bug de fuso horário (ver formatMonthCell)

  let sheetName = wb.SheetNames.find((n) => normalize(n).includes("carteira"));
  if (!sheetName) sheetName = wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const rowNorm = (rows[i] || []).map(normalize);
    if (rowNorm.includes("conta") && rowNorm.some((c) => c.includes("segmento cliente"))) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) {
    throw new AssinantesParseError(
      "Não encontrei as colunas esperadas ('Conta', 'Segmento Cliente', 'Classe Componente') neste ficheiro."
    );
  }

  const header = (rows[headerRowIdx] || []).map(normalize);
  const contaCol = header.findIndex((c) => c === "conta");
  const segmentoCol = header.findIndex((c) => c === "segmento cliente");
  const classeComponenteCol = header.findIndex((c) => c === "classe componente");
  // O nome da entidade fica na coluna logo a seguir a "Entidade 1º Titular (Act)"
  // (essa coluna, no ficheiro original, guarda só o código numérico).
  const entidadeCodCol = header.findIndex((c) => c.includes("entidade 1") && c.includes("titular"));
  const entidadeNomeCol = entidadeCodCol !== -1 ? entidadeCodCol + 1 : -1;
  const diaCol = header.findIndex((c) => c === "dia");

  if (contaCol === -1 || segmentoCol === -1 || classeComponenteCol === -1) {
    throw new AssinantesParseError(
      "O ficheiro não tem as colunas 'Conta', 'Segmento Cliente' ou 'Classe Componente' esperadas."
    );
  }

  const dataRows = rows.slice(headerRowIdx + 1);
  const totalBruto = dataRows.length;

  const step1 = dataRows.filter((r) => normName(r[classeComponenteCol]) === "DO");
  const step2 = step1.filter((r) => normName(r[segmentoCol]) !== "CI");

  const seen = new Set<unknown>();
  const step3: unknown[][] = [];
  for (const r of step2) {
    const conta = r[contaCol];
    if (seen.has(conta)) continue;
    seen.add(conta);
    step3.push(r);
  }

  const step4 = step3.filter((r) => {
    if (entidadeNomeCol === -1) return true;
    return !ENTIDADES_EXCLUIR.has(normName(r[entidadeNomeCol]));
  });

  let reportDate: Date | null = null;
  if (diaCol !== -1) {
    for (const r of dataRows) {
      const raw = r[diaCol];
      if (raw === null || raw === undefined) continue;
      if (typeof raw === "number" && String(raw).length === 8) {
        const s = String(raw);
        reportDate = new Date(
          parseInt(s.slice(0, 4), 10),
          parseInt(s.slice(4, 6), 10) - 1,
          parseInt(s.slice(6, 8), 10)
        );
      } else if (raw instanceof Date) {
        reportDate = raw;
      }
      if (reportDate) break;
    }
  }
  if (!reportDate) reportDate = new Date();

  return {
    reportDate,
    totalBruto,
    aposFiltroDO: step1.length,
    semCI: step2.length,
    semDuplicados: step3.length,
    final: step4.length,
  };
}

/**
 * Combina os dois ficheiros: preenche, no resultado do Plano, a 1ª semana em
 * branco de "Cliente sem assinantes" E "Assinaturas por digitalizar" com o
 * mesmo valor final calculado a partir do ficheiro bruto.
 */
export function mergeAssinantesIntoPlano(
  plano: AssinantesPlanoResult,
  raw: AssinantesRawResult
): AssinantesPlanoResult {
  if (!plano.targetPeriod) return plano;

  const metrics = plano.metrics.map((m) => {
    const previous = m.series.length > 0 ? m.series[m.series.length - 1].value : null;
    const newValue = raw.final;
    const deltaPct = previous && previous !== 0 ? (newValue - previous) / previous : null;
    const newSeries: PeriodValue[] = [
      ...m.series,
      { label: plano.targetPeriod as string, month: "", sub: "", value: newValue },
    ];
    return { ...m, series: newSeries, current: newValue, currentPeriod: plano.targetPeriod, previous, deltaPct };
  });

  return { ...plano, metrics };
}

