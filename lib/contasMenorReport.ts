import * as XLSX from "xlsx";

export class ReportError extends Error {}

function normalize(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function normVal(v: unknown): string {
  return String(v ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}
function toDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  return null;
}

export interface ReportRow {
  balcao: number | string;
  unidadeNegocio: string;
  direccao: string;
  entidade: number | string;
  nome: string;
  conta: number | string;
  contrato: number | string;
  situacao: string;
  tipoProduto: string;
  segmentoCliente: string;
  idade: number;
  telefone: string;
}

const OUTPUT_HEADERS = [
  "Balcão", "Unidade Negócio", "Direcção", "Entidade", "Nome", "Conta",
  "Contrato", "Situação", "Tipo Produto", "Segmento Cliente", "Idade", "Telefone",
];

/**
 * Lê a Lista de Agências e devolve um mapa BALCAO -> { agencia, direccao }.
 */
function parseAgencias(buffer: ArrayBuffer): Map<string, { agencia: string; direccao: string }> {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  const header = (rows[0] || []).map(normalize);
  const cBalcao = header.findIndex((c) => c.includes("balcao"));
  const cDesc = header.findIndex((c) => c.includes("desc") && c.includes("balc"));
  const cDireccao = header.findIndex((c) => c.includes("direc"));
  if (cBalcao === -1 || cDesc === -1 || cDireccao === -1) {
    throw new ReportError("A Lista de Agências não tem as colunas esperadas (BALCAO_CONTA, DESC_BALCÃO, Direcção).");
  }
  const map = new Map<string, { agencia: string; direccao: string }>();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r[cBalcao] === null || r[cBalcao] === undefined) continue;
    map.set(String(r[cBalcao]).trim(), {
      agencia: String(r[cDesc] ?? "").trim(),
      direccao: String(r[cDireccao] ?? "").trim(),
    });
  }
  return map;
}

/**
 * Constrói as duas listas do relatório (Maioridade atingida / Por atingir
 * nos próximos 3 meses), cruzando o ficheiro bruto Contas Menor com a Lista
 * de Agências pelo número de Balcão. Usa a mesma folha/filtros do dashboard
 * (Classe Componente = DO, sem duplicados por Cliente).
 */
export function buildContasMenorReport(
  contasMenorBuffer: ArrayBuffer,
  agenciasBuffer: ArrayBuffer
): { maioridadeAtingida: ReportRow[]; porAtingir3m: ReportRow[] } {
  const agencias = parseAgencias(agenciasBuffer);

  const wb = XLSX.read(contasMenorBuffer, { type: "array" });
  let headerRowIdx = -1;
  let rows: unknown[][] = [];
  let bestRatio = -1;

  for (const name of wb.SheetNames) {
    const r: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null });
    let candidateHeaderRow = -1;
    for (let i = 0; i < Math.min(5, r.length); i++) {
      const rowNorm = (r[i] || []).map(normalize);
      if (rowNorm.includes("conta") && rowNorm.includes("cliente") && rowNorm.includes("classe componente") && rowNorm.some((c) => c.includes("nascimento"))) {
        candidateHeaderRow = i;
        break;
      }
    }
    if (candidateHeaderRow === -1) continue;
    const header = (r[candidateHeaderRow] || []).map(normalize);
    const contaColIdx = header.findIndex((c) => c === "conta");
    let ratio = 0;
    if (contaColIdx !== -1) {
      const contas: unknown[] = [];
      for (let i = candidateHeaderRow + 1; i < r.length; i++) {
        const v = r[i]?.[contaColIdx];
        if (v !== null && v !== undefined) contas.push(v);
      }
      ratio = contas.length > 0 ? new Set(contas).size / contas.length : 0;
    }
    if (ratio > bestRatio) { bestRatio = ratio; headerRowIdx = candidateHeaderRow; rows = r; }
  }
  if (headerRowIdx === -1) throw new ReportError("Não encontrei as colunas esperadas no ficheiro Contas Menor.");

  const header = (rows[headerRowIdx] || []).map(normalize);
  const idx = {
    conta: header.findIndex((c) => c === "conta"),
    contrato: header.findIndex((c) => c === "contrato"),
    cliente: header.findIndex((c) => c === "cliente"),
    nome: header.findIndex((c) => c === "cliente") + 1, // coluna seguinte a "Cliente" traz o nome
    classeComponente: header.findIndex((c) => c === "classe componente"),
    nascimento: header.findIndex((c) => c.includes("nascimento")),
    balcao: header.findIndex((c) => c === "unidade de negocio"), // código de balcão (rótulo enganoso na origem)
    situacao: header.findIndex((c) => c === "situacao"),
    tipoProduto: header.findIndex((c) => c === "tipo produto"),
    segmento: header.findIndex((c) => c === "segmento cliente"),
    telefone: header.findIndex((c) => c === "telefone"),
    dia: header.findIndex((c) => c === "dia"),
  };
  const required = ["conta", "contrato", "cliente", "classeComponente", "nascimento", "balcao", "situacao", "tipoProduto", "segmento", "telefone"] as const;
  for (const k of required) {
    if (idx[k] === -1) throw new ReportError(`Não encontrei a coluna necessária: ${k}.`);
  }

  // data de referência (coluna "Dia", formato YYYYMMDD, senão hoje)
  let reportDate: Date | null = null;
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const raw = rows[i]?.[idx.dia];
    if (raw === null || raw === undefined) continue;
    if (typeof raw === "number" && String(raw).length === 8) {
      const s = String(raw);
      reportDate = new Date(parseInt(s.slice(0, 4)), parseInt(s.slice(4, 6)) - 1, parseInt(s.slice(6, 8)));
    } else {
      reportDate = toDate(raw);
    }
    if (reportDate) break;
  }
  if (!reportDate) reportDate = new Date();
  const plus3m = new Date(reportDate);
  plus3m.setMonth(plus3m.getMonth() + 3);

  const doRows = rows.slice(headerRowIdx + 1).filter((r) => normVal(r[idx.classeComponente]) === "DO");
  const seen = new Set<unknown>();
  const uniqueRows = doRows.filter((r) => {
    const k = r[idx.cliente];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const maioridadeAtingida: ReportRow[] = [];
  const porAtingir3m: ReportRow[] = [];

  for (const r of uniqueRows) {
    const birth = toDate(r[idx.nascimento]);
    if (!birth) continue;
    const age18 = new Date(birth);
    age18.setFullYear(age18.getFullYear() + 18);

    const balcaoCode = String(r[idx.balcao] ?? "").trim();
    const ag = agencias.get(balcaoCode);
    const idadeAnos = Math.floor((reportDate.getTime() - birth.getTime()) / (365.2425 * 24 * 3600 * 1000));

    const row: ReportRow = {
      balcao: r[idx.balcao] as number | string,
      unidadeNegocio: ag?.agencia ?? "",
      direccao: ag?.direccao ?? "",
      entidade: r[idx.cliente] as number | string,
      nome: String(r[idx.nome] ?? ""),
      conta: r[idx.conta] as number | string,
      contrato: r[idx.contrato] as number | string,
      situacao: String(r[idx.situacao] ?? ""),
      tipoProduto: String(r[idx.tipoProduto] ?? ""),
      segmentoCliente: String(r[idx.segmento] ?? ""),
      idade: idadeAnos,
      telefone: String(r[idx.telefone] ?? ""),
    };

    if (age18.getTime() <= reportDate.getTime()) {
      maioridadeAtingida.push(row);
    } else if (age18.getTime() <= plus3m.getTime()) {
      porAtingir3m.push(row);
    }
  }

  return { maioridadeAtingida, porAtingir3m };
}

/**
 * Gera o ficheiro .xlsx (2 folhas) e despoleta a descarga no browser.
 */
export function downloadContasMenorReport(
  data: { maioridadeAtingida: ReportRow[]; porAtingir3m: ReportRow[] },
  fileName = "Contas_menor_comunicado.xlsx"
) {
  const toAoa = (list: ReportRow[]) => [
    OUTPUT_HEADERS,
    ...list.map((r) => [
      r.balcao, r.unidadeNegocio, r.direccao, r.entidade, r.nome, r.conta,
      r.contrato, r.situacao, r.tipoProduto, r.segmentoCliente, r.idade, r.telefone,
    ]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(toAoa(data.maioridadeAtingida)), "Maioridade atingida");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(toAoa(data.porAtingir3m)), "Por atingir");
  XLSX.writeFile(wb, fileName);
}
