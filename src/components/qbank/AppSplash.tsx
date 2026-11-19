import { useEffect, useState } from "react";
import light from "@/assets/elixir-logo-light.asset.json";
import dark from "@/assets/elixir-logo-dark.asset.json";
import { isNativeApp } from "@/lib/native-auth";

const TOTAL = 15000;

/** 15-second opening: the light Elixir logo slowly transforms into the dark-teal one. Tap to skip. */
export function AppSplash() {
  const [phase, setPhase] = useState<"off" | "on" | "out">("off");
  useEffect(() => {
    if (!isNativeApp() || sessionStorage.getItem("el-splash")) return;
    sessionStorage.setItem("el-splash", "1");
    setPhase("on");
    const a = setTimeout(() => setPhase("out"), TOTAL - 600);
    const b = setTimeout(() => setPhase("off"), TOTAL);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  if (phase === "off") return null;
  return (
    <button type="button" aria-label="Skip intro" onClick={() => setPhase("off")}
      className={`fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-background transition-opacity duration-500 ${phase === "out" ? "opacity-0" : "opacity-100"}`}>
      <span className="absolute inset-0 bg-brand animate-[elixir-fill_15s_ease-in-out_forwards]" />
      <span className="relative h-[min(78vw,420px)] w-[min(78vw,420px)] animate-[elixir-breathe_5s_ease-in-out_infinite]">
        <img src={light.url} alt="" className="absolute inset-0 h-full w-full object-contain animate-[elixir-out_15s_ease-in-out_forwards]" />
        <img src={dark.url} alt="Elixir by Nirmaya Care" className="absolute inset-0 h-full w-full object-contain opacity-0 animate-[elixir-in_15s_ease-in-out_forwards]" />
      </span>
      <span className="absolute bottom-10 text-xs tracking-[0.2em] text-muted-foreground animate-[elixir-out_15s_ease-in-out_forwards]">TAP TO SKIP</span>
    </button>
  );
}
