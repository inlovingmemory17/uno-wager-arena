import React from "react";
import { cn } from "@/lib/utils";

export type UnoColor = "red" | "yellow" | "green" | "blue" | "wild";
export type UnoAction = "skip" | "reverse" | "draw2" | "wild" | "wild4";
export type UnoValue = number | UnoAction;

interface UnoCardProps {
  color: UnoColor;
  value: UnoValue;
  size?: "sm" | "md"; // sm: hand, md: discard/top
  disabled?: boolean;
  playable?: boolean;
  className?: string;
  onClick?: () => void;
}

// Helper to choose bright suit color backgrounds
const colorBg = (color: UnoColor) => {
  switch (color) {
    case "red":
      return "bg-[hsl(var(--uno-red))]";
    case "yellow":
      return "bg-[hsl(var(--uno-yellow))]";
    case "green":
      return "bg-[hsl(var(--uno-green))]";
    case "blue":
      return "bg-[hsl(var(--uno-blue))]";
    case "wild":
    default:
      return "bg-[hsl(var(--uno-black))]";
  }
};

const SuitDiamond: React.FC<{ color: UnoColor }>
  = ({ color }) => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 140" aria-hidden>
    {/* Curved diamond frame */}
    <g transform="translate(50,70) rotate(-18) translate(-50,-70)">
      <rect x="8" y="12" width="84" height="116" rx="38" ry="38" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="6" />
      <rect x="14" y="18" width="72" height="104" rx="34" ry="34" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="4" />
    </g>
  </svg>
);

const SkipSymbol = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 text-white" aria-hidden>
    <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="10" />
    <line x1="20" y1="80" x2="80" y2="20" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
  </svg>
);

const ReverseSymbol = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 text-white" aria-hidden>
    <path d="M65 22c10 8 14 16 14 28 0 22-18 40-40 40" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
    <polygon points="58,18 72,28 58,38" fill="currentColor" />
    <path d="M35 78C25 70 21 62 21 50 21 28 39 10 61 10" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
    <polygon points="28,82 14,72 28,62" fill="currentColor" />
  </svg>
);

const WildWheel = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16" aria-hidden>
    <defs>
      <clipPath id="wheelClip"><circle cx="50" cy="50" r="40" /></clipPath>
    </defs>
    <g clipPath="url(#wheelClip)">
      <rect x="50" y="0" width="50" height="100" fill="hsl(var(--uno-blue))" />
      <rect x="0" y="0" width="50" height="100" fill="hsl(var(--uno-green))" />
      <rect x="0" y="50" width="100" height="50" fill="hsl(var(--uno-yellow))" />
      <rect x="0" y="0" width="100" height="50" fill="hsl(var(--uno-red))" />
    </g>
    <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="6" />
  </svg>
);

export const UnoCard: React.FC<UnoCardProps> = ({ color, value, size = "sm", disabled, playable, className, onClick }) => {
  const baseWH = size === "md" ? "w-20 h-28" : "w-16 h-24";
  const opacity = disabled ? "opacity-50" : "";
  const hover = playable && !disabled ? "hover:scale-105" : "";

  const isNumber = typeof value === "number";
  const isWild = color === "wild" || value === "wild" || value === "wild4";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative select-none transform transition-transform duration-200",
        baseWH,
        hover,
        opacity,
        className
      )}
      aria-label={`${color} ${String(value)}`}
    >
      {/* Card base with white border frame */}
      <div className={cn("absolute inset-0 rounded-[0.9rem] shadow-[0_10px_20px_hsl(var(--uno-black)/0.25)]", colorBg(isWild ? "wild" : (color as UnoColor)))} />
      <div className="absolute inset-1 rounded-[0.8rem] bg-[hsl(var(--uno-white))]" />
      <div className={cn("absolute inset-2 rounded-[0.7rem] overflow-hidden", isWild ? "bg-[hsl(var(--uno-black))]" : colorBg(color))} />

      {/* Diamond frame */}
      <SuitDiamond color={color} />

      {/* Gloss highlight */}
      <div className="absolute inset-0 rounded-[0.9rem] pointer-events-none"
           style={{
             background: "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.1) 28%, rgba(255,255,255,0) 55%)"
           }}
      />

      {/* Corner indices */}
      <div className="absolute top-2 left-2 text-[10px] font-bold text-white drop-shadow">
        {isNumber ? (
          <span>{value}</span>
        ) : value === "skip" ? (
          <span>⦸</span>
        ) : value === "reverse" ? (
          <span>↺↻</span>
        ) : value === "draw2" ? (
          <span>+2</span>
        ) : value === "wild4" ? (
          <span>+4</span>
        ) : (
          <span>WILD</span>
        )}
      </div>
      <div className="absolute bottom-2 right-2 text-[10px] font-bold text-white drop-shadow rotate-180">
        {isNumber ? (
          <span>{value}</span>
        ) : value === "skip" ? (
          <span>⦸</span>
        ) : value === "reverse" ? (
          <span>↺↻</span>
        ) : value === "draw2" ? (
          <span>+2</span>
        ) : value === "wild4" ? (
          <span>+4</span>
        ) : (
          <span>WILD</span>
        )}
      </div>

      {/* Center symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isNumber ? (
          <span className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg">{value as number}</span>
        ) : value === "skip" ? (
          <SkipSymbol />
        ) : value === "reverse" ? (
          <ReverseSymbol />
        ) : value === "draw2" ? (
          <span className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg">+2</span>
        ) : value === "wild" ? (
          <WildWheel />
        ) : (
          <div className="relative">
            <WildWheel />
            <span className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg">+4</span>
          </div>
        )}
      </div>
    </button>
  );
};

export default UnoCard;
