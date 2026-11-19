/** The only place the offline service worker is registered. Never in dev, preview or iframes. */
const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;

function refused(): boolean {
  if (!import.meta.env.PROD) return true;
  if (window.top !== window.self) return true;
  const host = window.location.hostname.toLowerCase();
  const label = host.split(".")[0] ?? "";
  for (const d of ["lovable.app", "gpt-eng.com", "gptengineer.run"]) {
    if (host.endsWith("." + d) && (PREVIEW_LABEL.test(label) || /^project--.+-dev$/.test(label))) return true;
  }
  if (/(^|\.)lovableproject(-dev)?\.com$/.test(host) || /(^|\.)beta\.lovable\.dev$/.test(host)) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

export async function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (refused()) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
    return;
  }
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
}
