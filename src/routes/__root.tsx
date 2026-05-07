import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home as HomeIcon,
  BellRing,
  MapPin,
  Video,
  Settings as SettingsIcon,
  Activity,
} from "lucide-react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md p-8 text-center">
        <h1 className="font-display text-7xl font-light text-text-primary">404</h1>
        <p className="mt-3 text-sm text-text-secondary">This page doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl bg-cyan-500 px-5 py-2 text-sm font-medium text-[#06121a] transition hover:bg-cyan-400"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md p-8 text-center">
        <h1 className="font-display text-2xl text-text-primary">Something went wrong</h1>
        <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-medium text-[#06121a] transition hover:bg-cyan-400"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Vivre — Live fully, stay connected." },
      { name: "description", content: "AI-powered health monitoring for the people you love." },
      { name: "theme-color", content: "#080C14" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/alerts", label: "Alerts", icon: BellRing },
  { to: "/doctors", label: "Doctors", icon: Video },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLogin = pathname === "/login";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="bg-blobs" />
      {isLogin ? (
        <Outlet />
      ) : (
        <div className="relative z-10 flex min-h-screen">
          <Sidebar />
          <main className="flex-1 pb-24 md:pb-6 md:pl-[240px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
          <MobileTabBar />
        </div>
      )}
    </QueryClientProvider>
  );
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-border-subtle bg-bg-surface/60 backdrop-blur-xl md:flex md:flex-col">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
        </span>
        <span className="font-display text-2xl font-semibold tracking-tight">Vivre</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary transition hover:bg-white/5 hover:text-text-primary data-[status=active]:bg-cyan-500/10 data-[status=active]:text-text-primary data-[status=active]:shadow-[inset_2px_0_0_0_#06b6d4]"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="px-6 py-5 text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-status-ok" />
          All systems live
        </div>
      </div>
    </aside>
  );
}

function MobileTabBar() {
  const tabs = [
    { to: "/", label: "Home", icon: HomeIcon },
    { to: "/alerts", label: "Alerts", icon: BellRing },
    { to: "/doctors", label: "Doctors", icon: Video },
    { to: "/settings", label: "Me", icon: SettingsIcon },
  ] as const;
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-2xl glass px-2 py-2 md:hidden">
      {tabs.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="group flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] text-text-secondary transition data-[status=active]:text-cyan-400"
        >
          {({ isActive }) => (
            <>
              <motion.span
                animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="block"
              >
                <Icon className="h-5 w-5" />
              </motion.span>
              <span>{label}</span>
              {isActive && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute -bottom-0.5 h-0.5 w-6 rounded-full bg-cyan-400"
                />
              )}
            </>
          )}
        </Link>
      ))}
      <Link
        to="/" search={{ chat: "1" } as any}
        className="absolute -top-6 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-[0_8px_24px_rgba(139,92,246,0.5)]"
        aria-label="Open AI chat"
      >
        <MapPin className="h-5 w-5" />
      </Link>
    </nav>
  );
}
