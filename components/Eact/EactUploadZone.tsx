"use client";

import { Slot } from "../UploadZone";

interface Props {
  onPlanoFile: (file: File) => void;
  onRawFile: (file: File) => void;
  isPlanoLoading: boolean;
  isRawLoading: boolean;
  error: string | null;
  planoFileName: string | null;
  rawFileName: string | null;
}

export default function EactUploadZone({
  onPlanoFile, onRawFile, isPlanoLoading, isRawLoading, error, planoFileName, rawFileName,
}: Props) {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Slot
          title="1. Plano de Actividades"
          hint="ficheiro .xlsx com a aba “Mapa de acompanhamento”"
          onFile={onPlanoFile}
          isLoading={isPlanoLoading}
          fileName={planoFileName}
        />
        <Slot
          title="2. EACT (mapa bruto)"
          hint="ficheiro .xlsx “Export Worksheet” (pode ser grande)"
          onFile={onRawFile}
          isLoading={isRawLoading}
          fileName={rawFileName}
        />
      </div>
      {error && <p className="mt-4 text-center text-sm font-medium text-moza-red">{error}</p>}
    </div>
  );
}
