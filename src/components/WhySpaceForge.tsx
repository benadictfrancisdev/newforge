import { memo } from "react";
import { Activity, Layers, LayoutGrid, Database, Shield, Workflow, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const modules = [
  { icon: Activity, title: "Stream Analytics", description: "Process infinite event streams in real-time with sub-millisecond latency. Built on our proprietary plasma-core runtime.", color: "text-primary", bgColor: "bg-primary/10", link: "/data-agent" },
  { icon: Layers, title: "AI Forecasting", description: "Autoregressive and transformer-based forecasting built directly into your pipeline. No separate ML infra needed.", color: "text-accent", bgColor: "bg-accent/10", link: "/data-agent" },
  { icon: LayoutGrid, title: "Visual Dashboards", description: "Drag-and-drop dashboards that auto-wire to your streams. Share live views with stakeholders in one click.", color: "text-purple-400", bgColor: "bg-purple-400/10", link: "/data-agent" },
  { icon: Database, title: "Data Lake", description: "Unified storage layer that scales infinitely. Query historical and live data with the same interface.", color: "text-primary", bgColor: "bg-primary/10", link: "/data-agent" },
  { icon: Shield, title: "Governance", description: "Role-based access, audit trails, data lineage tracking. Enterprise-grade compliance built into every layer.", color: "text-accent", bgColor: "bg-accent/10", link: "/data-agent" },
  { icon: Workflow, title: "Automation", description: "Build complex data workflows visually. Schedule, trigger, and chain operations with zero-code orchestration.", color: "text-purple-400", bgColor: "bg-purple-400/10", link: "/data-agent" },
];

const WhySpaceForge = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Section badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            What We Build
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-center text-foreground mb-4 tracking-tight">
          Core modules of{" "}
          <br className="hidden md:block" />
          <span className="text-accent">the SpaceForge stack</span>
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-16">
          Every tool engineered to perform under the most demanding data workloads on the planet.
        </p>

        {/* Module Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {modules.map((mod, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-8 hover:border-primary/30 transition-colors group">
              <div className={`w-12 h-12 rounded-xl ${mod.bgColor} flex items-center justify-center mb-6`}>
                <mod.icon className={`w-6 h-6 ${mod.color}`} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{mod.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{mod.description}</p>
              <Link to={mod.link} className={`inline-flex items-center gap-1.5 text-xs font-bold ${mod.color} uppercase tracking-wider group-hover:gap-2.5 transition-all`}>
                Learn more <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(WhySpaceForge);
