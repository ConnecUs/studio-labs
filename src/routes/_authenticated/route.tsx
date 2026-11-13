import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { sovereignAuth } from "@/lib/sovereignDb";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Admin route is protected by the 25th Dynasty CEO Code Gate
    if (location.pathname.endsWith("/admin")) return;

    const user = await sovereignAuth.getUser();
    if (!user) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
