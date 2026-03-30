import { Rocket, Cpu, Globe, GitBranch, Layers, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const roadmap = [
  {
    icon: Cpu,
    title: "Self-Healing Pipelines",
    desc: "ADA will auto-detect broken data pipelines, fix schema drift, and re-run analyses — zero downtime, zero manual fixes.",
    status: "In Development",
  },
  {
    icon: GitBranch,
    title: "Multi-Source Fusion",
    desc: "Combine CRM, ERP, analytics, and IoT streams into a unified data model. ADA cross-references sources to find hidden correlations.",
    status: "Coming Soon",
  },
  {
    icon: Globe,
    title: "Global Knowledge Graph",
    desc: "ADA will build a living knowledge graph of your business — connecting entities, events, and metrics across every dataset.",
    status: "Research",
  },
  {
    icon: Layers,
    title: "Adaptive Learning",
    desc: "The more you use ADA, the smarter it gets. It learns your business patterns, preferences, and decision-making style.",
    status: "In Development",
  },
  {
    icon: Workflow,
    title: "Autonomous Workflows",
    desc: "Trigger Slack alerts, update dashboards, send reports, and execute API calls — all orchestrated by ADA based on data events.",
    status: "Coming Soon",
  },
  {
    icon: Rocket,
    title: "Predictive Actions",
    desc: "Move from reactive to proactive. ADA will predict outcomes before they happen and recommend preemptive actions.",
    status: "Research",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "In Development":
      return "bg-primary/10 text-primary border-primary/20";
    case "Coming Soon":
      return "bg-accent/10 text-accent-foreground border-accent/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const ADAFutureSection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">The Future of ADA</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            What's Next for{" "}
            <span className="text-primary">ADA</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            ADA is evolving. Here's a glimpse at the roadmap — from self-healing pipelines to predictive 
            autonomous actions that transform how you interact with data.
          </p>
        </div>

        {/* Roadmap cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roadmap.map((item, i) => (
            <div
              key={i}
              className="group relative p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <Badge variant="outline" className={`text-[10px] ${getStatusColor(item.status)}`}>
                  {item.status}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ADAFutureSection;
