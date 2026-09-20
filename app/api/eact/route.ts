

// import { NextRequest, NextResponse } from "next/server";
// import ExcelJS from "exceljs";
// import { unzipSync } from "fflate";
// import { writeFile, unlink } from "fs/promises";
// import { tmpdir } from "os";
// import path from "path";

// export const runtime = "nodejs";
// export const maxDuration = 300;

// function normalize(v: unknown): string {
//   if (v === null || v === undefined) return "";
//   return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
// }
// function normVal(v: unknown): string {
//   return String(v ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
// }

// // DT_ACT vem como texto "AA.MM.DD". O ano de 2 dígitos é ambíguo (ex: "92"
// // pode ser 1992 ou 2092) — se a leitura como 20XX cair no futuro face à
// // data de referência, assume-se 19XX.
// function parseDtAct(v: unknown, refForCentury: Date): Date | null {
//   if (typeof v !== "string") return null;
//   const m = v.trim().match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
//   if (!m) return null;
//   const [, yy, mm, dd] = m;
//   let year = 2000 + parseInt(yy, 10);
//   let d = new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10));
//   if (d.getTime() > refForCentury.getTime()) {
//     year = 1900 + parseInt(yy, 10);
//     d = new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10));
//   }
//   return d;
// }

// function getCreatedDate(bytes: Uint8Array): Date | null {
//   try {
//     const unzipped = unzipSync(bytes, { filter: (f) => f.name === "docProps/core.xml" });
//     const xml = unzipped["docProps/core.xml"] ? new TextDecoder().decode(unzipped["docProps/core.xml"]) : "";
//     const m = xml.match(/<dcterms:created[^>]*>([^<]+)<\/dcterms:created>/);
//     return m ? new Date(m[1]) : null;
//   } catch {
//     return null;
//   }
// }

// export async function POST(req: NextRequest) {
//   let tmpPath: string | null = null;
//   try {
//     const form = await req.formData();
//     const file = form.get("file") as File | null;
//     if (!file) return NextResponse.json({ error: "Ficheiro em falta." }, { status: 400 });

//     tmpPath = path.join(tmpdir(), `eact-${Date.now()}.xlsx`);
//     const bytes = new Uint8Array(await file.arrayBuffer());
//     await writeFile(tmpPath, bytes);

//     const createdDate = getCreatedDate(bytes);

//     const wb = new ExcelJS.stream.xlsx.WorkbookReader(tmpPath, {
//       entries: "emit",
//       worksheets: "emit",
//       sharedStrings: "cache",
//     });

//     let cSit = -1, cContrato = -1, cEntSolta = -1, cEntAssoc = -1;
//     let cInfoAct = -1, cDtAct = -1, cEmpPart = -1, cDocValido = -1;
//     let totalBruto = 0;
//     const vistosEnc = new Set<unknown>();
//     let encerradas = 0;
//     const vistosSolta = new Set<unknown>();
//     let entidadesSoltas = 0;
//     let consecutiveEmpty = 0;

//     // Entidades A: sem encerradas, sem entidade solta. Guarda-se 1 registo
//     // por ENTIDADE_ASSOCIADA (a 1ª linha encontrada), com os dados para
//     // decidir Fiabilizadas depois de sabermos a janela de 2 anos.
//     const entidadesEact = new Map<
//       unknown,
//       { infoAct: unknown; dtActRaw: unknown; empPart: unknown; docValido: unknown }
//     >();
//     let maxDtActRaw: string | null = null;
//     let maxDtActParsedForNow: Date | null = null;

//     for await (const worksheetReader of wb) {
//       const sheetName = (worksheetReader as unknown as { name?: string }).name ?? "";
//       if (!normalize(sheetName).includes("export")) continue;

//       for await (const row of worksheetReader) {
//         const vals = row.values as unknown[];
//         if (row.number === 1) {
//           const header = vals.map(normalize);
//           cSit = header.indexOf(normalize("DSC_SIT"));
//           cContrato = header.indexOf(normalize("COD_CONTRATO"));
//           cEntSolta = header.indexOf(normalize("ENTIDADE_SOLTA"));
//           cEntAssoc = header.indexOf(normalize("ENTIDADE_ASSOCIADA"));
//           cInfoAct = header.indexOf(normalize("INFO_ACT"));
//           cDtAct = header.indexOf(normalize("DT_ACT"));
//           cEmpPart = header.indexOf(normalize("DSC_EMP_PART"));
//           cDocValido = header.indexOf(normalize("DOCUMENTO_VALIDO"));
//           continue;
//         }
//         if (vals.every((v) => v === undefined || v === null)) {
//           consecutiveEmpty++;
//           // O ficheiro declara 1.048.576 linhas mas só tem dados reais nas
//           // primeiras centenas de milhares — corta ao fim de 2000 linhas
//           // vazias seguidas em vez de percorrer o resto à toa.
//           if (consecutiveEmpty > 2000) break;
//           continue;
//         }
//         consecutiveEmpty = 0;
//         totalBruto++;

//         const sit = normVal(vals[cSit]);
//         const entSolta = normVal(vals[cEntSolta]);

//         if (sit === "ENCERRADA") {
//           const k = vals[cContrato];
//           if (!vistosEnc.has(k)) { vistosEnc.add(k); encerradas++; }
//         }
//         if (entSolta === "SIM") {
//           const k = vals[cEntAssoc];
//           if (!vistosSolta.has(k)) { vistosSolta.add(k); entidadesSoltas++; }
//         }

//         // Total Entidades EACT: sem encerradas, sem entidade solta, 1 por entidade.
//         if (sit !== "ENCERRADA" && entSolta === "NAO") {
//           const ent = vals[cEntAssoc];
//           if (!entidadesEact.has(ent)) {
//             entidadesEact.set(ent, {
//               infoAct: vals[cInfoAct],
//               dtActRaw: vals[cDtAct],
//               empPart: vals[cEmpPart],
//               docValido: vals[cDocValido],
//             });
//           }
//           // Usa uma data provisória (hoje) só para tratar o século; corrige-se no fim.
//           const provisional = maxDtActParsedForNow ?? new Date();
//           const dParsed = parseDtAct(vals[cDtAct], provisional);
//           if (dParsed && (!maxDtActParsedForNow || dParsed.getTime() > maxDtActParsedForNow.getTime())) {
//             maxDtActParsedForNow = dParsed;
//             maxDtActRaw = vals[cDtAct] as string;
//           }
//         }
//       }
//     }

//     const totalEntidades = entidadesEact.size;

//     // Reprocessa a data máxima real com a referência final (evita o
//     // problema de "hoje" mudar a decisão de século a meio da leitura).
//     const finalRef = createdDate ?? new Date();
//     const maxDtAct = maxDtActRaw ? parseDtAct(maxDtActRaw, finalRef) : null;

//     let fiabilizadas = 0;
//     if (maxDtAct) {
//       const sameDay =
//         createdDate !== null &&
//         maxDtAct.getFullYear() === createdDate.getFullYear() &&
//         maxDtAct.getMonth() === createdDate.getMonth() &&
//         maxDtAct.getDate() === createdDate.getDate();

//       const refDate = new Date(maxDtAct);
//       if (sameDay) refDate.setDate(refDate.getDate() - 1);
//       const inicioJanela = new Date(refDate);
//       inicioJanela.setFullYear(inicioJanela.getFullYear() - 2);

//       for (const { infoAct, dtActRaw, empPart, docValido } of entidadesEact.values()) {
//         if (normVal(infoAct) !== "SIM") continue;
//         const dt = parseDtAct(dtActRaw, finalRef);
//         if (!dt || dt.getTime() < inicioJanela.getTime() || dt.getTime() > refDate.getTime()) continue;
//         const ep = normVal(empPart);
//         if (ep === "EMPRESA") {
//           fiabilizadas++;
//         } else if (ep === "PARTICULAR") {
//           const dv = normVal(docValido);
//           if (dv === "SIM" || dv === "SEM DATA DE VALIDADE") fiabilizadas++;
//         }
//       }
//     }

//     const porFiabilizar = totalEntidades - fiabilizadas;

//     return NextResponse.json({
//       totalBruto,
//       encerradas,
//       entidadesSoltas,
//       totalEntidades,
//       fiabilizadas,
//       porFiabilizar,
//     });
//   } catch (e) {
//     console.error("Erro /api/eact:", e);
//     return NextResponse.json(
//       { error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) },
//       { status: 500 }
//     );
//   } finally {
//     if (tmpPath) await unlink(tmpPath).catch(() => {});
//   }
// }


// ===========================================================


// import { NextRequest, NextResponse } from "next/server";

// export const runtime = "nodejs";
// export const maxDuration = 300;

// export async function POST(req: NextRequest) {
//   try {
//     const contentType = req.headers.get("content-type");

//     if (!contentType) {
//       return Response.json(
//         {
//           error: "Content-Type da requisição não foi enviado.",
//         },
//         { status: 400 }
//       );
//     }

//     // const response = await fetch(
//     //   "http://127.0.0.1:8000/api/eact",
//     //   {
//     //     method: "POST",
//     //     headers: {
//     //       "content-type": contentType,
//     //     },
//     //     body: req.body,
//     //     duplex: "half",
//     //   } as RequestInit & { duplex: "half" }
//     // );

// const backendUrl = process.env.EACT_BACKEND_URL??'';

// const response = await fetch(backendUrl, {
//   method: "POST",
//   headers: { "content-type": contentType },
//   body: req.body,
//   duplex: "half",
// } as RequestInit & { duplex: "half" });

//     return new Response(response.body, {
//       status: response.status,
//       headers: {
//         "content-type":
//           response.headers.get("content-type") ??
//           "application/json",
//       },
//     });
//   } catch (error) {
//     console.error("Erro /api/eact:", error);

//     return Response.json(
//       {
//         error:
//           error instanceof Error
//             ? `${error.name}: ${error.message}`
//             : String(error),
//       },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type");

    if (!contentType) {
      return Response.json(
        { error: "Content-Type da requisição não foi enviado." },
        { status: 400 }
      );
    }

    const backendBase =
      process.env.EACT_BACKEND_URL ?? "http://127.0.0.1:8000";

    const response = await fetch(`${backendBase}/api/eact/start`, {
      method: "POST",
      headers: { "content-type": contentType },
      body: req.body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("Erro /api/eact:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error),
      },
      { status: 500 }
    );
  }
}



