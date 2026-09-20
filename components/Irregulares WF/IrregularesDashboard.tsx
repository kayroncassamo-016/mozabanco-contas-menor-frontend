
"use client";

import { Lock, Ban, Unlock, ShieldCheck, Layers } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import type { IrregularesPlanoResult, IrregularesRawResult } from "@/lib/parseIrregularesWF";
import KpiCard from "../KpiCard";

const RED = "#D0021B";
const GOLD = "#E8A33D";
const INK = "#1B1918";
const LINE = "#E7E1D8";

function tooltipFormatter(v: unknown) {
  return typeof v === "number" ? v.toLocaleString("pt-PT") : String(v ?? "");
}
function fmtPt(d: Date) {
  return d.toLocaleDateString("pt-PT");
}

export default function IrregularesDashboard({
  plano, raw,
}: { plano: IrregularesPlanoResult; raw: IrregularesRawResult }) {
  const bloqAntigo = plano.metrics.find((m) => m.key === "bloqueadasAntigo")!;
  const anuladasNovo = plano.metrics.find((m) => m.key === "anuladasNovo")!;
  const bloqNovo = plano.metrics.find((m) => m.key === "bloqueadasNovo")!;
  const condNovo = plano.metrics.find((m) => m.key === "condicionalismoNovo")!;

  const composicao = [
    { name: "Bloqueadas (WF actual)", value: raw.bloqueadasNovo, fill: RED },
    { name: "Anuladas (WF actual)", value: raw.anuladasNovo, fill: INK },
    { name: "Desbloqueadas c/ condicionalismo", value: raw.condicionalismoNovo, fill: GOLD },
  ];

  const barData = [
    { name: "Bloqueadas\nAntigo WF", value: raw.bloqueadasAntigo },
    { name: "Anuladas\nWF actual", value: raw.anuladasNovo },
    { name: "Bloqueadas\nWF actual", value: raw.bloqueadasNovo },
    { name: "Desbl. c/\ncondicionalismo", value: raw.condicionalismoNovo },
  ];

  const trend = bloqNovo.series.slice(-8).map((p) => ({ label: p.sub, value: p.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 rounded-2xl border border-moza-line bg-white px-6 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-moza-slate">Janela do condicionalismo (WF actual)</p>
          <p className="font-display font-semibold text-moza-ink">
            {fmtPt(raw.inicioJanela)} — {fmtPt(raw.refDate)}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-wide text-moza-slate">Semana no Plano de Actividades</p>
          <p className="font-display font-semibold text-moza-red">{plano.targetPeriod ?? "não identificado"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Irregulares no WF (antigo + actual)" value={raw.totalGeral} deltaPct={null} icon={Layers} accent="red" emphasis />
        <KpiCard label="Irregulares — Antigo WF" value={raw.totalAntigo} deltaPct={null} icon={ShieldCheck} accent="ink" />
        <KpiCard label="Irregulares — WF actual" value={raw.totalNovo} deltaPct={null} icon={ShieldCheck} accent="ink" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Bloqueadas (Antigo WF)" value={bloqAntigo.current} deltaPct={bloqAntigo.deltaPct} icon={Lock} accent="ink" />
        <KpiCard label="Anuladas (WF actual)" value={anuladasNovo.current} deltaPct={anuladasNovo.deltaPct} icon={Ban} accent="gold" />
        <KpiCard label="Bloqueadas (WF actual)" value={bloqNovo.current} deltaPct={bloqNovo.deltaPct} icon={Lock} accent="red" emphasis />
        <KpiCard label="Desbl. c/ condicionalismo" value={condNovo.current} deltaPct={condNovo.deltaPct} icon={Unlock} accent="ink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">Composição (WF actual)</p>
          <p className="text-xs text-moza-slate">Bloqueadas vs. Anuladas vs. Desbloqueadas c/ condicionalismo</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={composicao} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                  {composicao.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">Comparação por categoria</p>
          <p className="text-xs text-moza-slate">{plano.targetPeriod}</p>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid vertical={false} stroke={LINE} />
                <XAxis
                  dataKey="name"
                  tick={({ x, y, payload }) => {
                    const lines = String(payload.value).split("\n");
                    return (
                      <text x={x} y={y + 10} textAnchor="middle" fill="#6B6864" fontSize={11}>
                        {lines.map((line: string, i: number) => (<tspan key={i} x={x} dy={i === 0 ? 0 : 14}>{line}</tspan>))}
                      </text>
                    );
                  }}
                  axisLine={{ stroke: LINE }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill={RED} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
        <p className="font-display text-sm font-semibold text-moza-ink">Evolução de &ldquo;Bloqueadas (WF actual)&rdquo;</p>
        <p className="text-xs text-moza-slate">Últimos {trend.length} períodos disponíveis no Plano de Actividades</p>
        <div className="mt-2 h-64">
          {trend.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="fillTrendIrreg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={RED} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={RED} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={LINE} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={{ stroke: LINE }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke={RED} strokeWidth={2.5} fill="url(#fillTrendIrreg)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-moza-slate">
              Este ficheiro só tem um período preenchido — carregue versões de semanas diferentes para ver a evolução.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
