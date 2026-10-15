

"use client";

import { useState } from "react";
import Image from "next/image";
import mozaLogo from "@/components/images/moza.png";
import {
  Users,
  UserX,
  Smartphone,
  ShieldAlert,
  Building2,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import ContasMenorModule from "@/components/Contas menor/ContasMenorModule";
import AssinantesModule from "@/components/Assinantes/AssinantesModule";
import UssdModule from "@/components/Ussd/UssdModule";
import IrregularesModule from "@/components/Irregulares WF/IrregularesModule";
import EactModule from "@/components/Eact/EactModule";


type ModuleKey = "contasMenor" | "assinantes" | "ussd" | "irregulares" | "eact";

const MODULES: { key: ModuleKey; label: string; icon: LucideIcon }[] = [
  { key: "contasMenor", label: "Contas Menor", icon: Users },
  { key: "assinantes", label: "Clientes sem assinantes", icon: UserX },
  { key: "ussd", label: "USSD Moza Já", icon: Smartphone },
  { key: "irregulares", label: "Irregulares no WF", icon: ShieldAlert },
  { key: "eact", label: "EACT Semanal", icon: Building2 },
];

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleKey>("contasMenor");
  const active = MODULES.find((m) => m.key === activeModule)!;


return (
  <div className="flex h-screen overflow-hidden bg-white">

    {/* Overlay mobile */}
    {sidebarOpen && (
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={() => setSidebarOpen(false)}
        className="fixed inset-0 z-40 bg-black/30 lg:hidden"
      />
    )}

    {/* Sidebar */}
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 flex h-screen w-72
        flex-col border-r border-moza-line bg-white
        shadow-xl transition-transform duration-200
        lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:shadow-none
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Header do Sidebar */}
      <div className="shrink-0 border-b border-moza-line px-6 py-5">
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <Image
              src={mozaLogo}
              alt="mozabanco"
              width={32}
              height={32}
            />

            <div>
              <p className="font-display text-sm font-bold text-moza-ink">
                DCC
              </p>
              <p className="text-xs text-moza-slate">
                Automações
              </p>
            </div>
          </div>

          {/* Fechar sidebar no mobile */}
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-moza-slate transition-colors hover:bg-moza-redSoft hover:text-moza-red lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

        </div>
      </div>

      {/* Navegação */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">

          {MODULES.map((m) => {
            const Icon = m.icon;
            const isActive = activeModule === m.key;

            return (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  setActiveModule(m.key);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-moza-red text-white shadow-card"
                    : "text-moza-slate hover:bg-moza-redSoft hover:text-moza-red"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />

                <span className="text-left">
                  {m.label}
                </span>
              </button>
            );
          })}

        </div>
      </nav>

      {/* Informação no rodapé do Sidebar */}
      <div className="shrink-0 border-t border-moza-line px-6 py-4">
        <p className="text-[11px] leading-relaxed text-moza-slate">
          Processamento local no navegador. O EACT (ficheiro grande) é a
          única excepção — passa pelo servidor por limitação técnica.
        </p>
      </div>
    </aside>

    {/* Área principal */}
    <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">

      {/* Header */}
      <header className="z-10 flex shrink-0 items-center justify-between border-b border-moza-line bg-white/80 px-5 py-4 backdrop-blur sm:px-8">

        {/* Mobile */}
        <div className="flex items-center gap-3 lg:hidden">

          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-moza-slate transition-colors hover:bg-moza-redSoft hover:text-moza-red"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Image
            src={mozaLogo}
            alt="mozabanco"
            width={28}
            height={28}
          />

        </div>

        {/* Módulo atual — desktop */}
        <div className="hidden items-center gap-2 lg:flex">

          <active.icon className="h-4 w-4 text-moza-red" />

          <span className="font-display text-sm font-semibold text-moza-ink">
            {active.label}
          </span>

        </div>

        {/* Contexto da aplicação */}
        <span className="rounded-full border border-moza-line bg-white px-3 py-1 text-xs font-medium text-moza-slate">
          DCC · Automações
        </span>

      </header>

      {/* Conteúdo principal */}
      <main className="min-h-0 flex-1 overflow-y-auto">

        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">

          {/* Contas Menor */}
          <div
            className={
              activeModule === "contasMenor"
                ? ""
                : "hidden"
            }
          >
            <ContasMenorModule />
          </div>

          {/* Clientes sem assinantes */}
          <div
            className={
              activeModule === "assinantes"
                ? ""
                : "hidden"
            }
          >
            <AssinantesModule />
          </div>

          {/* USSD Moza Já */}
          <div
            className={
              activeModule === "ussd"
                ? ""
                : "hidden"
            }
          >
            <UssdModule />
          </div>

          {/* Irregulares no WF */}
          <div
            className={
              activeModule === "irregulares"
                ? ""
                : "hidden"
            }
          >
            <IrregularesModule />
          </div>

          {/* EACT Mensal */}
          <div
            className={
              activeModule === "eact"
                ? ""
                : "hidden"
            }
          >
            <EactModule />
          </div>

          {/* Footer */}
          <footer className="mt-14 border-t border-moza-line pt-6 text-center text-xs text-moza-slate">
            Processamento local no navegador (excepto EACT, que passa pelo servidor).
          </footer>

        </div>

      </main>

    </div>
  </div>
);

}
