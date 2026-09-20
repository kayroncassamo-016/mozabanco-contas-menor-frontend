"use client";

import { useState } from "react";
import EactUploadZone from "@/components/Eact/EactUploadZone";
import EactDashboard from "@/components/Eact/EactDashboard";
import {
  parseEactRawWorkbook,
  parseEactFromPlano,
  mergeEactIntoPlano,
  EactParseError,
  type EactRawResult,
  type EactPlanoResult,
} from "@/lib/parseEACT";


export default function EactModule() {

  const [planoFile, setPlanoFile] = useState<File | null>(null);
  const [rawFileName, setRawFileName] = useState<string | null>(null);
  const [planoParsed, setPlanoParsed] = useState<EactPlanoResult | null>(null);
  const [rawParsed, setRawParsed] = useState<EactRawResult | null>(null);
  const [result, setResult] = useState<EactPlanoResult | null>(null);
  const [isPlanoLoading, setIsPlanoLoading] = useState(false);
  const [isRawLoading, setIsRawLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function recombine(plano: EactPlanoResult | null, raw: EactRawResult | null) {
    if (!plano) return;
    if (!raw) { setResult(plano); return; }
    if (!plano.targetPeriod) {
      setError("Este Plano de Actividades já não tem nenhuma semana em branco para calcular.");
      setResult(plano);
      return;
    }
    setResult(mergeEactIntoPlano(plano, raw));
  }

  async function handlePlanoFile(file: File) {
    setIsPlanoLoading(true);
    setError(null);
    setPlanoFile(file);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseEactFromPlano(buffer);
      setPlanoParsed(parsed);
      recombine(parsed, rawParsed);
    } catch (e) {
      setPlanoParsed(null);
      setResult(null);
      setError(e instanceof EactParseError ? e.message : "Não consegui ler o Plano de Actividades.");
    } finally {
      setIsPlanoLoading(false);
    }
  }

  async function handleRawFile(file: File) {
    setIsRawLoading(true);
    setError(null);
    setRawFileName(file.name);
    try {
      const parsed = await parseEactRawWorkbook(file);
      setRawParsed(parsed);
      recombine(planoParsed, parsed);
    } catch (e) {
      setRawParsed(null);
      setError(e instanceof EactParseError ? e.message : "Não consegui processar o ficheiro EACT.");
    } finally {
      setIsRawLoading(false);
    }
  }

  return (
    <div>
      <section className="mb-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-moza-red">EACT Mensal</p>
        <h1 className="font-display text-3xl font-semibold leading-tight text-moza-ink sm:text-4xl">
          Encerradas e Entidades Soltas.
        </h1>
      </section>

      <section className="mb-10">
        <EactUploadZone
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
          <EactDashboard plano={result} raw={rawParsed} />
        </section>
      )}
    </div>
  );
}
