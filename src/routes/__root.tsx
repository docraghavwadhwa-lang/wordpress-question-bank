import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { OfflineBanner } from "@/components/qbank/OfflineBanner";
import { registerAppServiceWorker } from "@/lib/sw-register";
import { initNativeAuth } from "@/lib/native-auth";
import { OnboardingGate } from "@/components/qbank/OnboardingGate";
import { FeatureRouteGate } from "@/components/qbank/FeatureGate";
import { DeviceGate } from "@/components/qbank/DeviceGate";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    // After an app update, an old cached screen can ask for files that no longer exist.
    // Reload once to fetch the fresh version instead of showing this error.
    const msg = String((error as Error)?.message ?? error);
    if (/dynamically imported module|Importing a module script|Failed to fetch|Loading chunk|module script/i.test(msg)) {
      const key = "elixir-reloaded-at";
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 30000) { sessionStorage.setItem(key, String(Date.now())); window.location.reload(); }
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <p className="mt-3 break-words text-xs text-muted-foreground/80">Error: {String((error as Error)?.message ?? error).slice(0, 200)}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              void router;
              reset();
              window.location.reload();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0D5C63" },
      { title: "Elixir" },
      { name: "description", content: "Medical MCQ practice by subject and chapter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png?v=elixir4", type: "image/png", sizes: "64x64" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=elixir" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    void registerAppServiceWorker();
    initNativeAuth();
    // Android app: hide the native logo screen the moment the real page is ready (no white gap).
    (window as unknown as { Capacitor?: { Plugins?: { SplashScreen?: { hide: (o?: object) => Promise<void> } } } }).Capacitor?.Plugins?.SplashScreen?.hide({ fadeOutDuration: 0 }).catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <OfflineBanner />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <DeviceGate><OnboardingGate><FeatureRouteGate><Outlet /></FeatureRouteGate></OnboardingGate></DeviceGate>
      <Toaster />
    </QueryClientProvider>
  );
}
