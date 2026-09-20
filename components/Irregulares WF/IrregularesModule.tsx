"use client";

import { useState } from "react";
import IrregularesUploadZone from "@/components/Irregulares WF/IrregularesUploadZone";
import IrregularesDashboard from "@/components/Irregulares WF/IrregularesDashboard";
import {
  parseIrregularesRawWorkbook,
  parseIrregularesFromPlano,
  mergeIrregularesIntoPlano,
  IrregularesParseError,
  type IrregularesRawResult,
  type IrregularesPlanoResult,
} from "@/lib/parseIrregularesWF";

export default function IrregularesModule() {
  const [planoFile, setPlanoFile] = useState<File | null>(null);
  const [rawFileName, setRawFileName] = useState<string | null>(null);
  const [planoParsed, setPlanoParsed] = useState<IrregularesPlanoResult | null>(null);
  const [rawParsed, setRawParsed] = useState<IrregularesRawResult | null>(null);
  const [result, setResult] = useState<IrregularesPlanoResult | null>(null);
  const [isPlanoLoading, setIsPlanoLoading] = useState(false);
  const [isRawLoading, setIsRawLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function recombine(plano: IrregularesPlanoResult | null, raw: IrregularesRawResult | null) {
    if (!plano) return;
    if (!raw) { setResult(plano); return; }
    if (!plano.targetPeriod) {
      setError("Este Plano de Actividades já não tem nenhuma semana em branco para calcular — todas as semanas visíveis já estão preenchidas.");
      setResult(plano);
      return;
    }
    setResult(mergeIrregularesIntoPlano(plano, raw));
  }

  async function handlePlanoFile(file: File) {
    setIsPlanoLoading(true);
    setError(null);
    setPlanoFile(file);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseIrregularesFromPlano(buffer);
      setPlanoParsed(parsed);
      recombine(parsed, rawParsed);
    } catch (e) {
      setPlanoParsed(null);
      setResult(null);
      setError(e instanceof IrregularesParseError ? e.message : "Não consegui ler o Plano de Actividades.");
    } finally {
      setIsPlanoLoading(false);
    }
  }

  async function handleRawFile(file: File) {
    setIsRawLoading(true);
    setError(null);
    setRawFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseIrregularesRawWorkbook(buffer);
      setRawParsed(parsed);
      recombine(planoParsed, parsed);
    } catch (e) {
      setRawParsed(null);
      setError(e instanceof IrregularesParseError ? e.message : "Não consegui ler o ficheiro Contas Irregulares WF.");
    } finally {
      setIsRawLoading(false);
    }
  }

  return (
    <div>
      <section className="mb-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-moza-red">
          Irregulares no WF → cálculo automático
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight text-moza-ink sm:text-4xl">
          Antigo e novo Workflow, separados.
        </h1>
        <p className="mt-3 max-w-2xl text-moza-slate">
          Carregue os dois ficheiros. Removemos encerradas, actividades
          específicas, mantemos só o 1º titular e sem duplicados por
          contrato. O Antigo WF só calcula &ldquo;Bloqueadas&rdquo; (está
          descontinuado); o WF actual calcula também Anuladas e Desbloqueadas
          com condicionalismo.
        </p>
      </section>

      <section className="mb-10">
        <IrregularesUploadZone
          onPlanoFile={handlePlanoFile}
          onRawFile={handleRawFile}
          isPlanoLoading={isPlanoLoading}
          isRawLoading={isRawLoading}
          error={error}
          planoFileName={planoFile?.name ?? null}
          rawFileName={rawFileName}
        />
      </section>

      {result && rawParsed && (
        <section>
          <IrregularesDashboard plano={result} raw={rawParsed} />
        </section>
      )}
    </div>
  );
}
