import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { resolveAppearance, type Appearance } from "@/lib/appearance";

const AppearanceContext = createContext({ appearance: "dark" as Appearance, toggle: () => {} });

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>("dark");

  function apply(mode: Appearance) {
    setAppearance(mode);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", mode === "dark");
      document.documentElement.style.colorScheme = mode;
    }
  }

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("elixir-appearance");
    } catch {
      /* ignore */
    }
    apply(resolveAppearance(saved));
  }, []);

  function toggle() {
    const mode = appearance === "light" ? "dark" : "light";
    apply(mode);
    try {
      localStorage.setItem("elixir-appearance", mode);
    } catch {
      /* ignore */
    }
  }

  return (
    <AppearanceContext.Provider value={{ appearance, toggle }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export const useAppearance = () => useContext(AppearanceContext);
