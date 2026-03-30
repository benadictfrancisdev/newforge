import { memo } from "react";
import { Upload, Cpu, BarChart3, Download } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Your Data",
    description: "Simply drag and drop your CSV, Excel, or JSON files. We support all major data formats.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI Processing",
    description: "Our intelligent agents automatically clean, validate, and analyze your data for insights.",
  },
  {
    icon: BarChart3,
    step: "03",
    title: "Explore Insights",
    description: "View interactive dashboards, ask questions, and discover hidden patterns in your data.",
  },
  {
    icon: Download,
    step: "04",
    title: "Export & Share",
    description: "Generate beautiful PDF reports or export your dashboards for stakeholder presentations.",
  },
];

const HowItWorks = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: isLight
            ? "linear-gradient(180deg, transparent 0%, hsl(var(--glass-section-overlay)) 50%, transparent 100%)"
            : "linear-gradient(180deg, transparent 0%, rgba(10,20,45,0.3) 50%, transparent 100%)",
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            How It
            <span
              style={{
                background: "linear-gradient(135deg, #3b8ef8, #06d6f7, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            > Works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From raw data to actionable insights in four simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {index < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-10 left-[60%] w-full h-px"
                  style={{
                    background: isLight
                      ? "linear-gradient(90deg, hsl(216 90% 53% / 0.2) 0%, hsl(258 78% 57% / 0.08) 100%)"
                      : "linear-gradient(90deg, rgba(59,142,248,0.4) 0%, rgba(108,61,232,0.15) 100%)",
                  }}
                />
              )}

              <div className="text-center group">
                <div className="text-6xl font-bold mb-4" style={{ color: isLight ? "rgba(26,111,244,0.08)" : "rgba(59,142,248,0.1)" }}>
                  <span className="group-hover:text-primary/20 transition-colors duration-300">{step.step}</span>
                </div>

                <div
                  className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 transition-all duration-300"
                  style={{
                    background: isLight
                      ? "rgba(26,111,244,0.08)"
                      : "linear-gradient(135deg, rgba(26,111,244,0.15), rgba(108,61,232,0.15))",
                    border: isLight
                      ? "1px solid rgba(26,111,244,0.15)"
                      : "1px solid rgba(59,142,248,0.2)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.boxShadow = isLight ? "0 0 25px rgba(26,111,244,0.15)" : "0 0 25px rgba(26,111,244,0.3)";
                    el.style.borderColor = isLight ? "rgba(26,111,244,0.3)" : "rgba(59,142,248,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.boxShadow = "none";
                    el.style.borderColor = isLight ? "rgba(26,111,244,0.15)" : "rgba(59,142,248,0.2)";
                  }}
                >
                  <step.icon className="w-9 h-9 text-primary" />
                </div>

                <h3 className="text-xl font-semibold mb-3 text-foreground">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(HowItWorks);
