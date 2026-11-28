export type Appearance = "light" | "dark";
export function resolveAppearance(saved: string | null): Appearance {
  if (saved === "light") return "light";
  return "dark";
}
