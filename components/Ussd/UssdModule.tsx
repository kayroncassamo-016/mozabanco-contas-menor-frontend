
"use client";

import { useState } from "react";
import UssdUploadZone from "./UssdUploadZone";
import UssdDashboard from "./UssdDashboard";
import {
  parseUssdWorkbook,
  parseUssdFromPlano,
  mergeUssdIntoPlano,
  UssdParseError,
  type UssdResult,
  type UssdPlanoResult,
} from "@/lib/parseUSSD";

export default function UssdModule() {
  const [planoFile, setPlanoFile] = useState<File | null>(null);
  const [rawFileName, setRawFileName] = useState<string | null>(null);
  const [planoParsed, setPlanoParsed] = useState<UssdPlanoResult | null>(null);
  const [rawParsed, setRawParsed] = useState<UssdResult | null>(null);
  const [result, setResult] = useState<UssdPlanoResult | null>(null);
  const [isPlanoLoading, setIsPlanoLoading] = useState(false);
  const [isRawLoading, setIsRawLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function recombine(plano: UssdPlanoResult | null, raw: UssdResult | null) {
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
    setResult(mergeUssdIntoPlano(plano, raw));
  }

  async function handlePlanoFile(file: File) {
    setIsPlanoLoading(true);
    setError(null);
    setPlanoFile(file);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseUssdFromPlano(buffer);
      setPlanoParsed(parsed);
      recombine(parsed, rawParsed);
    } catch (e) {
      setPlanoParsed(null);
      setResult(null);
      setError(e instanceof UssdParseError ? e.message : "Não consegui ler o Plano de Actividades.");
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
      const parsed = parseUssdWorkbook(buffer);
      setRawParsed(parsed);
      recombine(planoParsed, parsed);
    } catch (e) {
      setRawParsed(null);
      setError(e instanceof UssdParseError ? e.message : "Não consegui ler o ficheiro Export USSD.");
    } finally {
      setIsRawLoading(false);
    }
  }

  return (
    <div>
      <section className="mb-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-moza-red">
          USSD Moza Já → cálculo automático
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight text-moza-ink sm:text-4xl">
          Serviços da semana, convergentes e divergentes.
        </h1>
        <p className="mt-3 max-w-2xl text-moza-slate">
          Carregue os dois ficheiros. Identificamos a 1ª semana ainda por
          preencher na secção &ldquo;Contactos (Contas vs Moza Já)&rdquo; do
          Plano, e calculamos os seus valores a partir do export USSD (sem
          encerradas, sem duplicados por cliente, últimos 7 dias do próprio
          ficheiro, e comparação com os telefones Banka).
        </p>
      </section>

      <section className="mb-10">
        <UssdUploadZone
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
          <UssdDashboard plano={result} raw={rawParsed} />
        </section>
      )}
    </div>
  );
}

