"use client";

import { Users, Filter, Copy, Building2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import type { AssinantesPlanoResult, AssinantesRawResult } from "@/lib/parseAssinantes";
import KpiCard from "../KpiCard";

const RED = "#D0021B";
const GOLD = "#E8A33D";
const INK = "#1B1918";
const LINE = "#E7E1D8";

function tooltipFormatter(v: unknown) {
  return typeof v === "number" ? v.toLocaleString("pt-PT") : String(v ?? "");
}

export default function AssinantesDashboard({
  plano,
  raw,
}: {
  plano: AssinantesPlanoResult;
  raw: AssinantesRawResult;
}) {
  const semAssinantes = plano.metrics.find((m) => m.key === "semAssinantes")!;

  const funil = [
    { name: "Ficheiro\nbruto", value: raw.totalBruto },
    { name: "Classe DO\n(sem CCO)", value: raw.aposFiltroDO },
    { name: "Sem contas\ninternas (CI)", value: raw.semCI },
    { name: "Sem\nduplicados", value: raw.semDuplicados },
    { name: "Resultado\nfinal", value: raw.final },
  ];

  const composicao = [
    { name: "Clientes sem assinantes", value: raw.final, fill: RED },
    { name: "Excluídas pelos filtros", value: Math.max(raw.totalBruto - raw.final, 0), fill: INK },
  ];

  const trend = semAssinantes.series.slice(-8).map((p) => ({ label: p.sub, value: p.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 rounded-2xl border border-moza-line bg-white px-6 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-moza-slate">Folha detectada</p>
          <p className="font-display font-semibold text-moza-ink">{plano.sheetName}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-wide text-moza-slate">Semana calculada</p>
          <p className="font-display font-semibold text-moza-red">
            {plano.targetPeriod ?? "não identificado"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Ficheiro bruto" value={raw.totalBruto} deltaPct={null} icon={Building2} accent="ink" />
        <KpiCard label="Classe DO (sem CCO)" value={raw.aposFiltroDO} deltaPct={null} icon={Filter} accent="ink" />
        <KpiCard label="Sem contas internas" value={raw.semCI} deltaPct={null} icon={Filter} accent="ink" />
        <KpiCard label="Sem duplicados" value={raw.semDuplicados} deltaPct={null} icon={Copy} accent="ink" />
        <KpiCard
          label="Clientes sem assinantes"
          value={semAssinantes.current}
          deltaPct={semAssinantes.deltaPct}
          icon={Users}
          accent="red"
          emphasis
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">Composição do ficheiro bruto</p>
          <p className="text-xs text-moza-slate">Clientes sem assinantes vs. excluídos pelos filtros</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={composicao}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {composicao.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex justify-center gap-4 text-xs text-moza-slate">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-moza-red" /> Sem assinantes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-moza-ink" /> Excluídas
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">Funil de filtragem</p>
          <p className="text-xs text-moza-slate">{plano.targetPeriod}</p>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funil}>
                <CartesianGrid vertical={false} stroke={LINE} />
                <XAxis
                  dataKey="name"
                  tick={({ x, y, payload }) => {
                    const lines = String(payload.value).split("\n");
                    return (
                      <text x={x} y={y + 10} textAnchor="middle" fill="#6B6864" fontSize={11}>
                        {lines.map((line: string, i: number) => (
                          <tspan key={i} x={x} dy={i === 0 ? 0 : 14}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    );
                  }}
                  axisLine={{ stroke: LINE }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill={GOLD} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
        <p className="font-display text-sm font-semibold text-moza-ink">
          Evolução de &ldquo;Cliente sem assinantes&rdquo;
        </p>
        <p className="text-xs text-moza-slate">
          Últimos {trend.length} períodos disponíveis no ficheiro
        </p>
        <div className="mt-2 h-64">
          {trend.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="fillTrendAssinantes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={RED} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={RED} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={LINE} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={{ stroke: LINE }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="value" stroke={RED} strokeWidth={2.5} fill="url(#fillTrendAssinantes)" />
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
