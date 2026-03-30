import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const Logo = ({ className, size = "md" }: LogoProps) => {
  const heightClasses = {
    sm: "h-8",
    md: "h-9",
    lg: "h-12",
    xl: "h-16"
  };

  return (
    <div className={cn("flex items-center", className)}>
      <img
        src="/images/spaceforge-logo.png"
        alt="SpaceForge AI"
        className={cn(heightClasses[size], "w-auto object-contain")}
      />
    </div>
  );
};

export default Logo;
