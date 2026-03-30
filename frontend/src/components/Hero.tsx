import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, TrendingDown, Users, Package, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import DemoModal from "./DemoModal";

const insightPreviews = [
  { icon: TrendingDown, text: "Revenue dropped 14% last month", color: "text-destructive", bg: "bg-destructive/10" },
  { icon: Users, text: "Customer churn increased in new users", color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: Package, text: "Product A drives 60% of growth", color: "text-primary", bg: "bg-primary/10" },
  { icon: TrendingUp, text: "Predicted decline next month", color: "text-destructive", bg: "bg-destructive/10" },
];

const Hero = () => {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-10 overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">

          {/* Left — Copy */}
          <div className="text-left">
            {/* Brand tagline */}
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-primary mb-5 animate-fade-in">
              Your data. Finally talking back.
            </p>

            <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold text-foreground mb-6 animate-slide-up leading-[1.1] tracking-tight">
              Upload your data.{" "}
              <span className="text-primary">
                Get your biggest business problems in 10 seconds.
              </span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-8 animate-slide-up leading-relaxed max-w-lg" style={{ animationDelay: "0.1s" }}>
              SpaceForge analyzes your data and tells you what's working, what's broken, and what to do next.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-start gap-3 mb-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Link to="/data-agent">
                <Button className="rounded-full px-8 py-3.5 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold tracking-wider uppercase btn-shimmer">
                  Analyze My Data <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="rounded-full px-8 py-3.5 gap-2 border-border text-foreground hover:bg-secondary text-sm font-bold tracking-wider uppercase"
                onClick={() => setDemoOpen(true)}
              >
                <Play className="w-4 h-4" /> Try Demo Dataset
              </Button>
            </div>

            {/* Trust line */}
            <p className="text-xs text-muted-foreground animate-slide-up" style={{ animationDelay: "0.25s" }}>
              <span className="text-primary font-semibold">SOC2 & GDPR compliant</span> · Enterprise-grade security · 99.9% uptime
            </p>
          </div>

          {/* Right — Insight Preview Card */}
          <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-6 shadow-card">
              {/* Card header */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground">
                  AI Business Brain — Live Insights
                </span>
              </div>

              {/* Insight rows */}
              <div className="space-y-3">
                {insightPreviews.map((insight, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/40 transition-all hover:bg-secondary/60"
                    style={{ animationDelay: `${0.35 + i * 0.08}s` }}
                  >
                    <div className={`w-8 h-8 rounded-lg ${insight.bg} flex items-center justify-center shrink-0`}>
                      <insight.icon className={`w-4 h-4 ${insight.color}`} />
                    </div>
                    <p className="text-sm font-medium text-foreground">{insight.text}</p>
                  </div>
                ))}
              </div>

              {/* Card footer */}
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                  4 insights · 10s analysis
                </span>
                <Link to="/data-agent" className="text-xs font-bold text-primary hover:underline">
                  View Full Report →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
};

export default Hero;
