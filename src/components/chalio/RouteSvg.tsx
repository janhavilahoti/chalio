/**
 * Draws a recorded GPS path as a clean SVG polyline over a subtle grid
 * background, styled with Chalio brand colors. Used on the share card
 * (OpenStreetMap doesn't offer a free static-image API).
 */
export function RouteSvg({
  path,
  className,
  height = 260,
}: {
  path: Array<{ lat: number; lng: number }>;
  className?: string;
  height?: number;
}) {
  const width = 600;
  const pad = 32;

  if (!path || path.length < 2) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-slate-900 text-xs text-slate-400 ${className ?? ""}`}
        style={{ height }}
      >
        No route recorded
      </div>
    );
  }

  const lats = path.map((p) => p.lat);
  const lngs = path.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const rangeLat = Math.max(maxLat - minLat, 0.00005);
  const rangeLng = Math.max(maxLng - minLng, 0.00005);
  // Preserve aspect ratio
  const scale = Math.min((width - pad * 2) / rangeLng, (height - pad * 2) / rangeLat);
  const offsetX = (width - rangeLng * scale) / 2;
  const offsetY = (height - rangeLat * scale) / 2;

  const points = path
    .map((p) => {
      const x = offsetX + (p.lng - minLng) * scale;
      const y = height - (offsetY + (p.lat - minLat) * scale); // flip Y
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const first = points.split(" ")[0];
  const last = points.split(" ").at(-1) ?? first;
  const [fx, fy] = first.split(",");
  const [lx, ly] = last.split(",");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      <defs>
        <pattern id="chalio-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </pattern>
        <linearGradient id="chalio-route" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#e63946" />
          <stop offset="33%" stopColor="#f5c518" />
          <stop offset="66%" stopColor="#2c73ff" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="#0f172a" />
      <rect width={width} height={height} fill="url(#chalio-grid)" />
      <polyline
        points={points}
        fill="none"
        stroke="url(#chalio-route)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={fx} cy={fy} r="7" fill="#22c55e" stroke="#0f172a" strokeWidth="2" />
      <circle cx={lx} cy={ly} r="7" fill="#e63946" stroke="#0f172a" strokeWidth="2" />
    </svg>
  );
}
