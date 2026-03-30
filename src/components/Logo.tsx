import { useId } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  iconOnly?: boolean;
}

const Logo = ({ className, size = "md", showText = true, iconOnly = false }: LogoProps) => {
  const iconSizes = {
    sm: 28,
    md: 32,
    lg: 40,
    xl: 52,
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
  };

  const badgeSizes = {
    sm: "text-[8px] px-1 py-[1px]",
    md: "text-[9px] px-1.5 py-[2px]",
    lg: "text-[10px] px-2 py-[2px]",
    xl: "text-xs px-2 py-[3px]",
  };

  const s = iconSizes[size];
  const uid = useId();
  const bgId = `sf-bg-${uid}`;
  const innerId = `sf-inner-${uid}`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Icon */}
      <svg
        width={s}
        height={s}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        role="img"
        aria-label="SpaceForge AI"
      >
        <defs>
          <linearGradient id={bgId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id={innerId} x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="white" stopOpacity="0.95" />
            <stop offset="100%" stopColor="white" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {/* Rounded square background */}
        <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${bgId})`} />
        {/* Subtle inner glow */}
        <rect x="2" y="2" width="44" height="44" rx="12" fill="white" opacity="0.08" />
        {/* Central diamond / data node */}
        <path
          d="M24 10 L34 20 L24 30 L14 20 Z"
          fill={`url(#${innerId})`}
          opacity="0.9"
        />
        {/* Orbit ring */}
        <ellipse cx="24" cy="28" rx="14" ry="8" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
        {/* Bottom data flow lines */}
        <path
          d="M14 32 L18 28 M30 28 L34 32"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.6"
        />
        {/* Small accent nodes */}
        <circle cx="14" cy="32" r="2" fill="white" fillOpacity="0.7" />
        <circle cx="34" cy="32" r="2" fill="white" fillOpacity="0.7" />
        <circle cx="24" cy="38" r="2.5" fill="white" fillOpacity="0.85" />
        {/* Connecting line from diamond to bottom node */}
        <line x1="24" y1="30" x2="24" y2="35.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
      </svg>

      {/* Text */}
      {showText && !iconOnly && (
        <div className="flex items-center gap-0.5">
          <span className={cn(textSizes[size], "font-bold tracking-tight text-foreground")}>
            Space
          </span>
          <span className={cn(textSizes[size], "font-bold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent")}>
            Forge
          </span>
          <span className={cn(
            badgeSizes[size],
            "rounded font-semibold bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 ml-1"
          )}>
            AI
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
