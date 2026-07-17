export function ProgressRing({
  value,
  goal,
  size = 220,
  stroke = 14,
}: {
  value: number;
  goal: number;
  size?: number;
  stroke?: number;
}) {
  const pct = Math.min(1, value / goal);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="chalio-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#EA4335" />
            <stop offset="35%" stopColor="#FBBC04" />
            <stop offset="70%" stopColor="#34A853" />
            <stop offset="100%" stopColor="#4285F4" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#chalio-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold tabular-nums text-slate-900">
          {value.toLocaleString()}
        </span>
        <span className="mt-1 text-xs font-semibold tracking-wide text-slate-400">
          of {goal.toLocaleString()} steps
        </span>
      </div>
    </div>
  );
}
