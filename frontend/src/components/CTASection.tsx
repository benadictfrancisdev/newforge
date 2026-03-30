import { memo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const CTASection = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Glow */}
      {!isLight && (
        <div className="absolute inset-0">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(26,111,244,0.12) 0%, transparent 65%)",
              filter: "blur(60px)",
            }}
          />
        </div>
      )}

      <div className="container mx-auto px-6 relative z-10">
        <div
          className="max-w-4xl mx-auto text-center relative p-12 md:p-16 backdrop-blur-xl"
          style={{
            background: `hsl(var(--glass-card-bg))`,
            borderRadius: "32px",
            border: `1px solid hsl(var(--glass-card-border))`,
          }}
        >
          {/* Top glow line */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: isLight
                ? "linear-gradient(90deg, transparent, hsl(216 90% 53% / 0.3), hsl(258 78% 57% / 0.2), transparent)"
                : "linear-gradient(90deg, transparent, #3b8ef8, #8b5cf6, transparent)",
            }}
          />

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{
              background: isLight ? "rgba(26,111,244,0.06)" : "rgba(26,111,244,0.08)",
              border: "1px solid rgba(59,142,248,0.3)",
              boxShadow: isLight ? "none" : "0 0 15px rgba(26,111,244,0.1)",
            }}
          >
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium" style={{ color: isLight ? "#1a6ff4" : "#4da6ff" }}>Start Free Today</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Transform Your
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, #3b8ef8, #06d6f7, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Data Workflow?
            </span>
          </h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Join thousands of data professionals who have streamlined their analytics with SpaceForge.
            No credit card required to get started.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" className="group">
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="glass" size="xl">
              Schedule a Demo
            </Button>
          </div>

          <div className="mt-12 pt-8" style={{ borderTop: `1px solid hsl(var(--glass-card-border))` }}>
            <p className="text-sm text-muted-foreground mb-4">Trusted by data teams at</p>
            <div className="flex items-center justify-center gap-8 opacity-40">
              <div className="text-xl font-semibold text-muted-foreground">Acme Corp</div>
              <div className="text-xl font-semibold text-muted-foreground">TechFlow</div>
              <div className="text-xl font-semibold text-muted-foreground">DataPro</div>
              <div className="text-xl font-semibold text-muted-foreground hidden sm:block">Analytics+</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(CTASection);
