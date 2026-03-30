import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";
import FeatureGate from "./FeatureGate";
import { computeDatasetProfile } from "@/lib/statisticsEngine";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const KPIComparisonCards = ({ data, columns, columnTypes, datasetName }: Props) => {
  const profile = useMemo(() => computeDatasetProfile(data, columns, columnTypes), [data, columns, columnTypes]);

  // Build comparison cards from local stats — no AI needed
  const cards = useMemo(() => {
    return profile.kpis.map(kpi => ({
      metric: kpi.name,
      current_val: kpi.value,
      delta_pct: kpi.changePct,
      direction: kpi.trend,
      business_context: kpi.insight,
    }));
  }, [profile.kpis]);

  return (
    <FeatureGate feature="KPI Comparison Cards" creditCost={0} requiredPlan="free">
      <div className="space-y-4">
        <Card className="linear-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              KPI Comparison Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Auto-detected {cards.length} KPIs from your dataset — computed locally, no AI credits used.
            </p>
          </CardContent>
        </Card>

        {cards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map((card, i) => (
              <Card key={i} className="linear-card overflow-hidden">
                <CardContent className="p-4">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">{card.metric}</p>
                  <p className="text-xl font-bold text-foreground">
                    {card.current_val?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                    card.direction === "up" ? "text-green-500" : card.direction === "down" ? "text-red-500" : "text-muted-foreground"
                  }`}>
                    {card.direction === "up" ? <ArrowUpRight className="w-3 h-3" /> : card.direction === "down" ? <ArrowDownRight className="w-3 h-3" /> : null}
                    {card.delta_pct > 0 ? "+" : ""}{card.delta_pct?.toFixed(2)}%
                    <span className="text-muted-foreground ml-1 font-normal">vs prev</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{card.business_context}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
};

export default KPIComparisonCards;
