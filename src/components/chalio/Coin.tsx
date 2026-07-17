export function Coin({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.62 }}
      className="inline-flex items-center justify-center rounded-full bg-brand-yellow font-extrabold text-white"
      aria-hidden="true"
    >
      c
    </span>
  );
}
