import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, TrendingDown, Users, Package, TrendingUp, Brain, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import DemoModal from "./DemoModal";

const insightPreviews = [
  { icon: TrendingDown, text: "Revenue dropped 14% — Region South is the root cause", color: "text-rose-400",    bg: "bg-rose-500/10",   border: "border-rose-500/20" },
  { icon: Users,        text: "New customers aren't returning after first purchase",   color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
  { icon: Package,      text: "Product A drives 60% of total growth",                  color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20" },
  { icon: TrendingUp,   text: "Sales predicted to decline 8% next month",             color: "text-rose-400",    bg: "bg-rose-500/10",   border: "border-rose-500/20" },
];

const stats = [
  { value: "10s",   label: "Analysis time" },
  { value: "500K+", label: "Rows supported" },
  { value: "60+",   label: "AI features" },
  { value: "Free",  label: "To start" },
];

export default function Hero() {
  const [demoOpen, setDemoOpen]     = useState(false);
  const [visibleIdx, setVisibleIdx] = useState(-1);
  const [typing, setTyping]         = useState(false);

  // Staggered card animation on mount
  useEffect(() => {
    const timers = insightPreviews.map((_, i) =>
      setTimeout(() => setVisibleIdx(i), 800 + i * 280)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Subtle typing indicator
  useEffect(() => {
    const id = setInterval(() => setTyping(p => !p), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-10 overflow-hidden">

      {/* Radial hero glow — positioned behind content */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse 70% 55% at 50% 45%, hsl(210 100% 50% / 0.07) 0%, transparent 70%)",
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-14 items-center max-w-6xl mx-auto">

          {/* ── Left: Copy ─────────────────────────────── */}
          <div className="text-left">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.22em] uppercase text-cyan-400 mb-5 animate-fade-in bg-cyan-500/8 border border-cyan-500/25 rounded-full px-4 py-1.5 star-pulse">
              <Brain className="w-3.5 h-3.5" />
              AI Decision Intelligence Engine
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-black text-foreground mb-6 animate-slide-up leading-[1.05] tracking-tight">
              Upload your data.{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #34d399 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Get decisions,<br />not dashboards.
              </span>
            </h1>

            {/* Sub */}
            <p className="text-base md:text-lg text-muted-foreground mb-8 animate-slide-up leading-relaxed max-w-lg" style={{ animationDelay: "0.1s" }}>
              SpaceForge turns raw data into instant insights, predictions, and recommendations.{" "}
              <span className="text-foreground font-semibold">No analyst required.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-start gap-3 mb-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Link to="/data-agent">
                <Button
                  className="rounded-full px-8 py-3.5 gap-2 text-sm font-black tracking-widest uppercase shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/40"
                  style={{
                    background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  Analyze My Data <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="rounded-full px-8 py-3.5 gap-2 border-border text-muted-foreground hover:bg-muted hover:border-primary/40 text-sm font-bold tracking-widest uppercase transition-all duration-300"
                onClick={() => setDemoOpen(true)}
              >
                <Play className="w-4 h-4" /> Try Demo Dataset
              </Button>
            </div>

            {/* 3-step flow */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground animate-slide-up mb-10" style={{ animationDelay: "0.25s" }}>
              <span className="font-bold text-foreground">Upload</span>
              <span className="text-muted-foreground/50">→</span>
              <span className="font-bold text-foreground">AI Analysis</span>
              <span className="text-muted-foreground/50">→</span>
              <span className="font-bold text-primary">Instant Decisions</span>
              <span className="ml-2 text-muted-foreground/50 flex items-center gap-1">
                · 10 seconds
                <span className={`inline-block w-1.5 h-3.5 bg-primary rounded-sm ml-1 transition-opacity ${typing ? "opacity-100" : "opacity-0"}`} />
              </span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: "0.5s" }}>
              {stats.map(s => (
                <div key={s.label} className="text-center px-2 py-2.5 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm">
                  <div className="text-lg font-black text-primary">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Live Insight Card ───────────────── */}
          <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            {/* Outer glow */}
            <div className="relative">
              <div
                className="absolute -inset-3 rounded-3xl opacity-30 blur-2xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse, #0ea5e9 0%, #6366f1 60%, transparent 100%)" }}
              />

              <div
                className="relative rounded-2xl p-6 border bg-card/90 dark:bg-[rgba(10,15,35,0.85)] border-border/30 dark:border-[rgba(99,102,241,0.3)] backdrop-blur-xl shadow-lg dark:shadow-[0_0_0_1px_rgba(56,189,248,0.1),0_24px_64px_rgba(0,0,0,0.5)]"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 live-pulse" />
                    <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                      Decision Intelligence — Live
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                    <Zap className="w-3 h-3" /> AI Active
                  </div>
                </div>

                {/* Insight rows — staggered in */}
                <div className="space-y-2.5">
                  {insightPreviews.map((insight, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all duration-500 ${
                        i <= visibleIdx
                          ? `opacity-100 translate-x-0 ${insight.bg} ${insight.border}`
                          : "opacity-0 translate-x-4"
                      }`}
                      style={{ transitionDelay: `${i * 60}ms` }}
                    >
                      <div className={`w-8 h-8 rounded-lg ${insight.bg} border ${insight.border} flex items-center justify-center shrink-0`}>
                        <insight.icon className={`w-4 h-4 ${insight.color}`} />
                      </div>
                      <p className="text-sm font-medium text-foreground">{insight.text}</p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-500/60" />
                    4 decisions · 10s analysis
                  </span>
                  <Link
                    to="/data-agent"
                    className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    View Full Report <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Trust badges below card */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground font-medium">
              {["🔒 Privacy-first AI","⚡ No code required","🌏 Global + India SMB","🆓 Free to start"].map(b => (
                <span key={b} className="px-3 py-1.5 rounded-full bg-muted/60 border border-border/40">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
}
