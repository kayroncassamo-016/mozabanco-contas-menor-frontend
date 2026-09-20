"use client";

import {
  Users,
  UserCheck,
  Hourglass,
  AlarmClockCheck,
  CalendarClock,
} from "lucide-react";
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
import type { ParsedResult } from "@/lib/parsePlano";
import KpiCard from "../KpiCard";
import MajorityClock from "../MajorityClock";

const RED = "#D0021B";
const GOLD = "#E8A33D";
const INK = "#1B1918";
const LINE = "#E7E1D8";

function metric(result: ParsedResult, key: string) {
  return result.metrics.find((m) => m.key === key)!;
}

export default function Dashboard({ result }: { result: ParsedResult }) {
  const total = metric(result, "total");
  const atingida = metric(result, "atingida");
  const porAtingir = metric(result, "porAtingir");
  const proximos3m = metric(result, "proximos3m");
  const superior3m = metric(result, "superior3m");

  const composicao = [
    { name: "Com maioridade atingida", value: atingida.current ?? 0, fill: RED },
    { name: "Por atingir maioridade", value: porAtingir.current ?? 0, fill: INK },
  ];

  const urgencia = [
    { name: "Nos próximos 3 meses", value: proximos3m.current ?? 0, fill: RED },
    { name: "Superior a 3 meses", value: superior3m.current ?? 0, fill: GOLD },
  ];



   const barData = [
    { name: "Maioridade\n\natingida", value: atingida.current ?? 0 },
    { name: "Por atingir\nmaioridade", value: porAtingir.current ?? 0 },
    { name: "Próx.\n3 meses", value: proximos3m.current ?? 0 },
    { name: "Superior a\n3 meses", value: superior3m.current ?? 0 },
  ];

  const trend = total.series.slice(-8).map((p) => ({
    label: p.sub,
    value: p.value,
  }));

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex flex-col gap-1 rounded-2xl border border-moza-line bg-white px-6 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-moza-slate">
            Folha detectada
          </p>
          <p className="font-display font-semibold text-moza-ink">
            {result.sheetName}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-wide text-moza-slate">
            Período mais recente
          </p>
          <p className="font-display font-semibold text-moza-red">
            {result.reportPeriod ?? "não identificado"}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Contas Menor (total)"
          value={total.current}
          deltaPct={total.deltaPct}
          icon={Users}
          accent="ink"
          emphasis
        />
        <KpiCard
          label="Com maioridade atingida"
          value={atingida.current}
          deltaPct={atingida.deltaPct}
          icon={UserCheck}
          accent="red"
        />
        <KpiCard
          label="Por atingir maioridade"
          value={porAtingir.current}
          deltaPct={porAtingir.deltaPct}
          icon={Hourglass}
          accent="ink"
        />
        <KpiCard
          label="Nos próximos 3 meses"
          value={proximos3m.current}
          deltaPct={proximos3m.deltaPct}
          icon={AlarmClockCheck}
          accent="gold"
        />
        <KpiCard
          label="Superior a 3 meses"
          value={superior3m.current}
          deltaPct={superior3m.deltaPct}
          icon={CalendarClock}
          accent="ink"
        />
      </div>

      {/* Chart row 1: composition + urgency clock */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">
            Composição das Contas Menor
          </p>
          <p className="text-xs text-moza-slate">
            Maioridade atingida vs. ainda por atingir
          </p>
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
                  formatter={(v: number) => v.toLocaleString("pt-PT")}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${LINE}`,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex justify-center gap-4 text-xs text-moza-slate">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-moza-red" /> Atingida
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-moza-ink" /> Por atingir
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">
            Urgência dentro de &ldquo;Por atingir&rdquo;
          </p>
          <p className="text-xs text-moza-slate">
            Próximos 3 meses vs. superior a 3 meses
          </p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={urgencia}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {urgencia.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => v.toLocaleString("pt-PT")}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${LINE}`,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex justify-center gap-4 text-xs text-moza-slate">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-moza-red" /> ≤ 3 meses
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-moza-gold" /> &gt; 3 meses
            </span>
          </div>
        </div>

        {/* Signature element */}
        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">
            Relógio da Maioridade
          </p>
          <p className="text-xs text-moza-slate">
            % dos clientes &ldquo;por atingir&rdquo; que viram adultos em breve
          </p>
          <div className="mt-1 flex items-center justify-center">
            <MajorityClock
              proximos3m={proximos3m.current}
              superior3m={superior3m.current}
            />
          </div>
        </div>
      </div>

      {/* Chart row 2: bar comparison + trend */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">
            Comparação por categoria
          </p>
          <p className="text-xs text-moza-slate">{result.reportPeriod}</p>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid vertical={false} stroke={LINE} />
                {/* <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6B6864" }}
                  axisLine={{ stroke: LINE }}
                  tickLine={false}
                /> */}

                <XAxis
  dataKey="name"
  tick={({ x, y, payload }) => {
    const lines = payload.value.split("\n");

    return (
      <text
        x={x}
        y={y + 10}
        textAnchor="middle"
        fill="#6B6864"
        fontSize={11}
      >
        {lines.map((line: string, index: number) => (
          <tspan key={index} x={x} dy={index === 0 ? 0 : 14}>
            {line}
          </tspan>
        ))}
      </text>
    );
  }}
  axisLine={{ stroke: LINE }}
  tickLine={false}
/>
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B6864" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => v.toLocaleString("pt-PT")}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${LINE}`,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill={RED} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">
            Evolução de &ldquo;Contas Menor&rdquo;
          </p>
          <p className="text-xs text-moza-slate">
            Últimos {trend.length} períodos disponíveis no ficheiro
          </p>
          <div className="mt-2 h-64">
            {trend.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="fillTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={RED} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={RED} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={LINE} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#6B6864" }}
                    axisLine={{ stroke: LINE }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B6864" }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    formatter={(v: number) => v.toLocaleString("pt-PT")}
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${LINE}`,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={RED}
                    strokeWidth={2.5}
                    fill="url(#fillTrend)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-moza-slate">
                Este ficheiro só tem um período preenchido — carregue versões
                de semanas diferentes para ver a evolução.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
