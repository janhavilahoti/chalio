import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Chalio" },
      { name: "description", content: "How Chalio collects and uses your activity, location, and account data." },
    ],
  }),
  component: PrivacyScreen,
});

function PrivacyScreen() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-background px-6 pb-16 pt-10">
      <Link
        to="/connect-fit"
        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
        Back
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: July 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-slate-700">
        <section>
          <h2 className="text-lg font-bold text-slate-900">Overview</h2>
          <p className="mt-2">
            Chalio is a walk-to-earn app. This page explains what data we collect, why we collect
            it, and how it's used. Full legal text will be published here before public launch —
            this is a placeholder covering the categories relevant to Health Connect review.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900">Health & activity data</h2>
          <p className="mt-2">
            On Android, Chalio reads step count, distance, and active calories from Health Connect
            with your explicit permission. On the web, we accept a manual activity signal from you.
            This data is used only to:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Show today's totals on your Home screen.</li>
            <li>Award coins for real movement, subject to a daily cap.</li>
            <li>Track progress toward missions and streaks you join.</li>
          </ul>
          <p className="mt-2">
            We do not sell or share your health data with advertisers. It is stored against your
            Chalio account and can be deleted by deleting your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900">Location data</h2>
          <p className="mt-2">
            With your permission, we use your device's approximate location once to detect your
            city so we can put you on the right leaderboard. You can skip this and enter your city
            manually. We do not track your location in the background.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900">Account data</h2>
          <p className="mt-2">
            When you sign in with Google we receive your name, email, and profile picture. This is
            used to create your Chalio profile and identify you on leaderboards.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
          <p className="mt-2">
            If you enable notifications, we may send you streak reminders and mission updates.
            You can turn these off anytime in your device settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900">Data retention & deletion</h2>
          <p className="mt-2">
            You can request account and data deletion at any time by contacting us. On deletion,
            all activity records, badges, and profile information tied to your account are removed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900">Contact</h2>
          <p className="mt-2">
            Questions about this policy? Reach us at{" "}
            <a href="mailto:hello@chalio.app" className="font-semibold text-slate-900 underline">
              hello@chalio.app
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
