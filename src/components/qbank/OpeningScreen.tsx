import logo from "@/assets/elixir-opening-logo.asset.json";

/** No branding timer: this screen exists only while the app's real modules load. */
export function OpeningScreen() {
  return <main data-opening-screen className="fixed inset-0 z-50 grid place-items-center bg-launch text-launch-foreground">
    <img src={logo.url} alt="Elixir by Nirmaya Care" width={753} height={756} className="h-auto w-56 max-w-[60vw] object-contain" />
    <div role="status" className="absolute inset-x-0 bottom-[max(14%,env(safe-area-inset-bottom))] flex flex-col items-center gap-5">
      <span className="h-7 w-7 animate-spin rounded-full border-4 border-launch-foreground/30 border-t-launch-foreground motion-reduce:animate-none" />
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-launch-foreground/85">Loading modules…</span>
    </div>
  </main>;
}