export function Avatar({
  name,
  size = 36,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join("");

  const palette = ["bg-brand-red", "bg-brand-yellow", "bg-brand-blue", "bg-brand-green"];
  const idx = name.charCodeAt(0) % palette.length;

  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`inline-flex items-center justify-center rounded-full font-bold text-white ${palette[idx]} ${className}`}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}
