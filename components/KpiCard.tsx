import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

interface Props {
  label: string;
  value: number | null;
  deltaPct: number | null;
  icon: LucideIcon;
  accent: "red" | "ink" | "gold";
  emphasis?: boolean;
}

const accentMap = {
  red: "bg-moza-red text-white",
  ink: "bg-moza-ink text-white",
  gold: "bg-moza-gold text-white",
};

export default function KpiCard({
  label,
  value,
  deltaPct,
  icon: Icon,
  accent,
  emphasis,
}: Props) {
  const hasDelta = deltaPct !== null && Number.isFinite(deltaPct);
  const isUp = hasDelta && (deltaPct as number) > 0.0001;
  const isDown = hasDelta && (deltaPct as number) < -0.0001;

  return (
    <div
      className={`rounded-2xl border border-moza-line bg-white p-5 shadow-card ${
        emphasis ? "ring-1 ring-moza-red/20" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentMap[accent]}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        {hasDelta && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              isUp
                ? "bg-red-50 text-moza-red"
                : isDown
                ? "bg-emerald-50 text-emerald-600"
                : "bg-moza-paper text-moza-slate"
            }`}
          >
            {isUp ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : isDown ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs((deltaPct as number) * 100).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="mt-4 font-mono text-3xl font-semibold tracking-tight text-moza-ink">
        {value === null ? "—" : value.toLocaleString("pt-PT")}
      </p>
      <p className="mt-1 text-sm text-moza-slate">{label}</p>
    </div>
  );
}
