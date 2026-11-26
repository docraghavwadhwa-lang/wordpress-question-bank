/**
 * The Elixir Apothecary visual reward engine.
 * Maps focus session durations and outcomes to distinctive glass flask vessels.
 */

export type FlaskRarity = "common" | "uncommon" | "rare" | "legendary";
export type FlaskType = "vial" | "erlenmeyer" | "florence" | "phial";

export interface FlaskTier {
  type: FlaskType;
  title: string;
  minMinutes: number;
  rarity: FlaskRarity;
  colorName: string;
  glowColor: string;
  liquidColor: string;
  liquidAccent: string;
  description: string;
}

export const APOTHECARY_TIERS: FlaskTier[] = [
  {
    type: "vial",
    title: "Aspirant's Vial",
    minMinutes: 0,
    rarity: "common",
    colorName: "Bronze / Amber",
    glowColor: "rgba(217, 119, 6, 0.4)",
    liquidColor: "#D97706",
    liquidAccent: "#FBBF24",
    description: "Hand-blown sample vial for concentrated quick revisions.",
  },
  {
    type: "erlenmeyer",
    title: "Scholar's Flask",
    minMinutes: 30,
    rarity: "uncommon",
    colorName: "Teal Emerald",
    glowColor: "rgba(13, 92, 99, 0.5)",
    liquidColor: "#0D5C63",
    liquidAccent: "#2DD4BF",
    description: "Classic conical distillation flask for deep 30m+ subject mastery.",
  },
  {
    type: "florence",
    title: "Physician's Alembic",
    minMinutes: 60,
    rarity: "rare",
    colorName: "Deep Azure",
    glowColor: "rgba(30, 58, 138, 0.55)",
    liquidColor: "#1E3A8A",
    liquidAccent: "#60A5FA",
    description: "Spherical boiling bulb distilled through an hour of sustained focus.",
  },
  {
    type: "phial",
    title: "Panacea Grand Phial",
    minMinutes: 120,
    rarity: "legendary",
    colorName: "Imperial Gold",
    glowColor: "rgba(234, 179, 8, 0.65)",
    liquidColor: "#CA8A04",
    liquidAccent: "#FDE047",
    description: "The ultimate 2h+ elixir phial crowned with an apothecary wax seal.",
  },
];

export function getFlaskTierForDuration(minutes: number): FlaskTier {
  if (minutes >= 120) return APOTHECARY_TIERS[3]!;
  if (minutes >= 60) return APOTHECARY_TIERS[2]!;
  if (minutes >= 30) return APOTHECARY_TIERS[1]!;
  return APOTHECARY_TIERS[0]!;
}

export function formatFocusDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  const h = Math.floor(m / 60);
  const remainingM = m % 60;
  if (h === 0) return `${m}m`;
  return remainingM > 0 ? `${h}h ${remainingM}m` : `${h}h`;
}
