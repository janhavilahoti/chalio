import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Upload } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/chalio/Avatar";
import { getProfileStats, updateProfile } from "@/lib/chalio.functions";
import { useRequireAuth } from "@/lib/auth-hooks";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile/edit")({
  head: () => ({ meta: [{ title: "Edit profile — Chalio" }] }),
  component: ProfileEditScreen,
});

function ProfileEditScreen() {
  useRequireAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const statsFn = useServerFn(getProfileStats);
  const updateFn = useServerFn(updateProfile);
  const { data } = useQuery({ queryKey: ["profile-stats"], queryFn: () => statsFn({}) });

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [dailyGoal, setDailyGoal] = useState<number>(10000);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data?.profile) return;
    setName(data.profile.name ?? "");
    setCity(data.profile.city ?? "");
    setArea(data.profile.area ?? "");
    setDailyGoal(data.profile.daily_goal ?? 10000);
    setAvatarUrl(data.profile.avatar_url ?? null);
  }, [data]);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr) throw sErr;
      setAvatarUrl(signed.signedUrl);
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error("Couldn't upload photo", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await updateFn({
        data: {
          name,
          city,
          area,
          daily_goal: Number(dailyGoal),
          avatar_url: avatarUrl ?? "",
        },
      });
      await qc.invalidateQueries({ refetchType: "all" });
      toast.success("Profile updated");
      navigate({ to: "/profile" });
    } catch (e) {
      toast.error("Couldn't save", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg bg-background px-5 pb-10 pt-4">
      <Link
        to="/profile"
        className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        Cancel
      </Link>

      <h1 className="mt-5 text-xl font-extrabold text-slate-900">Edit profile</h1>

      <div className="mt-6 flex flex-col items-center gap-3">
        <Avatar name={name || "You"} url={avatarUrl} size={88} />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" strokeWidth={2.6} />
          {uploading ? "Uploading…" : "Change photo"}
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
          />
        </Field>
        <Field label="City">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
          />
        </Field>
        <Field label="Area / neighborhood">
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
          />
        </Field>
        <Field label="Daily step goal">
          <input
            type="number"
            value={dailyGoal}
            min={1000}
            step={500}
            onChange={(e) => setDailyGoal(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-brand-blue"
          />
        </Field>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving || uploading}
        className="mt-8 w-full rounded-2xl bg-brand-blue px-5 py-3.5 text-base font-bold text-white shadow-sm active:scale-[0.99] disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
