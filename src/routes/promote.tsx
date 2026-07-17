import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { submitBrandRequest } from "@/lib/chalio.functions";
import { useRequireAuth } from "@/lib/auth-hooks";

export const Route = createFileRoute("/promote")({
  head: () => ({ meta: [{ title: "Promote your brand — Chalio" }] }),
  component: PromoteScreen,
});

function PromoteScreen() {
  useRequireAuth();
  const submit = useServerFn(submitBrandRequest);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await submit({
        data: {
          business_name: String(form.get("name") ?? ""),
          contact_info: String(form.get("email") ?? ""),
          reward_offer_description: String(form.get("offer") ?? ""),
          target_mission_type: String(form.get("type") ?? ""),
        },
      });
      setSubmitted(true);
      toast.success("Request submitted");
    } catch (e) {
      toast.error("Couldn't submit", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-5 pb-10 pt-4">
      <Link
        to="/rewards"
        className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        Back
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
        Promote your brand
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Sponsor a mission and reward walkers who visit your business.
      </p>

      {submitted ? (
        <div className="mt-8 rounded-2xl bg-brand-green/10 p-5 text-center">
          <p className="text-base font-bold text-slate-900">Thanks — we'll be in touch.</p>
          <p className="mt-1 text-sm text-slate-600">
            Our team reviews new sponsors within 2 business days.
          </p>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Field label="Business name" name="name" required />
          <Field label="Contact email" name="email" type="email" required />
          <Field label="Reward offer" name="offer" placeholder="e.g. 15% off a coffee" required />
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Target mission type
            </span>
            <select
              name="type"
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 focus:border-brand-blue focus:outline-none"
            >
              <option>Walk-in visit</option>
              <option>Distance goal near store</option>
              <option>Weekend challenge</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-brand-blue px-5 py-3.5 text-base font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit"}
          </button>
        </form>
      )}
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-blue focus:outline-none"
      />
    </label>
  );
}
