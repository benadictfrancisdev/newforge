import { memo } from "react";
import { useTheme } from "@/hooks/useTheme";
import {
  Database,
  FileSpreadsheet,
  FileJson,
  BarChart3,
  Cloud,
  Code2,
  BrainCircuit,
  Table2,
  PieChart,
  Webhook,
} from "lucide-react";

const integrations = [
  { icon: FileSpreadsheet, name: "Excel", color: "#22c55e" },
  { icon: FileJson, name: "JSON", color: "#f59e0b" },
  { icon: Database, name: "SQL", color: "#3b82f6" },
  { icon: Table2, name: "CSV", color: "#06b6d4" },
  { icon: BarChart3, name: "Power BI", color: "#f2c811" },
  { icon: PieChart, name: "Tableau", color: "#e97627" },
  { icon: Code2, name: "Python", color: "#3776ab" },
  { icon: Cloud, name: "APIs", color: "#8b5cf6" },
  { icon: BrainCircuit, name: "AI Models", color: "#ec4899" },
  { icon: Webhook, name: "Webhooks", color: "#00c8ff" },
];

const Integrations = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <section id="integrations" className="py-24 relative overflow-hidden">
      {/* Background glow */}
      {!isLight && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px]"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(0,200,255,0.08) 0%, transparent 65%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />
      )}

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Seamless
            <span
              style={{
                background:
                  "linear-gradient(135deg, #3b8ef8, #06d6f7, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {" "}Integrations
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Connect with all your favorite data tools and platforms. Import from
            any source, export anywhere.
          </p>
        </div>

        {/* Integration grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-5xl mx-auto">
          {integrations.map((item, i) => (
            <div
              key={item.name}
              className="group relative flex flex-col items-center gap-3 p-6 rounded-2xl transition-all duration-300 backdrop-blur-xl"
              style={{
                background: `hsl(var(--glass-card-bg))`,
                border: `1px solid hsl(var(--glass-card-border))`,
                animationDelay: `${i * 0.06}s`,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.transform = "translateY(-6px) scale(1.04)";
                el.style.borderColor = item.color + "66";
                el.style.boxShadow = `0 12px 40px ${item.color}22, 0 0 0 1px ${item.color}33`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.transform = "";
                el.style.borderColor = "";
                el.style.boxShadow = "";
              }}
            >
              {/* Top glow line */}
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `linear-gradient(90deg, transparent, ${item.color}, transparent)`,
                }}
              />

              {/* Icon container */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300"
                style={{
                  background: isLight
                    ? `${item.color}12`
                    : `${item.color}18`,
                  border: `1px solid ${item.color}30`,
                }}
              >
                <item.icon
                  className="w-7 h-7 transition-colors duration-300"
                  style={{ color: item.color }}
                />
              </div>

              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                {item.name}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <p className="text-center text-sm text-muted-foreground mt-10">
          …and many more. Bring your own data source via our open API.
        </p>
      </div>
    </section>
  );
};

export default memo(Integrations);
