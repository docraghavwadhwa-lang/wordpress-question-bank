export type Appearance = "light" | "dark";
export function resolveAppearance(saved: string | null): Appearance { return saved === "dark" ? "dark" : "light"; }
