interface Props {
  proximos3m: number | null;
  superior3m: number | null;
}

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 86;
const STROKE = 14;

function polar(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function arcPath(startDeg: number, endDeg: number, r: number) {
  const start = polar(startDeg, r);
  const end = polar(endDeg, r);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function MajorityClock({ proximos3m, superior3m }: Props) {
  const porAtingir = (proximos3m ?? 0) + (superior3m ?? 0);
  const pct = porAtingir > 0 ? (proximos3m ?? 0) / porAtingir : 0;
  const sweep = pct * 360;

  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <div className="flex flex-col items-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Clock ticks — each represents one month, the dial the account's countdown to majority */}
        {ticks.map((deg) => {
          const isQuarter = deg % 90 === 0;
          const outer = polar(deg, RADIUS + STROKE / 2 + 6);
          const inner = polar(deg, RADIUS + STROKE / 2 + (isQuarter ? 0 : 2));
          return (
            <line
              key={deg}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={isQuarter ? "#1B1918" : "#E7E1D8"}
              strokeWidth={isQuarter ? 2.5 : 1.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Track */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="#F3EEE6"
          strokeWidth={STROKE}
        />

        {/* Filled arc: share of "por atingir maioridade" that turns 18 within 3 months */}
        {sweep > 0 && (
          <path
            d={arcPath(0, Math.min(sweep, 359.9), RADIUS)}
            fill="none"
            stroke="#D0021B"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        )}

        {/* 3-month marker (quarter mark at 90deg) */}
        <text
          x={CENTER}
          y={CENTER - 6}
          textAnchor="middle"
          className="font-mono"
          fontSize="30"
          fontWeight={600}
          fill="#1B1918"
        >
          {Math.round(pct * 100)}%
        </text>
        <text
          x={CENTER}
          y={CENTER + 18}
          textAnchor="middle"
          fontSize="11"
          fill="#6B6864"
        >
          fazem 18 anos em breve
        </text>
      </svg>

      <div className="mt-2 flex items-center gap-4 text-xs text-moza-slate">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-moza-red" />
          Próximos 3 meses
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#F3EEE6] ring-1 ring-moza-line" />
          Superior a 3 meses
        </span>
      </div>
    </div>
  );
}
