import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { summarizeDataset } from "@/lib/statisticalSummarizer";
import { Eye, Loader2, RefreshCw, AlertTriangle, CheckCircle, Search, XCircle } from "lucide-react";

interface ProactiveAnomalyWatchProps {
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
  columnTypes?: Record<string, string>;
}

interface Anomaly {
  column: string;
  type: "point" | "contextual" | "collective";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  value: string;
  z_score: number;
  baseline: string;
  suggestion: "investigate" | "ignore" | "recheck_source";
  explanation: string;
}

interface WatchResult {
  total_anomalies: number;
  severity_breakdown: { critical: number; high: number; medium: number; low: number };
  anomalies: Anomaly[];
  overall_assessment: string;
  data_drift_detected: boolean;
  drift_description: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const TYPE_LABELS: Record<string, string> = {
  point: "Point Anomaly",
  contextual: "Contextual",
  collective: "Collective",
};

const SUGGESTION_ICONS: Record<string, typeof Search> = {
  investigate: Search,
  ignore: CheckCircle,
  recheck_source: XCircle,
};

const ProactiveAnomalyWatch = ({ data, columns, datasetName, columnTypes }: ProactiveAnomalyWatchProps) => {
  const { user } = useAuth();
  const [result, setResult] = useState<WatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const scan = async () => {
    setLoading(true);
    try {
      const summary = summarizeDataset(data, columns);
      const { data: res, error } = await supabase.functions.invoke("data-agent", {
        body: {
          action: "proactive_anomaly_watch",
          data: data.slice(0, 50),
          columns,
          datasetName,
          userId: user?.id,
          dataSummary: JSON.stringify(summary),
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");
      if (res?.error) throw new Error(res.error);
      setResult(res.result);
      toast.success(`Scan complete: ${res.result?.total_anomalies || 0} anomalies detected`);
    } catch (e: any) {
      toast.error(e.message || "Failed to scan for anomalies");
    } finally {
      setLoading(false);
    }
  };

  const filteredAnomalies = useMemo(() => {
    if (!result) return [];
    if (filter === "all") return result.anomalies;
    return result.anomalies.filter(a => a.severity === filter);
  }, [result, filter]);

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Proactive Anomaly Watch
            </CardTitle>
            <Button size="sm" onClick={scan} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              {result ? "Re-scan" : "Scan Data"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monitors data for point, contextual, and collective anomalies. Classifies and suggests actions.
          </p>
        </CardHeader>
      </Card>

      {result && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="border-border/50 col-span-2 sm:col-span-1">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{result.total_anomalies}</p>
                <p className="text-[10px] text-muted-foreground">Total Anomalies</p>
              </CardContent>
            </Card>
            {Object.entries(result.severity_breakdown).map(([sev, count]) => (
              <Card key={sev} className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className={`text-lg font-bold ${sev === "critical" ? "text-red-500" : sev === "high" ? "text-orange-500" : sev === "medium" ? "text-yellow-500" : "text-blue-500"}`}>{count}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{sev}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Drift Alert */}
          {result.data_drift_detected && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-yellow-600">Data Drift Detected</p>
                  <p className="text-xs text-muted-foreground">{result.drift_description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50">
            <CardContent className="pt-4">
              <p className="text-sm text-foreground/90">{result.overall_assessment}</p>
            </CardContent>
          </Card>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {["all", "critical", "high", "medium", "low"].map(f => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="text-xs capitalize">
                {f} {f !== "all" && `(${result.severity_breakdown[f as keyof typeof result.severity_breakdown] || 0})`}
              </Button>
            ))}
          </div>

          {/* Anomaly List */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Anomalies ({filteredAnomalies.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {filteredAnomalies.map((a, i) => {
                    const SugIcon = SUGGESTION_ICONS[a.suggestion] || Search;
                    return (
                      <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-mono">{a.column}</Badge>
                          <Badge variant="outline" className={`text-[9px] ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</Badge>
                          <Badge variant="outline" className="text-[9px]">{TYPE_LABELS[a.type]}</Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">z={a.z_score.toFixed(2)}σ</span>
                        </div>
                        <p className="text-xs">{a.description}</p>
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                          <span>Value: <strong>{a.value}</strong></span>
                          <span>Baseline: {a.baseline}</span>
                        </div>
                        <div className="flex items-center gap-2 p-1.5 rounded bg-muted/50">
                          <SugIcon className="w-3 h-3 text-primary" />
                          <span className="text-[10px] font-medium capitalize">{a.suggestion.replace("_", " ")}</span>
                          <span className="text-[10px] text-muted-foreground">— {a.explanation}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ProactiveAnomalyWatch;
