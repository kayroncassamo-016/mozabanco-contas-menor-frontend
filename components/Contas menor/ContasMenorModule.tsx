

// "use client";

// import { useState } from "react";
// import UploadZone from "@/components/UploadZone";
// import Dashboard from "@/components/Contas menor/Dashboard";
// import {
//   parsePlanoWorkbook,
//   parseContasMenorWorkbook,
//   mergeContasMenorIntoPlano,
//   PlanoParseError,
//   type ParsedResult,
//   type ContasMenorResult,
// } from "@/lib/parsePlano";

// export default function ContasMenorModule() {
//   const [planoFile, setPlanoFile] = useState<File | null>(null);
//   const [contasMenorFile, setContasMenorFile] = useState<File | null>(null);
//   const [planoParsed, setPlanoParsed] = useState<ParsedResult | null>(null);
//   const [cmParsed, setCmParsed] = useState<ContasMenorResult | null>(null);
//   const [result, setResult] = useState<ParsedResult | null>(null);
//   const [isContasMenorLoading, setIsContasMenorLoading] = useState(false);
//   const [isPlanoLoading, setPlanoIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   function recombine(plano: ParsedResult | null, cm: ContasMenorResult | null) {
//     if (!plano) return;
//     if (!cm) {
//       setResult(plano);
//       return;
//     }
//     if (!plano.targetPeriod) {
//       setError(
//         "Este Plano de Actividades já não tem nenhuma semana em branco para calcular — todas as semanas visíveis já estão preenchidas."
//       );
//       setResult(plano);
//       return;
//     }
//     setResult(mergeContasMenorIntoPlano(plano, cm));
//   }

//   async function handlePlanoFile(file: File) {
//     setPlanoIsLoading(true);
//     setError(null);
//     setPlanoFile(file);
//     try {
//       const buffer = await file.arrayBuffer();
//       const parsed = parsePlanoWorkbook(buffer);
//       setPlanoParsed(parsed);
//       recombine(parsed, cmParsed);
//     } catch (e) {
//       setPlanoParsed(null);
//       setResult(null);
//       setError(e instanceof PlanoParseError ? e.message : "Não consegui ler o Plano de Actividades.");
//     } finally {
//       setPlanoIsLoading(false);
//     }
//   }

//   async function handleContasMenorFile(file: File) {
//     setIsContasMenorLoading(true);
//     setError(null);
//     setContasMenorFile(file);
//     try {
//       const buffer = await file.arrayBuffer();
//       const parsed = parseContasMenorWorkbook(buffer);
//       setCmParsed(parsed);
//       recombine(planoParsed, parsed);
//     } catch (e) {
//       setCmParsed(null);
//       setError(e instanceof PlanoParseError ? e.message : "Não consegui ler o ficheiro Contas Menor.");
//     } finally {
//       setIsContasMenorLoading(false);
//     }
//   }

//   return (
//     <div>
//       <section className="mb-10">
//         <p className="mb-2 font-mono text-xs uppercase tracking-widest text-moza-red">
//           Contas Menor → cálculo automático
//         </p>
//         <h1 className="font-display text-3xl font-semibold leading-tight text-moza-ink sm:text-4xl">
//           Cálculo automático na semana que está em branco.
//         </h1>
//         <p className="mt-3 max-w-2xl text-moza-slate">
//           Carregue os dois ficheiros. Identificamos a 1ª semana ainda por
//           preencher no Plano de Actividades e calculamos os seus valores a
//           partir das datas de nascimento no ficheiro Contas Menor.
//         </p>
//       </section>

//       <section className="mb-10">
//         <UploadZone
//           onPlanoFile={handlePlanoFile}
//           onContasMenorFile={handleContasMenorFile}
//           isPlanoLoading={isPlanoLoading}
//           isContasMenorLoading={isContasMenorLoading}
//           error={error}
//           planoFileName={planoFile?.name ?? null}
//           contasMenorFileName={contasMenorFile?.name ?? null}
//         />
//       </section>

//       {result && (
//         <section>
//           <Dashboard result={result} />
//         </section>
//       )}
//     </div>
//   );
// }
"use client";

import { useState } from "react";
import UploadZone from "@/components/UploadZone";
import Dashboard from "@/components/Contas menor/Dashboard";

import {
  parsePlanoWorkbook,
  parseContasMenorWorkbook,
  mergeContasMenorIntoPlano,
  PlanoParseError,
  type ParsedResult,
  type ContasMenorResult,
} from "@/lib/parsePlano";

import {
  buildContasMenorReport,
  downloadContasMenorReport,
} from "@/lib/contasMenorReport";

export default function ContasMenorModule() {
  const [planoFile, setPlanoFile] = useState<File | null>(null);
  const [contasMenorFile, setContasMenorFile] =
    useState<File | null>(null);
  const [agenciasFile, setAgenciasFile] = useState<File | null>(null);

  const [planoParsed, setPlanoParsed] =
    useState<ParsedResult | null>(null);

  const [cmParsed, setCmParsed] =
    useState<ContasMenorResult | null>(null);

  const [result, setResult] =
    useState<ParsedResult | null>(null);

  const [isContasMenorLoading, setIsContasMenorLoading] =
    useState(false);

  const [isPlanoLoading, setPlanoIsLoading] =
    useState(false);

  const [isAgenciasLoading, setIsAgenciasLoading] =
    useState(false);

  const [isReportLoading, setIsReportLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  function recombine(
    plano: ParsedResult | null,
    cm: ContasMenorResult | null
  ) {
    if (!plano) return;

    if (!cm) {
      setResult(plano);
      return;
    }

    if (!plano.targetPeriod) {
      setError(
        "Este Plano de Actividades já não tem nenhuma semana em branco para calcular — todas as semanas visíveis já estão preenchidas."
      );

      setResult(plano);
      return;
    }

    setResult(
      mergeContasMenorIntoPlano(plano, cm)
    );
  }

  async function handlePlanoFile(file: File) {
    setPlanoIsLoading(true);
    setError(null);
    setPlanoFile(file);

    try {
      const buffer = await file.arrayBuffer();

      const parsed = parsePlanoWorkbook(buffer);

      setPlanoParsed(parsed);

      recombine(parsed, cmParsed);
    } catch (e) {
      setPlanoParsed(null);
      setResult(null);

      setError(
        e instanceof PlanoParseError
          ? e.message
          : "Não consegui ler o Plano de Actividades."
      );
    } finally {
      setPlanoIsLoading(false);
    }
  }

  async function handleContasMenorFile(file: File) {
    setIsContasMenorLoading(true);
    setError(null);
    setContasMenorFile(file);

    try {
      const buffer = await file.arrayBuffer();

      const parsed = parseContasMenorWorkbook(buffer);

      setCmParsed(parsed);

      recombine(planoParsed, parsed);
    } catch (e) {
      setCmParsed(null);

      setError(
        e instanceof PlanoParseError
          ? e.message
          : "Não consegui ler o ficheiro Contas Menor."
      );
    } finally {
      setIsContasMenorLoading(false);
    }
  }

  async function handleAgenciasFile(file: File) {
    setIsAgenciasLoading(true);
    setError(null);
    setAgenciasFile(file);

    try {
      // Apenas guardamos o ficheiro aqui.
      // O cruzamento será feito quando o utilizador
      // solicitar a geração do relatório.
      await file.arrayBuffer();
    } catch {
      setAgenciasFile(null);
      setError(
        "Não consegui ler o ficheiro Lista de Agências."
      );
    } finally {
      setIsAgenciasLoading(false);
    }
  }

  async function handleDownloadReport() {
    if (!contasMenorFile || !agenciasFile) {
      setError(
        "Carregue primeiro os ficheiros Contas Menor e Lista de Agências."
      );
      return;
    }

    setIsReportLoading(true);
    setError(null);

    try {
      const [contasMenorBuffer, agenciasBuffer] =
        await Promise.all([
          contasMenorFile.arrayBuffer(),
          agenciasFile.arrayBuffer(),
        ]);

      const report = buildContasMenorReport(
        contasMenorBuffer,
        agenciasBuffer
      );

      downloadContasMenorReport(report);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não consegui gerar o relatório de Contas Menor."
      );
    } finally {
      setIsReportLoading(false);
    }
  }

  const canGenerateReport =
    !!contasMenorFile && !!agenciasFile;

  return (
    <div>
      <section className="mb-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-moza-red">
          Contas Menor → cálculo automático
        </p>

        <h1 className="font-display text-3xl font-semibold leading-tight text-moza-ink sm:text-4xl">
          Cálculo automático na semana que está em branco.
        </h1>

        <p className="mt-3 max-w-2xl text-moza-slate">
          Carregue os ficheiros necessários. Identificamos a
          1ª semana ainda por preencher no Plano de Actividades
          e calculamos os seus valores a partir das datas de
          nascimento no ficheiro Contas Menor.
        </p>
      </section>

      <section className="mb-10">
        <UploadZone
          onPlanoFile={handlePlanoFile}
          onContasMenorFile={handleContasMenorFile}
          onAgenciasFile={handleAgenciasFile}

          isPlanoLoading={isPlanoLoading}
          isContasMenorLoading={isContasMenorLoading}
          isAgenciasLoading={isAgenciasLoading}

          error={error}

          planoFileName={planoFile?.name ?? null}
          contasMenorFileName={contasMenorFile?.name ?? null}
          agenciasFileName={agenciasFile?.name ?? null}
        />
      </section>

      {canGenerateReport && (
        <section className="mb-10">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-moza-line bg-white/60 p-6 shadow-card sm:flex-row">
            <div>
              <p className="font-display text-base font-semibold text-moza-ink">
                Relatório de Contas Menor
              </p>

              <p className="mt-1 text-sm text-moza-slate">
                Cruze Contas Menor com a Lista de Agências e
                gere o ficheiro para comunicação.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isReportLoading}
              className="rounded-full bg-moza-red px-6 py-3 text-sm font-medium text-white shadow-card transition-transform hover:scale-[1.02] hover:bg-moza-redDeep active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isReportLoading
                ? "A gerar relatório…"
                : "Baixar relatório Excel"}
            </button>
          </div>
        </section>
      )}

      {result && (
        <section>
          <Dashboard result={result} />
        </section>
      )}
    </div>
  );
}