import { memo } from "react";
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
  { icon: FileSpreadsheet, name: "Excel", color: "hsl(142 71% 45%)" },
  { icon: FileJson, name: "JSON", color: "hsl(38 92% 50%)" },
  { icon: Database, name: "SQL", color: "hsl(217 91% 60%)" },
  { icon: Table2, name: "CSV", color: "hsl(175 82% 32%)" },
  { icon: BarChart3, name: "Power BI", color: "hsl(45 93% 47%)" },
  { icon: PieChart, name: "Tableau", color: "hsl(20 90% 48%)" },
  { icon: Code2, name: "Python", color: "hsl(213 65% 45%)" },
  { icon: Cloud, name: "APIs", color: "hsl(262 83% 58%)" },
  { icon: BrainCircuit, name: "AI Models", color: "hsl(330 81% 60%)" },
  { icon: Webhook, name: "Webhooks", color: "hsl(175 82% 32%)" },
];

const Integrations = () => {
  return (
    <section id="integrations" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-4">Integrations</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Seamless <span className="text-primary">Integrations</span>
          </h2>
          <p className="text-base text-muted-foreground">
            Connect with all your favorite data tools and platforms. Import from any source, export anywhere.
          </p>
        </div>

        {/* Integration grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-5xl mx-auto">
          {integrations.map((item) => (
            <div
              key={item.name}
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border transition-all duration-300 hover:shadow-md hover:-translate-y-1"
            >
              {/* Icon container */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${item.color}15` }}
              >
                <item.icon className="w-6 h-6" style={{ color: item.color }} />
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
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
