
"use client";

import { Users, CalendarCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { UssdResult, UssdPlanoResult } from "@/lib/parseUSSD";
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

export default function UssdDashboard({
  plano,
  raw,
}: {
  plano: UssdPlanoResult;
  raw: UssdResult;
}) {
  const servicosSemana = plano.metrics.find((m) => m.key === "servicosSemana")!;
  const divergentes = plano.metrics.find((m) => m.key === "divergentes")!;
  const convergentes = plano.metrics.find((m) => m.key === "convergentes")!;

  const composicao = [
    { name: "Convergentes", value: raw.convergentes, fill: RED },
    { name: "Divergentes", value: raw.divergentes, fill: INK },
  ];

  const trend = servicosSemana.series.slice(-8).map((p) => ({ label: p.sub, value: p.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 rounded-2xl border border-moza-line bg-white px-6 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-moza-slate">Janela calculada no ficheiro USSD</p>
          <p className="font-display font-semibold text-moza-ink">
            {fmtPt(raw.inicioSemana)} — {fmtPt(raw.refDate)}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-wide text-moza-slate">Semana no Plano de Actividades</p>
          <p className="font-display font-semibold text-moza-red">
            {plano.targetPeriod ?? "não identificado"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total de serviços" value={raw.totalServicos} deltaPct={null} icon={Users} accent="ink" />
        <KpiCard
          label="Serviços da semana"
          value={servicosSemana.current}
          deltaPct={servicosSemana.deltaPct}
          icon={CalendarCheck}
          accent="red"
          emphasis
        />
        <KpiCard
          label="Convergentes"
          value={convergentes.current}
          deltaPct={convergentes.deltaPct}
          icon={CheckCircle2}
          accent="ink"
        />
        <KpiCard
          label="Divergentes"
          value={divergentes.current}
          deltaPct={divergentes.deltaPct}
          icon={AlertTriangle}
          accent="gold"
        />
        <KpiCard 
          label="Convergentes (universo total)" 
          value={raw.convergentesTotal} 
          deltaPct={null} 
          icon={CheckCircle2} 
          accent="ink" 
        />
        <KpiCard 
          label="Divergentes (universo total)" 
          value={raw.divergentesTotal} 
          deltaPct={null} 
          icon={AlertTriangle} 
          accent="gold" 
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">Convergentes vs. Divergentes</p>
          <p className="text-xs text-moza-slate">Dentro dos {raw.servicosSemana} serviços da semana</p>
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
          <div className="mt-1 flex justify-center gap-4 text-xs text-moza-slate">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-moza-red" /> Convergentes</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-moza-ink" /> Divergentes</span>
          </div>
        </div>

        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">Adesões por dia (semana)</p>
          <p className="text-xs text-moza-slate">{fmtPt(raw.inicioSemana)} — {fmtPt(raw.refDate)}</p>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={raw.serieDiaria}>
                <CartesianGrid vertical={false} stroke={LINE} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={{ stroke: LINE }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill={GOLD} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {raw.divergentes > 0 && (
        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">
            Entidades divergentes (COD_ENT)
          </p>
          <p className="text-xs text-moza-slate">
            {raw.divergentesEntidades.length} contactos divergentes nesta semana
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {raw.divergentesEntidades.map((cod, i) => (
              <span
                key={`${cod}-${i}`}
                className="rounded-full bg-moza-paper px-3 py-1 font-mono text-xs text-moza-ink ring-1 ring-moza-line"
              >
                {cod}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
        <p className="font-display text-sm font-semibold text-moza-ink">
          Evolução de &ldquo;Serviços da semana&rdquo;
        </p>
        <p className="text-xs text-moza-slate">
          Últimos {trend.length} períodos disponíveis no Plano de Actividades
        </p>
        <div className="mt-2 h-64">
          {trend.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="fillTrendUssd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={RED} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={RED} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={LINE} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={{ stroke: LINE }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke={RED} strokeWidth={2.5} fill="url(#fillTrendUssd)" />
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
