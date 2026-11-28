export type Appearance = "light" | "dark";

export function resolveAppearance(saved: string | null): Appearance {
  if (saved === "light") return "light";
  if (saved === "dark") return "dark";
  if (typeof window !== "undefined" && window.matchMedia) {
    try {
      if (
        window.matchMedia("(prefers-color-scheme: light)").matches &&
        !window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        return "light";
      }
    } catch {
      /* ignore matchMedia error */
    }
  }
  return "dark";
}
