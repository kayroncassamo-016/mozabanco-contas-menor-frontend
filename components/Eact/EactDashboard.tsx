

"use client";

import { Building2, Unlink, Users, CheckCircle2, Clock } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import type { EactPlanoResult, EactRawResult } from "@/lib/parseEACT";
import KpiCard from "../KpiCard";

const RED = "#D0021B";
const INK = "#1B1918";
const LINE = "#E7E1D8";

function tooltipFormatter(v: unknown) {
  return typeof v === "number" ? v.toLocaleString("pt-PT") : String(v ?? "");
}

export default function EactDashboard({ plano, raw }: { plano: EactPlanoResult; raw: EactRawResult }) {
  const encerradas = plano.metrics.find((m) => m.key === "encerradas")!;
  const soltas = plano.metrics.find((m) => m.key === "entidadesSoltas")!;

  const composicao = [
    { name: "Encerradas", value: raw.encerradas, fill: RED },
    { name: "Entidades Soltas", value: raw.entidadesSoltas, fill: INK },
  ];
  const barData = [
    { name: "Encerradas", value: raw.encerradas },
    { name: "Entidades Soltas", value: raw.entidadesSoltas },
  ];
  const trendEncerradas = encerradas.series.slice(-8).map((p) => ({ label: p.sub, value: p.value }));
  const trendSoltas = soltas.series.slice(-8).map((p) => ({ label: p.sub, value: p.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 rounded-2xl border border-moza-line bg-white px-6 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-moza-slate">Folha detectada</p>
          <p className="font-display font-semibold text-moza-ink">{plano.sheetName}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-wide text-moza-slate">Semana calculada</p>
          <p className="font-display font-semibold text-moza-red">{plano.targetPeriod ?? "não identificado"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Encerradas" value={encerradas.current} 
        deltaPct={encerradas.deltaPct} icon={Building2} accent="red" emphasis />
        <KpiCard label="Entidades Soltas" 
          value={soltas.current} 
          deltaPct={soltas.deltaPct} 
          icon={Unlink} accent="ink" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total Entidades EACT" value={raw.totalEntidades} deltaPct={null} icon={Users} accent="ink" emphasis />
        <KpiCard label="Fiabilizadas" value={raw.fiabilizadas} deltaPct={null} icon={CheckCircle2} accent="red" />
        <KpiCard label="Por fiabilizar" value={raw.porFiabilizar} deltaPct={null} icon={Clock} accent="ink" />
      </div>

      <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
        <p className="font-display text-sm font-semibold text-moza-ink">Fiabilizadas vs. Por fiabilizar</p>
        <p className="text-xs text-moza-slate">Dentro do Total de Entidades EACT ({raw.totalEntidades.toLocaleString("pt-PT")})</p>
        <div className="mt-2 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: "Fiabilizadas", value: raw.fiabilizadas, fill: RED },
                  { name: "Por fiabilizar", value: raw.porFiabilizar, fill: INK },
                ]}
                dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3} strokeWidth={0}
              >
                <Cell fill={RED} />
                <Cell fill={INK} />
              </Pie>
              <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">Composição</p>
          <p className="text-xs text-moza-slate">Encerradas vs. Entidades Soltas</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={composicao} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                  {composicao.map((e, i) => (<Cell key={i} fill={e.fill} />))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
          <p className="font-display text-sm font-semibold text-moza-ink">Comparação</p>
          <p className="text-xs text-moza-slate">{plano.targetPeriod}</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid vertical={false} stroke={LINE} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={{ stroke: LINE }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill={RED} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[{ title: "Evolução de Encerradas", data: trendEncerradas }, { title: "Evolução de Entidades Soltas", data: trendSoltas }].map((t, i) => (
          <div key={i} className="rounded-2xl border border-moza-line bg-white p-5 shadow-card">
            <p className="font-display text-sm font-semibold text-moza-ink">{t.title}</p>
            <p className="text-xs text-moza-slate">Últimos {t.data.length} períodos disponíveis</p>
            <div className="mt-2 h-56">
              {t.data.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={t.data}>
                    <defs>
                      <linearGradient id={`fillEact${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={RED} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={RED} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={LINE} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={{ stroke: LINE }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#6B6864" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                    <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }} />
                    <Area type="monotone" dataKey="value" stroke={RED} strokeWidth={2.5} fill={`url(#fillEact${i})`} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-moza-slate">
                  Só há um período preenchido — carregue mais semanas para ver a evolução.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-moza-slate">Ficheiro EACT bruto: {raw.totalBruto.toLocaleString("pt-PT")} linhas processadas.</p>
    </div>
  );
}
