const CHALIO_ICON_SRC = "/chalio-icon.png";
const CHALIO_WORDMARK_SRC = "/chalio-wordmark.png";

export function BrandLockup({
  size = "md",
  showTagline = false,
}: {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}) {
  const dims = {
    sm: { icon: 56, wordmark: 140, gap: "gap-3" },
    md: { icon: 96, wordmark: 240, gap: "gap-5" },
    lg: { icon: 140, wordmark: 340, gap: "gap-7" },
  }[size];

  return (
    <div className={`flex flex-col items-center ${dims.gap}`}>
      <img
        src={CHALIO_ICON_SRC}
        alt=""
        aria-hidden="true"
        style={{ width: dims.icon }}
        className="h-auto object-contain"
      />
      <img
        src={CHALIO_WORDMARK_SRC}
        alt="Chalio"
        style={{ width: dims.wordmark }}
        className="h-auto object-contain"
      />
      {showTagline && <Tagline />}
    </div>
  );
}

export function Tagline() {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-700">
      <span>Walk</span>
      <span className="h-1.5 w-1.5 rounded-full bg-brand-red" aria-hidden="true" />
      <span>Play</span>
      <span className="h-1.5 w-1.5 rounded-full bg-brand-yellow" aria-hidden="true" />
      <span>Earn</span>
      <span className="h-1.5 w-1.5 rounded-full bg-brand-green" aria-hidden="true" />
      <span>Repeat</span>
    </p>
  );
}

export function IconMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src={CHALIO_ICON_SRC}
      alt="Chalio"
      style={{ width: size, height: size }}
      className="object-contain"
    />
  );
}
