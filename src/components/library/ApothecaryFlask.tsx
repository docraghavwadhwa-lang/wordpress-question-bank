import React from "react";
import { getFlaskTierForDuration, type FlaskTier } from "@/lib/apothecary";

interface ApothecaryFlaskProps {
  fillPercent: number; // 0 to 100
  durationMinutes: number;
  status?: "running" | "completed" | "abandoned";
  size?: number;
  className?: string;
  showGlow?: boolean;
  showLabels?: boolean;
}

export function ApothecaryFlask({
  fillPercent,
  durationMinutes,
  status = "running",
  size = 180,
  className = "",
  showGlow = true,
  showLabels = true,
}: ApothecaryFlaskProps) {
  const tier: FlaskTier = getFlaskTierForDuration(durationMinutes);
  const clampedFill = Math.min(100, Math.max(0, fillPercent));
  const isCracked = status === "abandoned";
  const isSealed = status === "completed";

  // Liquid height within SVG viewBox (0 to 140 base, flask liquid bounds 35 to 135)
  const liquidY = 135 - (clampedFill / 100) * 85;
  const liquidHeight = Math.max(0, 135 - liquidY);

  const mainLiquidColor = isCracked ? "#64748B" : tier.liquidColor;
  const accentLiquidColor = isCracked ? "#94A3B8" : tier.liquidAccent;

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background ambient glow */}
      {showGlow && (
        <div
          className="absolute inset-0 rounded-full blur-2xl transition-all duration-700 pointer-events-none"
          style={{
            background: isCracked
              ? "radial-gradient(circle, rgba(148, 163, 184, 0.25) 0%, transparent 70%)"
              : `radial-gradient(circle, ${tier.glowColor} 0%, transparent 75%)`,
            opacity: clampedFill > 5 ? 0.8 : 0.2,
          }}
        />
      )}

      <svg
        viewBox="0 0 120 150"
        width={size}
        height={size}
        className="relative overflow-visible drop-shadow-md select-none"
      >
        <defs>
          {/* Liquid gradient */}
          <linearGradient id={`liquid-grad-${tier.type}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={mainLiquidColor} />
            <stop offset="100%" stopColor={accentLiquidColor} />
          </linearGradient>

          {/* Glass reflection gradient */}
          <linearGradient id="glass-specular" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="30%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="70%" stopColor="rgba(255,255,255,0.0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.25)" />
          </linearGradient>

          {/* Flask shape clip paths */}
          {tier.type === "vial" && (
            <clipPath id="flask-clip-vial">
              <rect x="42" y="32" width="36" height="100" rx="18" />
            </clipPath>
          )}

          {tier.type === "erlenmeyer" && (
            <clipPath id="flask-clip-erlenmeyer">
              <path d="M 52,32 L 68,32 L 68,52 L 96,124 Q 98,136 86,136 L 34,136 Q 22,136 24,124 L 52,52 Z" />
            </clipPath>
          )}

          {tier.type === "florence" && (
            <clipPath id="flask-clip-florence">
              <path d="M 52,30 L 68,30 L 68,58 A 40,40 0 1,1 52,58 Z" />
            </clipPath>
          )}

          {tier.type === "phial" && (
            <clipPath id="flask-clip-phial">
              <path d="M 50,30 L 70,30 L 70,50 Q 95,75 95,100 A 35,35 0 0,1 25,100 Q 25,75 50,50 Z" />
            </clipPath>
          )}
        </defs>

        {/* 1. Liquid fill inside clip-path */}
        <g clipPath={`url(#flask-clip-${tier.type})`}>
          {/* Base fluid background */}
          <rect
            x="10"
            y={liquidY}
            width="100"
            height={liquidHeight + 10}
            fill={`url(#liquid-grad-${tier.type})`}
            className="transition-all duration-500 ease-out"
          />

          {/* Liquid meniscus wave highlight */}
          {clampedFill > 2 && (
            <ellipse
              cx="60"
              cy={liquidY}
              rx="38"
              ry="3"
              fill={accentLiquidColor}
              opacity="0.8"
            />
          )}

          {/* Rising bubbles while running */}
          {status === "running" && clampedFill > 10 && (
            <>
              <circle cx="56" cy={liquidY + 18} r="2" fill="#FFFFFF" opacity="0.6">
                <animate attributeName="cy" from="130" to={liquidY} dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0.2;0" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx="64" cy={liquidY + 28} r="2.5" fill="#FFFFFF" opacity="0.7">
                <animate attributeName="cy" from="130" to={liquidY} dur="1.8s" begin="0.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0.3;0" dur="1.8s" begin="0.8s" repeatCount="indefinite" />
              </circle>
            </>
          )}
        </g>

        {/* 2. Glass Outline Shapes */}
        {tier.type === "vial" && (
          <>
            {/* Lip / Rim */}
            <rect x="38" y="26" width="44" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground/70" />
            {/* Body */}
            <rect x="42" y="32" width="36" height="100" rx="18" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground/70" />
            {/* Graduated markings */}
            <line x1="72" y1="55" x2="66" y2="55" stroke="currentColor" strokeWidth="1.5" className="text-foreground/40" />
            <line x1="72" y1="75" x2="63" y2="75" stroke="currentColor" strokeWidth="1.5" className="text-foreground/40" />
            <line x1="72" y1="95" x2="66" y2="95" stroke="currentColor" strokeWidth="1.5" className="text-foreground/40" />
            <line x1="72" y1="115" x2="63" y2="115" stroke="currentColor" strokeWidth="1.5" className="text-foreground/40" />
          </>
        )}

        {tier.type === "erlenmeyer" && (
          <>
            {/* Lip / Rim */}
            <rect x="48" y="26" width="24" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground/70" />
            {/* Body */}
            <path
              d="M 52,32 L 68,32 L 68,52 L 96,124 Q 98,136 86,136 L 34,136 Q 22,136 24,124 L 52,52 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-foreground/70"
            />
            {/* Graduation marks */}
            <line x1="42" y1="115" x2="48" y2="115" stroke="currentColor" strokeWidth="1.5" className="text-foreground/40" />
            <line x1="47" y1="95" x2="55" y2="95" stroke="currentColor" strokeWidth="1.5" className="text-foreground/40" />
            <line x1="52" y1="75" x2="58" y2="75" stroke="currentColor" strokeWidth="1.5" className="text-foreground/40" />
          </>
        )}

        {tier.type === "florence" && (
          <>
            {/* Lip / Rim */}
            <rect x="48" y="24" width="24" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground/70" />
            {/* Neck + Round Bulb */}
            <path
              d="M 52,30 L 68,30 L 68,58 A 40,40 0 1,1 52,58 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-foreground/70"
            />
          </>
        )}

        {tier.type === "phial" && (
          <>
            {/* Ornate Rim */}
            <path d="M 44,24 L 76,24 Q 76,28 72,30 L 48,30 Q 44,28 44,24 Z" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground/70" />
            {/* Ornate Phial Body */}
            <path
              d="M 50,30 L 70,30 L 70,50 Q 95,75 95,100 A 35,35 0 0,1 25,100 Q 25,75 50,50 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-foreground/70"
            />
          </>
        )}

        {/* 3. Glass Highlights / Specular sheen */}
        <path
          d="M 46,38 L 46,120"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* 4. Stopper / Seal on completion */}
        {isSealed && (
          <g className="animate-in fade-in zoom-in duration-300">
            {/* Cork stopper */}
            <polygon points="50,16 70,16 67,27 53,27" fill="#B45309" stroke="#78350F" strokeWidth="1.5" />
            {/* Gold Wax Seal Badge */}
            <circle cx="60" cy="18" r="5" fill="#EAB308" stroke="#CA8A04" strokeWidth="1" />
            <text x="60" y="20.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#713F12">
              ✓
            </text>
          </g>
        )}

        {/* 5. Fracture cracks on Give Up / Abandoned */}
        {isCracked && (
          <g className="animate-in fade-in duration-300">
            <path
              d="M 46,75 L 56,88 L 52,98 L 68,112 L 62,126"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.9"
            />
            <path
              d="M 56,88 L 64,84 L 72,92"
              fill="none"
              stroke="#EF4444"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.8"
            />
          </g>
        )}
      </svg>

      {/* Flask Title and Rarity Badge */}
      {showLabels && (
      <div className="mt-1 flex flex-col items-center">
        <span className="text-xs font-semibold tracking-wide text-foreground">{tier.title}</span>
        <span
          className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.2 rounded-full border mt-0.5"
          style={{
            borderColor: isCracked ? "#EF4444" : tier.liquidAccent,
            color: isCracked ? "#EF4444" : tier.liquidAccent,
          }}
        >
          {isCracked ? "Cracked Vial" : isSealed ? "Sealed Elixir" : tier.rarity}
        </span>
      </div>
      )}
    </div>
  );
}
