import { memo } from "react";
import { Bot, LayoutDashboard, FileText, MessageSquare } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const features = [
  {
    icon: Bot,
    title: "AI Agents for Cleaning & Insights",
    description: "Intelligent agents automatically detect anomalies, clean messy data, fill missing values, and surface hidden patterns in your datasets.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard Generator",
    description: "Transform raw data into beautiful, interactive dashboards with a single click. Customize charts, graphs, and visualizations effortlessly.",
  },
  {
    icon: FileText,
    title: "PDF Export",
    description: "Generate professional reports and export your insights as polished PDF documents ready for presentations and stakeholders.",
  },
  {
    icon: MessageSquare,
    title: "Chat with Your Data",
    description: "Ask questions in natural language and get instant answers. Our AI understands your data and provides meaningful responses.",
  },
];

const Features = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <section id="features" className="py-24 relative">
      {/* Background Glows - hidden in light mode */}
      {!isLight && (
        <>
          <div
            className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full blur-[150px]"
            style={{ background: "rgba(26,111,244,0.1)" }}
          />
          <div
            className="absolute top-1/3 right-0 w-[300px] h-[300px] rounded-full blur-[120px]"
            style={{ background: "rgba(108,61,232,0.08)" }}
          />
        </>
      )}

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Powerful Features for
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, #3b8ef8, #06d6f7, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Data Excellence
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to turn raw data into valuable insights, all powered by cutting-edge AI technology.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-8 rounded-2xl transition-all duration-300 backdrop-blur-xl"
              style={{
                background: `hsl(var(--glass-card-bg))`,
                border: `1px solid hsl(var(--glass-card-border))`,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(-6px)";
                el.style.borderColor = isLight ? "hsl(220 33% 12% / 0.15)" : "rgba(59,142,248,0.4)";
                el.style.boxShadow = isLight
                  ? "0 20px 60px hsl(220 33% 12% / 0.08)"
                  : "0 20px 60px rgba(26,111,244,0.15)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(0)";
                el.style.borderColor = "";
                el.style.boxShadow = "none";
              }}
            >
              {/* Top glow line */}
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: isLight
                    ? "linear-gradient(90deg, transparent, hsl(216 90% 53% / 0.4), transparent)"
                    : "linear-gradient(90deg, transparent, #3b8ef8, transparent)",
                }}
              />

              {/* Icon */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                style={{
                  background: isLight
                    ? "rgba(26,111,244,0.08)"
                    : "linear-gradient(135deg, rgba(26,111,244,0.2), rgba(108,61,232,0.2))",
                  border: isLight
                    ? "1px solid rgba(26,111,244,0.15)"
                    : "1px solid rgba(59,142,248,0.25)",
                }}
              >
                <feature.icon className="w-7 h-7 text-primary" />
              </div>

              <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors duration-200">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(Features);
