import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginPlaceholder,
});

function LoginPlaceholder() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-sm text-muted-foreground">Login screen — coming next.</p>
    </main>
  );
}
