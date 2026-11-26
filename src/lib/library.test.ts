import { describe, it, expect } from "vitest";
import { getFlaskTierForDuration, formatFocusDuration, APOTHECARY_TIERS } from "@/lib/apothecary";
import { featureAvailable, FEATURE_KEYS } from "@/lib/features";
import { SOUNDSCAPES } from "@/lib/ambient-sound";

describe("Apothecary Flask Distillation", () => {
  it("maps durations under 30 minutes to Aspirant's Vial", () => {
    const tier = getFlaskTierForDuration(15);
    expect(tier.type).toBe("vial");
    expect(tier.rarity).toBe("common");
  });

  it("maps durations between 30 and 59 minutes to Scholar's Flask", () => {
    const tier = getFlaskTierForDuration(45);
    expect(tier.type).toBe("erlenmeyer");
    expect(tier.rarity).toBe("uncommon");
  });

  it("maps durations between 60 and 119 minutes to Physician's Alembic", () => {
    const tier = getFlaskTierForDuration(90);
    expect(tier.type).toBe("florence");
    expect(tier.rarity).toBe("rare");
  });

  it("maps durations >= 120 minutes to Panacea Grand Phial", () => {
    const tier = getFlaskTierForDuration(150);
    expect(tier.type).toBe("phial");
    expect(tier.rarity).toBe("legendary");
  });

  it("correctly formats seconds into human-readable focus durations", () => {
    expect(formatFocusDuration(45)).toBe("45s");
    expect(formatFocusDuration(1500)).toBe("25m");
    expect(formatFocusDuration(3600)).toBe("1h");
    expect(formatFocusDuration(5400)).toBe("1h 30m");
  });

  it("defines all 4 Apothecary rarity tiers with distinct colors and glow", () => {
    expect(APOTHECARY_TIERS).toHaveLength(4);
    APOTHECARY_TIERS.forEach((tier) => {
      expect(tier.liquidColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(tier.glowColor).toContain("rgba");
    });
  });
});

describe("Library Feature Flag & Ambient Soundscapes", () => {
  it("includes 'library' in FEATURE_KEYS list", () => {
    expect(FEATURE_KEYS).toContain("library");
  });

  it("defaults library to enabled when not explicitly disabled in settings", () => {
    expect(featureAvailable([], "library")).toBe(true);
    expect(featureAvailable([{ key: "library", enabled: true }], "library")).toBe(true);
    expect(featureAvailable([{ key: "library", enabled: false }], "library")).toBe(false);
  });

  it("always enables library for admin users regardless of flag value", () => {
    expect(featureAvailable([{ key: "library", enabled: false }], "library", true)).toBe(true);
  });

  it("provides 8 seamless loopable soundscapes matching custom audio assets", () => {
    expect(SOUNDSCAPES).toHaveLength(8);
    const ids = SOUNDSCAPES.map((s) => s.id);
    expect(ids).toEqual([
      "rain",
      "library",
      "cafe",
      "forest",
      "lofi",
      "whitenoise",
      "fireplace",
      "wind",
    ]);

    const slugs = SOUNDSCAPES.map((s) => s.slug);
    expect(slugs).toEqual([
      "monsoon-rain",
      "quiet-library",
      "cozy-cafe",
      "mountain-forest",
      "lofi",
      "white-noise",
      "fireplace-crackling",
      "wind",
    ]);
  });
});
