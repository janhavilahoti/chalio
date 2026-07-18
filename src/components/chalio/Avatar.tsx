export function Avatar({
  name,
  size = 36,
  className = "",
  url,
}: {
  name: string;
  size?: number;
  className?: string;
  url?: string | null;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join("");

  const palette = ["bg-brand-red", "bg-brand-yellow", "bg-brand-blue", "bg-brand-green"];
  const idx = (name.charCodeAt(0) || 0) % palette.length;

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className={`inline-block rounded-full object-cover ${className}`}
      />
    );
  }

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
