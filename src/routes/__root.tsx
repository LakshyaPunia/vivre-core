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
      { title: "Vivre - Live fully, stay connected." },
      { name: "description", content: "AI-powered health monitoring for the people you love." },
      { name: "theme-color", content: "#080C14" },
      { property: "og:title", content: "Vivre - Live fully, stay connected." },
      { name: "twitter:title", content: "Vivre - Live fully, stay connected." },
      { property: "og:description", content: "AI-powered health monitoring for the people you love." },
      { name: "twitter:description", content: "AI-powered health monitoring for the people you love." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3290248a-248c-419a-a8d4-064c30181163/id-preview-cea99507--c2ae9ad5-ac89-4a73-b90f-709421800a27.lovable.app-1778166343568.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3290248a-248c-419a-a8d4-064c30181163/id-preview-cea99507--c2ae9ad5-ac89-4a73-b90f-709421800a27.lovable.app-1778166343568.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
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
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r bg-[#0b1220]/70 backdrop-blur-xl md:flex md:flex-col" style={{ borderRightColor: "rgba(255,255,255,0.05)" }}>
      <div className="flex items-center gap-2.5 px-6 py-7">
        <span className="relative inline-flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse-dot shadow-[0_0_10px_rgba(6,182,212,0.7)]" />
        </span>
        <span className="font-display font-bold tracking-tight text-text-primary" style={{ fontSize: 22 }}>Vivre</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="group relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-[13px] font-medium text-[#8892A4] transition hover:bg-white/[0.03] hover:text-text-primary data-[status=active]:bg-[rgba(6,182,212,0.08)] data-[status=active]:text-text-primary data-[status=active]:shadow-[inset_2px_0_0_0_#06B6D4]"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="px-6 py-5">
        <div className="flex items-center gap-2 text-[12px] font-normal text-[#8892A4]">
          <span className="inline-flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse-dot shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          </span>
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
                animate={{ scale: isActive ? 1.15 : 1 }}
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
    </nav>
  );
}
