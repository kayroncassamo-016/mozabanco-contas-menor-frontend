"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface PlanoFileContextValue {
  planoFile: File | null;
  setPlanoFile: (file: File | null) => void;
}

const PlanoFileContext = createContext<PlanoFileContextValue | undefined>(undefined);

/**
 * Guarda o ficheiro do Plano de Actividades partilhado entre módulos, para o
 * utilizador só ter de o carregar UMA vez, mesmo usando vários módulos
 * (Contas Menor, Clientes sem assinantes, etc.) que precisam dele.
 */
export function PlanoFileProvider({ children }: { children: ReactNode }) {
  const [planoFile, setPlanoFile] = useState<File | null>(null);
  return (
    <PlanoFileContext.Provider value={{ planoFile, setPlanoFile }}>
      {children}
    </PlanoFileContext.Provider>
  );
}

export function usePlanoFile() {
  const ctx = useContext(PlanoFileContext);
  if (!ctx) {
    throw new Error("usePlanoFile() só pode ser usado dentro de <PlanoFileProvider>.");
  }
  return ctx;
}
