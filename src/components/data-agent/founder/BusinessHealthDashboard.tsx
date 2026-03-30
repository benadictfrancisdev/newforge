import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, Clock, Flame, Download } from "lucide-react";
import { safeInvoke } from "@/services/api";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const BusinessHealthDashboard = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const { exportToPdf } = usePdfExport();

  const analyze = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await safeInvoke("founder_health", {
        data: data.slice(0, 200), columns, datasetName,
      });
      if (error) throw new Error(error);
      setMetrics(result);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!metrics) return;
    const sections: any[] = [];
    if (metrics.kpis) {
      sections.push({
        title: "Key Performance Indicators",
        content: "",
        type: "table",
        tableData: {
          headers: ["KPI", "Value", "Change", "Trend"],
          rows: metrics.kpis.map((k: any) => [k.name || "", k.value || "", k.change || "", k.trend || ""]),
        },
      });
    }
    if (metrics.health_score != null) {
      sections.push({ title: "Overall Business Health", content: `Score: ${metrics.health_score}/100\n\n${metrics.summary || ""}`, type: "text" });
    }
    exportToPdf({
      title: "Business Health Dashboard",
      datasetName,
      sections,
      recommendations: metrics.recommendations || [],
    });
  };

  const kpiIcons: Record<string, any> = {
    cac: DollarSign, ltv: DollarSign, churn: Users, burn_rate: Flame, runway: Clock,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Business Health Dashboard</h2>
          <p className="text-sm text-muted-foreground">Auto-calculates CAC, LTV, churn, burn rate, runway</p>
        </div>
        <div className="flex gap-2">
          {metrics && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />PDF
            </Button>
          )}
          <Button onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? "Analyzing..." : "Run Health Check"}
          </Button>
        </div>
      </div>

      {metrics && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {metrics.kpis?.map((kpi: any, i: number) => {
              const Icon = kpiIcons[kpi.key] || TrendingUp;
              return (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">{kpi.name}</p>
                        <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {kpi.trend === "up" ? (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-500" />
                          )}
                          <span className="text-xs text-muted-foreground">{kpi.change}</span>
                        </div>
                      </div>
                      <Icon className="w-8 h-8 text-primary/20" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {metrics.health_score != null && (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="text-sm">Overall Business Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-5xl font-bold text-foreground">{metrics.health_score}<span className="text-2xl text-muted-foreground">/100</span></div>
                    <Badge className="text-sm px-3 py-1" variant={metrics.health_score > 70 ? "default" : metrics.health_score > 40 ? "secondary" : "destructive"}>
                      {metrics.health_score > 70 ? "Healthy" : metrics.health_score > 40 ? "Moderate" : "At Risk"}
                    </Badge>
                  </div>
                  <div className="flex-1 w-full">
                    <Progress value={metrics.health_score} className="h-4" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>Critical</span><span>Moderate</span><span>Healthy</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">{metrics.summary}</p>
              </CardContent>
            </Card>
          )}

          {metrics.recommendations && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Recommendations</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {metrics.recommendations.map((r: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>{r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default BusinessHealthDashboard;
