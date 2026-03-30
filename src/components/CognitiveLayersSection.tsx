import { FlaskConical, LineChart, Building2, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const layers = [
  {
    icon: LineChart,
    name: "Analyst",
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    borderColor: "border-cyan-400/20",
    hoverBorder: "hover:border-cyan-400/40",
    shadowColor: "hover:shadow-cyan-400/10",
    desc: "Built for business analysts and data teams. Get instant trend detection, anomaly alerts, KPI dashboards, and natural language queries on any dataset.",
    features: ["Trend Detection", "KPI Dashboards", "Anomaly Alerts", "Natural Language Queries"],
  },
  {
    icon: FlaskConical,
    name: "Scientist",
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    borderColor: "border-green-400/20",
    hoverBorder: "hover:border-green-400/40",
    shadowColor: "hover:shadow-green-400/10",
    desc: "Designed for researchers and data scientists. Run hypothesis tests, build ML models, engineer features, and generate reproducible research papers.",
    features: ["Hypothesis Testing", "ML Model Arena", "Feature Engineering", "Research Paper Gen"],
  },
  {
    icon: Building2,
    name: "Organization",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    borderColor: "border-yellow-400/20",
    hoverBorder: "hover:border-yellow-400/40",
    shadowColor: "hover:shadow-yellow-400/10",
    desc: "Purpose-built for founders and executives. Business health scores, investor reports, risk engines, scenario simulations, and strategic action plans.",
    features: ["Business Health Score", "Investor Reports", "Risk Engine", "Scenario Simulation"],
  },
];

const CognitiveLayersSection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Cognitive Layers</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            One Platform,{" "}
            <span className="text-primary">Three Perspectives</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            SpaceForge adapts to your role. Switch between Analyst, Scientist, and Organization layers — 
            each with specialized tools, workflows, and AI behaviors tailored to how you think.
          </p>
        </div>

        {/* Layer cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {layers.map((layer, i) => (
            <div
              key={i}
              className={`group relative p-8 rounded-2xl border ${layer.borderColor} bg-card/50 backdrop-blur-sm ${layer.hoverBorder} hover:shadow-xl ${layer.shadowColor} transition-all duration-300`}
            >
              {/* Icon + Name */}
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-14 h-14 rounded-xl ${layer.bgColor} flex items-center justify-center`}>
                  <layer.icon className={`w-7 h-7 ${layer.color}`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{layer.name}</h3>
                  <span className={`text-xs font-medium ${layer.color}`}>Cognitive Layer</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">{layer.desc}</p>

              {/* Features */}
              <div className="space-y-2">
                {layer.features.map((feat, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${layer.bgColor} ${layer.color}`} />
                    <span className="text-sm text-foreground">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/cognitive">
            <Button size="lg" variant="outline" className="rounded-full px-8 border-primary/30 hover:bg-primary/10 text-foreground">
              <Brain className="w-5 h-5 mr-2 text-primary" />
              Explore Cognitive Layers
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CognitiveLayersSection;
