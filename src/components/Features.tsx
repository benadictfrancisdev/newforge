import { memo, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    label: "INSTANT DECISIONS",
    dotColor: "bg-primary",
    title: "Upload data,",
    highlight: "get decisions",
    highlightClass: "text-primary",
    description: "SpaceForge identifies problems, opportunities, and predictions the moment you upload — no dashboards, no setup.",
    cta: { text: "Try It Now", href: "/data-agent" },
    visual: "chart",
  },
  {
    label: "PREDICTIVE INTELLIGENCE",
    dotColor: "bg-accent",
    title: "Know what's next",
    highlight: "before it happens",
    highlightClass: "text-accent",
    description: "Built-in forecasting predicts revenue shifts, churn risks, and growth opportunities before they happen.",
    visual: "wave",
  },
  {
    label: "ASK YOUR BUSINESS",
    dotColor: "bg-purple-500",
    title: "Ask anything",
    highlight: "in plain English",
    highlightClass: "text-purple-400",
    description: "\"Why did revenue drop?\" — get an answer, a chart, and an actionable recommendation. No SQL needed.",
    visual: "code",
  },
  {
    label: "AUTO REPORTS",
    dotColor: "bg-primary",
    title: "Decision reports",
    highlight: "in one click",
    highlightClass: "text-primary",
    description: "Generate PDF reports with decisions, risks, opportunities, and recommendations — ready for your team.",
    visual: "bars",
  },
  {
    label: "CONNECT",
    dotColor: "bg-accent",
    title: "300+",
    highlight: "Integrations",
    highlightClass: "text-accent",
    description: "CSV, Excel, Postgres, S3, Snowflake, and more — plug in any data source instantly.",
    tags: ["csv", "excel", "postgres", "s3"],
    extraTag: "+296 more",
  },
  {
    label: "ENTERPRISE",
    dotColor: "bg-primary",
    title: "Enterprise",
    highlight: "grade security",
    highlightClass: "text-primary",
    description: "SOC2 Type II, GDPR, HIPAA. End-to-end encryption on every byte.",
    badges: ["SOC2", "GDPR", "HIPAA"],
  },
];

/* ── Animated Mini Visuals ── */

const AnimatedChart = () => {
  const [bars, setBars] = useState(() => Array.from({ length: 18 }, () => 30 + Math.random() * 40));

  useEffect(() => {
    const interval = setInterval(() => {
      setBars(prev => prev.map(b => Math.max(20, Math.min(80, b + (Math.random() - 0.5) * 12))));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-6 rounded-xl bg-secondary/50 border border-border p-4 h-32 flex items-end gap-1">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 rounded-sm bg-primary/30 transition-all duration-500" style={{ height: `${h}%` }}>
          <div className="w-full rounded-sm bg-primary transition-all duration-500" style={{ height: `${50 + Math.random() * 40}%` }} />
        </div>
      ))}
    </div>
  );
};

const AnimatedWave = () => {
  const pathRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    let t = 0;
    let frame: number;
    const animate = () => {
      t += 0.04;
      const points: string[] = [];
      for (let i = 0; i <= 40; i++) {
        const x = (i / 40) * 200;
        const y = 30 + Math.sin(i * 0.3 + t) * 15 + Math.sin(i * 0.15 + t * 0.7) * 8;
        points.push(`${i === 0 ? "M" : "L"}${x} ${y}`);
      }
      const d = points.join(" ");
      pathRef.current?.setAttribute("d", d);
      glowRef.current?.setAttribute("d", d);
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="mt-6 h-28 flex items-center justify-center">
      <svg viewBox="0 0 200 60" className="w-full h-full" fill="none">
        <path ref={glowRef} stroke="hsl(30 95% 55% / 0.15)" strokeWidth="8" fill="none" />
        <path ref={pathRef} stroke="hsl(30 95% 55%)" strokeWidth="2.5" fill="none" />
      </svg>
    </div>
  );
};

const AnimatedBars = () => {
  const [heights, setHeights] = useState([40, 55, 70, 50, 80, 65, 90, 75]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeights(prev => prev.map(h => Math.max(25, Math.min(95, h + (Math.random() - 0.5) * 20))));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-6 flex items-end gap-2 h-28 px-4">
      {heights.map((h, i) => (
        <div key={i} className="flex-1 rounded-t-sm transition-all duration-700 ease-out"
          style={{ height: `${h}%`, background: "linear-gradient(to top, hsl(190 95% 50%), hsl(200 80% 60%))" }}
        />
      ))}
    </div>
  );
};

const AnimatedCode = () => {
  const [rows, setRows] = useState("2.1M");

  useEffect(() => {
    const interval = setInterval(() => {
      setRows(`${(1.8 + Math.random() * 0.8).toFixed(1)}M`);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-6 rounded-xl bg-secondary/50 border border-border p-4 font-mono text-xs text-muted-foreground">
      <p><span className="text-primary">→</span> "Why did revenue drop last quarter?"</p>
      <p className="mt-1 text-foreground">Region South declined 22% due to seasonal churn.</p>
      <p className="mt-2 text-primary">✓ {rows} rows analyzed in 0.2s</p>
    </div>
  );
};

const VisualMap: Record<string, () => JSX.Element> = {
  chart: AnimatedChart,
  wave: AnimatedWave,
  bars: AnimatedBars,
  code: AnimatedCode,
};

const Features = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-6 relative z-10">
        {/* Top row */}
        <div className="grid lg:grid-cols-5 gap-6 max-w-6xl mx-auto mb-6">
          <div className="lg:col-span-3 rounded-2xl bg-card border border-border p-8 hover:border-primary/30 transition-all group">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${features[0].dotColor} animate-pulse`} />
              <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">{features[0].label}</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground">{features[0].title}</h3>
            <p className={`text-2xl font-bold ${features[0].highlightClass}`}>{features[0].highlight}</p>
            <p className="text-sm text-muted-foreground mt-3 max-w-md">{features[0].description}</p>
            <AnimatedChart />
            {features[0].cta && (
              <Link to={features[0].cta.href} className="inline-flex items-center gap-2 mt-5 text-sm font-bold text-primary uppercase tracking-wider hover:gap-3 transition-all">
                {features[0].cta.text} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-8 hover:border-accent/30 transition-all">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${features[1].dotColor} animate-pulse`} />
              <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">{features[1].label}</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground">{features[1].title}</h3>
            <p className={`text-2xl font-bold ${features[1].highlightClass}`}>{features[1].highlight}</p>
            <p className="text-sm text-muted-foreground mt-3">{features[1].description}</p>
            <AnimatedWave />
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.slice(2, 5).map((f, idx) => {
            const Visual = f.visual ? VisualMap[f.visual] : null;
            return (
              <div key={idx} className="rounded-2xl bg-card border border-border p-8 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2 h-2 rounded-full ${f.dotColor} animate-pulse`} />
                  <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">{f.label}</span>
                </div>
                <h3 className="text-xl font-bold text-foreground">{f.title}</h3>
                <p className={`text-xl font-bold ${f.highlightClass}`}>{f.highlight}</p>
                <p className="text-sm text-muted-foreground mt-3">{f.description}</p>
                {Visual && <Visual />}
                {f.tags && (
                  <div className="flex flex-wrap gap-2 mt-5">
                    {f.tags.map((t) => (
                      <span key={t} className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:border-primary/30 transition-colors">{t}</span>
                    ))}
                    <span className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground">{f.extraTag}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default memo(Features);
