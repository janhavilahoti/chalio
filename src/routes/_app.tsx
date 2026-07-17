import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomTabs } from "@/components/chalio/BottomTabs";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <Outlet />
      </div>
      <BottomTabs />
    </div>
  );
}
