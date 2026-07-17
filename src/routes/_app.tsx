import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { BottomTabs } from "@/components/chalio/BottomTabs";
import { useRequireAuth } from "@/lib/auth-hooks";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const status = useRequireAuth();
  if (status !== "authed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-slate-400">
        Loading…
      </div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Toaster position="top-center" richColors closeButton />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <Outlet />
      </div>
      <BottomTabs />
    </div>
  );
}
