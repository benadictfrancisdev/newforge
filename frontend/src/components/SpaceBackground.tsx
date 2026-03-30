import { useTheme } from "@/hooks/useTheme";

const SpaceBackground = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {!isLight && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            backgroundImage: "url('/images/space-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: 0.7,
          }}
        />
      )}
      {isLight && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            backgroundImage: "url('/images/light-bg.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: 0.35,
          }}
        />
      )}
      {isLight && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(220 25% 97% / 0.7) 0%, hsl(210 40% 96% / 0.5) 40%, hsl(220 25% 97% / 0.75) 100%)",
          }}
        />
      )}
      {!isLight && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(222 38% 7% / 0.4) 0%, hsl(222 38% 7% / 0.25) 50%, hsl(222 38% 7% / 0.5) 100%)",
          }}
        />
      )}
      <div className="absolute inset-0 space-vignette" />
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background via-background/40 to-transparent" />
    </div>
  );
};

export default SpaceBackground;
