

// "use client";

// import { useState } from "react";
// import Image from "next/image";
// import mozaLogo from "@/components/images/moza.png";
// import ContasMenorModule from "@/components/Contas menor/ContasMenorModule";
// import AssinantesModule from "@/components/Assinantes/AssinantesModule";
// import UssdModule from "@/components/Ussd/UssdModule";
// import IrregularesModule from "@/components/Irregulares WF/IrregularesModule";

// type ModuleKey = "contasMenor" | "assinantes" | "ussd" | "irregulares";

// const MODULES: { key: ModuleKey; label: string }[] = [
//   { key: "contasMenor", label: "Contas Menor" },
//   { key: "assinantes", label: "Clientes sem assinantes" },
//   { key: "ussd", label: "USSD Moza Já" },
//   { key: "irregulares", label: "Irregulares no WF" },
// ];

// export default function Home() {
//   const [activeModule, setActiveModule] = useState<ModuleKey>("contasMenor");

//   return (
//     <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
//       <header className="mb-8 flex items-center justify-between">
//         <div className="flex items-center gap-2.5">
//           <Image src={mozaLogo} alt="mozabanco" width={36} height={36} />
//         </div>
//         <span className="rounded-full border border-moza-line bg-white px-3 py-1 text-xs font-medium text-moza-slate">
//           DCC · Automações
//         </span>
//       </header>

//       <nav className="mb-10 flex gap-2 rounded-full border border-moza-line bg-white p-1 shadow-card w-fit">
//         {MODULES.map((m) => (
//           <button
//             key={m.key}
//             type="button"
//             onClick={() => setActiveModule(m.key)}
//             className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
//               activeModule === m.key
//                 ? "bg-moza-red text-white"
//                 : "text-moza-slate hover:bg-moza-redSoft hover:text-moza-red"
//             }`}
//           >
//             {m.label}
//           </button>
//         ))}
//       </nav>

//       {/*
//         IMPORTANTE: os 3 módulos ficam sempre montados (nunca desaparecem da
//         árvore); só escondemos visualmente com "hidden". Isto preserva o
//         estado (ficheiros carregados, dashboard) de cada módulo ao trocar de
//         aba — trocar de aba NUNCA apaga o que já estava carregado nela.
//         Cada módulo é independente: não partilham nenhum ficheiro entre si.
//       */}
//       <div className={activeModule === "contasMenor" ? "" : "hidden"}>
//         <ContasMenorModule />
//       </div>
//       <div className={activeModule === "assinantes" ? "" : "hidden"}>
//         <AssinantesModule />
//       </div>
//       <div className={activeModule === "ussd" ? "" : "hidden"}>
//         <UssdModule />
//       </div>
//       <div className={activeModule === "irregulares" ? "" : "hidden"}>
//         <IrregularesModule />
//       </div>

//       <footer className="mt-14 border-t border-moza-line pt-6 text-center text-xs text-moza-slate">
//         Todo o processamento acontece localmente no seu navegador — nenhum dado é enviado para um servidor.
//       </footer>
//     </main>
//   );
// }

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
  { key: "eact", label: "EACT Mensal", icon: Building2 },
];

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleKey>("contasMenor");
  const active = MODULES.find((m) => m.key === activeModule)!;

  // return (
  //   <div className="flex min-h-screen bg-moza-paper">
  //     {/* Sidebar */}
  //     <aside className="hidden w-64 shrink-0 flex-col border-r border-moza-line bg-white lg:flex">
  //       <div className="flex items-center gap-2.5 px-6 py-6">
  //         <Image src={mozaLogo} alt="mozabanco" width={32} height={32} />
  //         <div>
  //           <p className="font-display text-sm font-semibold text-moza-ink">DCC</p>
  //           <p className="text-xs text-moza-slate">Automações</p>
  //         </div>
  //       </div>

  //       <nav className="flex-1 space-y-1 px-3">
  //         {MODULES.map((m) => {
  //           const Icon = m.icon;
  //           const isActive = activeModule === m.key;
  //           return (
  //             <button
  //               key={m.key}
  //               type="button"
  //               onClick={() => setActiveModule(m.key)}
  //               className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
  //                 isActive
  //                   ? "bg-moza-red text-white shadow-card"
  //                   : "text-moza-slate hover:bg-moza-redSoft hover:text-moza-red"
  //               }`}
  //             >
  //               <Icon className="h-4 w-4 shrink-0" />
  //               <span className="text-left">{m.label}</span>
  //             </button>
  //           );
  //         })}
  //       </nav>

  //       <div className="border-t border-moza-line px-6 py-4">
  //         <p className="text-[11px] leading-relaxed text-moza-slate">
  //           Processamento local no navegador. O EACT (ficheiro grande) é a
  //           única excepção — passa pelo servidor por limitação técnica.
  //         </p>
  //       </div>
  //     </aside>

  //     {/* Conteúdo */}
  //     <div className="flex min-w-0 flex-1 flex-col">
  //       {/* Top bar */}
  //       <header className="sticky top-0 z-10 flex items-center justify-between border-b border-moza-line bg-white/80 px-5 py-4 backdrop-blur sm:px-8">
  //         <div className="flex items-center gap-2 lg:hidden">
  //           <Image src={mozaLogo} alt="mozabanco" width={28} height={28} />
  //         </div>
  //         <div className="hidden items-center gap-2 lg:flex">
  //           <active.icon className="h-4 w-4 text-moza-red" />
  //           <span className="font-display text-sm font-semibold text-moza-ink">{active.label}</span>
  //         </div>
  //         <span className="rounded-full border border-moza-line bg-white px-3 py-1 text-xs font-medium text-moza-slate">
  //           DCC · Automações
  //         </span>
  //       </header>

  //       {/* Nav mobile (pills) */}
  //       <nav className="flex gap-2 overflow-x-auto border-b border-moza-line bg-white px-5 py-3 lg:hidden">
  //         {MODULES.map((m) => (
  //           <button
  //             key={m.key}
  //             type="button"
  //             onClick={() => setActiveModule(m.key)}
  //             className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
  //               activeModule === m.key
  //                 ? "bg-moza-red text-white"
  //                 : "text-moza-slate hover:bg-moza-redSoft hover:text-moza-red"
  //             }`}
  //           >
  //             {m.label}
  //           </button>
  //         ))}
  //       </nav>

  //       <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
  //         {/*
  //           Os 5 módulos ficam sempre montados; só escondemos visualmente com
  //           "hidden". Preserva o estado de cada módulo ao trocar de aba.
  //           Cada módulo é independente: não partilham ficheiros entre si.
  //         */}
  //         <div className={activeModule === "contasMenor" ? "" : "hidden"}>
  //           <ContasMenorModule />
  //         </div>
  //         <div className={activeModule === "assinantes" ? "" : "hidden"}>
  //           <AssinantesModule />
  //         </div>
  //         <div className={activeModule === "ussd" ? "" : "hidden"}>
  //           <UssdModule />
  //         </div>
  //         <div className={activeModule === "irregulares" ? "" : "hidden"}>
  //           <IrregularesModule />
  //         </div>
  //         <div className={activeModule === "eact" ? "" : "hidden"}>
  //           <EactModule />
  //         </div>

  //         <footer className="mt-14 border-t border-moza-line pt-6 text-center text-xs text-moza-slate">
  //           Processamento local no navegador (excepto EACT, que passa pelo servidor).
  //         </footer>
  //       </main>
  //     </div>
  //   </div>
  // );
// return (
//   <div className="flex h-screen overflow-hidden bg-white">

//     {/* Sidebar */}
//     <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-moza-line bg-white lg:flex">

//       {/* Logo / título */}
//       <div className="shrink-0 border-b border-moza-line px-6 py-5">
//         <div className="flex items-center gap-3">
//           <Image
//             src={mozaLogo}
//             alt="mozabanco"
//             width={32}
//             height={32}
//           />

//           <div>
//             <p className="font-display text-sm font-bold text-moza-ink">
//               DCC
//             </p>
//             <p className="text-xs text-moza-slate">
//               Automações
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Menu com scroll independente */}
//       <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
//         <div className="space-y-1">
//           {MODULES.map((m) => {
//             const Icon = m.icon;
//             const isActive = activeModule === m.key;

//             return (
//               <button
//                 key={m.key}
//                 type="button"
//                 onClick={() => setActiveModule(m.key)}
//                 className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
//                   isActive
//                     ? "bg-moza-red text-white shadow-card"
//                     : "text-moza-slate hover:bg-moza-redSoft hover:text-moza-red"
//                 }`}
//               >
//                 <Icon className="h-4 w-4 shrink-0" />
//                 <span className="text-left">
//                   {m.label}
//                 </span>
//               </button>
//             );
//           })}
//         </div>
//       </nav>

//       {/* Footer do sidebar */}
//       <div className="shrink-0 border-t border-moza-line px-6 py-4">
//         <p className="text-[11px] leading-relaxed text-moza-slate">
//           Processamento local no navegador. O EACT (ficheiro grande) é a
//           única excepção — passa pelo servidor por limitação técnica.
//         </p>
//       </div>
//     </aside>

//     {/* Área principal */}
//     <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">

//       {/* Top bar */}
//       <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-moza-line bg-white/80 px-5 py-4 backdrop-blur sm:px-8">

//         <div className="flex items-center gap-2 lg:hidden">
//           <Image
//             src={mozaLogo}
//             alt="mozabanco"
//             width={28}
//             height={28}
//           />
//         </div>

//         <div className="hidden items-center gap-2 lg:flex">
//           <active.icon className="h-4 w-4 text-moza-red" />
//           <span className="font-display text-sm font-semibold text-moza-ink">
//             {active.label}
//           </span>
//         </div>

//         <span className="rounded-full border border-moza-line bg-white px-3 py-1 text-xs font-medium text-moza-slate">
//           DCC · Automações
//         </span>
//       </header>

//       {/* Scroll SOMENTE aqui */}
//       <main className="min-h-0 flex-1 overflow-y-auto">
//         <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">

//           <div className={activeModule === "contasMenor" ? "" : "hidden"}>
//             <ContasMenorModule />
//           </div>

//           <div className={activeModule === "assinantes" ? "" : "hidden"}>
//             <AssinantesModule />
//           </div>

//           <div className={activeModule === "ussd" ? "" : "hidden"}>
//             <UssdModule />
//           </div>

//           <div className={activeModule === "irregulares" ? "" : "hidden"}>
//             <IrregularesModule />
//           </div>

//           <div className={activeModule === "eact" ? "" : "hidden"}>
//             <EactModule />
//           </div>

//           <footer className="mt-14 border-t border-moza-line pt-6 text-center text-xs text-moza-slate">
//             Processamento local no navegador (excepto EACT, que passa pelo servidor).
//           </footer>

//         </div>
//       </main>

//     </div>
//   </div>
// );

// return (
//   <div className="flex h-screen overflow-hidden bg-white">

//     {/* Overlay mobile */}
//     {sidebarOpen && (
//       <button
//         type="button"
//         aria-label="Fechar menu"
//         onClick={() => setSidebarOpen(false)}
//         className="fixed inset-0 z-40 bg-black/30 lg:hidden"
//       />
//     )}

//     {/* Sidebar */}
//     <aside
//       className={`
//         fixed inset-y-0 left-0 z-50 flex h-screen w-72
//         flex-col border-r border-moza-line bg-white
//         shadow-xl transition-transform duration-200
//         lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:shadow-none
//         ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
//       `}
//     >
//       {/* Header do sidebar */}
//       <div className="shrink-0 border-b border-moza-line px-6 py-5">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <Image
//               src={mozaLogo}
//               alt="mozabanco"
//               width={32}
//               height={32}
//             />

//             <div>
//               <p className="font-display text-sm font-bold text-moza-ink">
//                 DCC
//               </p>
//               <p className="text-xs text-moza-slate">
//                 Automações
//               </p>
//             </div>
//           </div>

//           {/* Botão fechar — apenas mobile */}
//           <button
//             type="button"
//             aria-label="Fechar menu"
//             onClick={() => setSidebarOpen(false)}
//             className="flex h-8 w-8 items-center justify-center rounded-lg text-moza-slate transition-colors hover:bg-moza-redSoft hover:text-moza-red lg:hidden"
//           >
//             <X className="h-5 w-5" />
//           </button>
//         </div>
//       </div>

//       {/* Menu do sidebar */}
//       <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
//         <div className="space-y-1">
//           {MODULES.map((m) => {
//             const Icon = m.icon;
//             const isActive = activeModule === m.key;

//             return (
//               <button
//                 key={m.key}
//                 type="button"
//                 onClick={() => {
//                   setActiveModule(m.key);
//                   setSidebarOpen(false);
//                 }}
//                 className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
//                   isActive
//                     ? "bg-moza-red text-white shadow-card"
//                     : "text-moza-slate hover:bg-moza-redSoft hover:text-moza-red"
//                 }`}
//               >
//                 <Icon className="h-4 w-4 shrink-0" />
//                 <span className="text-left">
//                   {m.label}
//                 </span>
//               </button>
//             );
//           })}
//         </div>
//       </nav>

//       {/* Footer do sidebar */}
//       <div className="shrink-0 border-t border-moza-line px-6 py-4">
//         <p className="text-[11px] leading-relaxed text-moza-slate">
//           Processamento local no navegador. O EACT (ficheiro grande) é a
//           única excepção — passa pelo servidor por limitação técnica.
//         </p>
//       </div>
//     </aside>

//     {/* Área principal */}
//     <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">

//       {/* Top bar */}
//       <header className="z-10 flex shrink-0 items-center justify-between border-b border-moza-line bg-white/80 px-5 py-4 backdrop-blur sm:px-8">

//         {/* Mobile */}
//         <div className="flex items-center gap-3 lg:hidden">
//           <button
//             type="button"
//             aria-label="Abrir menu"
//             onClick={() => setSidebarOpen(true)}
//             className="flex h-9 w-9 items-center justify-center rounded-lg text-moza-slate transition-colors hover:bg-moza-redSoft hover:text-moza-red"
//           >
//             <Menu className="h-5 w-5" />
//           </button>

//           <Image
//             src={mozaLogo}
//             alt="mozabanco"
//             width={28}
//             height={28}
//           />
//         </div>

//         {/* Desktop */}
//         <div className="hidden items-center gap-2 lg:flex">
//           <active.icon className="h-4 w-4 text-moza-red" />
//           <span className="font-display text-sm font-semibold text-moza-ink">
//             {active.label}
//           </span>
//         </div>

//         <span className="rounded-full border border-moza-line bg-white px-3 py-1 text-xs font-medium text-moza-slate">
//           DCC · Automações
//         </span>
//       </header>

//       {/* Nav mobile */}
//       <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-moza-line bg-white px-5 py-3 lg:hidden">
//         {MODULES.map((m) => (
//           <button
//             key={m.key}
//             type="button"
//             onClick={() => setActiveModule(m.key)}
//             className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
//               activeModule === m.key
//                 ? "bg-moza-red text-white"
//                 : "text-moza-slate hover:bg-moza-redSoft hover:text-moza-red"
//             }`}
//           >
//             {m.label}
//           </button>
//         ))}
//       </nav>

//       {/* Conteúdo com scroll próprio */}
//       <main className="min-h-0 flex-1 overflow-y-auto">
//         <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">

//           {/* Contas Menor */}
//           <div className={activeModule === "contasMenor" ? "" : "hidden"}>
//             <ContasMenorModule />
//           </div>

//           {/* Clientes sem assinantes */}
//           <div className={activeModule === "assinantes" ? "" : "hidden"}>
//             <AssinantesModule />
//           </div>

//           {/* USSD */}
//           <div className={activeModule === "ussd" ? "" : "hidden"}>
//             <UssdModule />
//           </div>

//           {/* Irregulares no WF */}
//           <div className={activeModule === "irregulares" ? "" : "hidden"}>
//             <IrregularesModule />
//           </div>

//           {/* EACT */}
//           <div className={activeModule === "eact" ? "" : "hidden"}>
//             <EactModule />
//           </div>

//           {/* Footer */}
//           <footer className="mt-14 border-t border-moza-line pt-6 text-center text-xs text-moza-slate">
//             Processamento local no navegador (excepto EACT, que passa pelo servidor).
//           </footer>

//         </div>
//       </main>
//     </div>
//   </div>
// );

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
