import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { RouteSvg } from "@/components/chalio/RouteSvg";
import { getActivity } from "@/lib/chalio.functions";
import { useRequireAuth } from "@/lib/auth-hooks";
import { IconMark } from "@/components/chalio/BrandLockup";

export const Route = createFileRoute("/walk/$id")({
  head: () => ({ meta: [{ title: "Walk summary — Chalio" }] }),
  component: SummaryScreen,
});

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function SummaryScreen() {
  const auth = useRequireAuth();
  const { id } = useParams({ from: "/walk/$id" });
  const fn = useServerFn(getActivity);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => fn({ data: { id } }),
    enabled: auth === "authed",
  });

  async function share() {
    const url = window.location.href;
    const text = `I just walked ${Number(data?.distance_km ?? 0).toFixed(2)} km on Chalio!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Chalio walk", text, url });
        return;
      } catch {
        /* ignore */
      }
    }
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    window.open(wa, "_blank");
  }

  async function download() {
    const el = cardRef.current;
    if (!el) return;
    // Rasterize the card by drawing its SVG onto a canvas — no extra deps.
    try {
      const svg = el.querySelector("svg");
      if (!svg) throw new Error("No route to render");
      const clone = svg.cloneNode(true) as SVGElement;
      const xml = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([xml], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("Render failed"));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unsupported");
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 60, 60, 1080, 468);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 44px Nunito, system-ui, sans-serif";
      ctx.fillText(`${Number(data?.distance_km ?? 0).toFixed(2)} km`, 60, 580);
      ctx.font = "500 24px Nunito, system-ui, sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("chalio — walk • play • earn • repeat", 60, 610);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.download = `chalio-walk-${id}.png`;
        a.href = URL.createObjectURL(blob);
        a.click();
      }, "image/png");
    } catch (e) {
      toast.error("Couldn't render image", { description: (e as Error).message });
    }
  }

  if (isLoading || auth !== "authed") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading…</div>;
  }
  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-sm text-slate-500">{(error as Error)?.message ?? "Not found"}</p>
      </div>
    );
  }

  const path = (Array.isArray(data.path) ? data.path : []) as Array<{ lat: number; lng: number }>;
  const started = new Date(data.started_at);

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg bg-background px-5 pb-10 pt-4">
      <Link
        to="/home"
        className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        Home
      </Link>

      <div
        ref={cardRef}
        className="mt-4 overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {started.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              {" · "}
              {started.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </p>
            <p className="mt-1 text-xl font-extrabold">Walk complete</p>
          </div>
          <IconMark size={36} />
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl">
          <RouteSvg path={path} height={220} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <SummaryStat label="Distance" value={`${Number(data.distance_km).toFixed(2)} km`} />
          <SummaryStat label="Duration" value={fmtDuration(data.duration_seconds)} />
          <SummaryStat label="Avg speed" value={`${Number(data.avg_speed_kmh).toFixed(1)} km/h`} />
          <SummaryStat label="Calories" value={`${data.calories}`} />
          <SummaryStat label="Steps" value={`${data.steps}`} />
          <SummaryStat label="Coins" value={`+${data.coins_awarded}`} accent />
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={share}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 py-3 text-sm font-bold text-white active:scale-[0.99]"
        >
          <Share2 className="h-4 w-4" strokeWidth={2.6} /> Share
        </button>
        <button
          type="button"
          onClick={download}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 active:scale-[0.99]"
        >
          <Download className="h-4 w-4" strokeWidth={2.6} /> Download
        </button>
      </div>
    </main>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-800/60 py-2.5">
      <div className={`text-base font-extrabold tabular-nums ${accent ? "text-brand-yellow" : "text-white"}`}>
        {value}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
    </div>
  );
}
