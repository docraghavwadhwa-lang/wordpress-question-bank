import { supabase } from "@/integrations/supabase/client";

// Custom scheme registered in the Android app (see .github/workflows/build-apk.yml).
export const APP_AUTH_CALLBACK = "com.nirmayacare.medquiz://auth/callback";

type AppPlugin = {
  addListener: (e: "appUrlOpen", cb: (d: { url: string }) => void) => unknown;
  getLaunchUrl?: () => Promise<{ url?: string } | undefined>;
};
type Cap = { isNativePlatform?: () => boolean; Plugins?: { App?: AppPlugin } };

function cap(): Cap | undefined {
  return typeof window === "undefined" ? undefined : (window as unknown as { Capacitor?: Cap }).Capacitor;
}

export function isNativeApp(): boolean {
  return !!cap()?.isNativePlatform?.();
}

/** In the Android app: open Google sign-in in the phone browser, returning to the app afterwards. */
export async function nativeGoogleSignIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: APP_AUTH_CALLBACK, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } },
  });
  if (error) throw error;
  // External hosts are opened by Capacitor in the system browser.
  if (data?.url) window.location.href = data.url;
}

async function handleUrl(url: string) {
  if (!url.startsWith(APP_AUTH_CALLBACK)) return;
  const u = new URL(url.replace(/^com\.nirmayacare\.medquiz:/, "https:"));
  const params = new URLSearchParams(u.hash.replace(/^#/, ""));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const code = u.searchParams.get("code");
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
  } else if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else return;
  window.location.replace("/");
}

let wired = false;
export function initNativeAuth() {
  const app = cap()?.Plugins?.App;
  if (wired || !isNativeApp() || !app) return;
  wired = true;
  app.addListener("appUrlOpen", ({ url }) => void handleUrl(url));
  void Promise.resolve(app.getLaunchUrl?.()).then((r) => { if (r?.url) void handleUrl(r.url); }).catch(() => {});
}
