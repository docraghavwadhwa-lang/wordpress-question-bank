import { useEffect, useState } from "react";
import symbol from "@/assets/medquiz-symbol.asset.json";
import { isNativeApp } from "@/lib/native-auth";

/** Brief logo entry animation when the Android app opens. */
export function AppSplash() {
  const [phase, setPhase] = useState<"off" | "in" | "out">("off");
  useEffect(() => {
    if (!isNativeApp() || sessionStorage.getItem("mq-splash")) return;
    sessionStorage.setItem("mq-splash", "1");
    setPhase("in");
    const a = setTimeout(() => setPhase("out"), 1100);
    const b = setTimeout(() => setPhase("off"), 1500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  if (phase === "off") return null;
  return (
    <div className={`fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-400 ${phase === "out" ? "opacity-0" : "opacity-100"}`}>
      <div className="flex flex-col items-center animate-in fade-in zoom-in-90 duration-700">
        <img src={symbol.url} alt="" className="h-28 w-28 object-contain" />
        <p className="mt-4 font-display text-3xl text-primary">MedQuiz</p>
        <p className="mt-1 text-xs tracking-[0.2em] text-muted-foreground">BY NIRMAYA CARE</p>
      </div>
    </div>
  );
}
