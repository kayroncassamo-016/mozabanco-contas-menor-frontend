

"use client";

import { useState } from "react";
import AssinantesUploadZone from "@/components/Assinantes/AssinantesUploadZone";
import AssinantesDashboard from "@/components/Assinantes/AssinantesDashboard";
import {
  parseAssinantesFromPlano,
  parseAssinantesRawWorkbook,
  mergeAssinantesIntoPlano,
  AssinantesParseError,
  type AssinantesPlanoResult,
  type AssinantesRawResult,
} from "@/lib/parseAssinantes";

export default function AssinantesModule() {
  const [planoFile, setPlanoFile] = useState<File | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [planoParsed, setPlanoParsed] = useState<AssinantesPlanoResult | null>(null);
  const [rawParsed, setRawParsed] = useState<AssinantesRawResult | null>(null);
  const [result, setResult] = useState<AssinantesPlanoResult | null>(null);
  const [isPlanoLoading, setIsPlanoLoading] = useState(false);
  const [isRawLoading, setIsRawLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function recombine(plano: AssinantesPlanoResult | null, raw: AssinantesRawResult | null) {
    if (!plano) return;
    if (!raw) {
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
    setResult(mergeAssinantesIntoPlano(plano, raw));
  }

  async function handlePlanoFile(file: File) {
    setIsPlanoLoading(true);
    setError(null);
    setPlanoFile(file);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseAssinantesFromPlano(buffer);
      setPlanoParsed(parsed);
      recombine(parsed, rawParsed);
    } catch (e) {
      setPlanoParsed(null);
      setResult(null);
      setError(e instanceof AssinantesParseError ? e.message : "Não consegui ler o Plano de Actividades.");
    } finally {
      setIsPlanoLoading(false);
    }
  }

  async function handleRawFile(file: File) {
    setIsRawLoading(true);
    setError(null);
    setRawFile(file);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseAssinantesRawWorkbook(buffer);
      setRawParsed(parsed);
      recombine(planoParsed, parsed);
    } catch (e) {
      setRawParsed(null);
      setError(e instanceof AssinantesParseError ? e.message : "Não consegui ler o ficheiro Clientes sem assinantes.");
    } finally {
      setIsRawLoading(false);
    }
  }

  return (
    <div>
      <section className="mb-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-moza-red">
          Clientes sem assinantes → cálculo automático
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight text-moza-ink sm:text-4xl">
          Quatro filtros, um número certo.
        </h1>
        <p className="mt-3 max-w-2xl text-moza-slate">
          Carregue os dois ficheiros. Aplicamos os 4 filtros validados (Classe
          Componente = DO, sem contas internas, sem duplicados por Conta, sem
          as entidades excluídas) e preenchemos a 1ª semana em branco de
          &ldquo;Cliente sem assinantes&rdquo; e &ldquo;Assinaturas por
          digitalizar&rdquo; no Plano de Actividades.
        </p>
      </section>

      <section className="mb-10">
        <AssinantesUploadZone
          onPlanoFile={handlePlanoFile}
          onRawFile={handleRawFile}
          isPlanoLoading={isPlanoLoading}
          isRawLoading={isRawLoading}
          error={error}
          planoFileName={planoFile?.name ?? null}
          rawFileName={rawFile?.name ?? null}
        />
      </section>

      {result && rawParsed && (
        <section>
          <AssinantesDashboard plano={result} raw={rawParsed} />
        </section>
      )}
    </div>
  );
}
