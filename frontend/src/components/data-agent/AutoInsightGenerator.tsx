import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, TrendingUp, Target, RefreshCw, ChevronDown, ChevronUp, Sparkles, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import type { DatasetState } from "@/pages/DataAgent";

interface AutoInsightGeneratorProps {
  dataset: DatasetState;
  onNavigateToAnalyze?: () => void;
}

interface InsightResult {
  summary: string;
  insights: Array<{ title: string; description: string; importance: string }>;
  patterns: Array<{ name: string; description: string }>;
  recommendations: Array<{ action: string; reason: string }>;
}

const AutoInsightGenerator = ({ dataset, onNavigateToAnalyze }: AutoInsightGeneratorProps) => {
  const [result, setResult] = useState<InsightResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggeredRef = useRef<string | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dataToAnalyze = dataset.cleanedData || dataset.rawData;
      const { data, error: fnError } = await supabase.functions.invoke("data-agent", {
        body: {
          action: "analyze",
          data: dataToAnalyze.slice(0, 500),
          columns: dataset.columns,
          datasetName: dataset.name,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate insights";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-trigger on dataset change
  useEffect(() => {
    const key = `${dataset.name}-${dataset.rawData.length}`;
    if (triggeredRef.current !== key) {
      triggeredRef.current = key;
      fetchInsights();
    }
  }, [dataset.name, dataset.rawData.length]);

  const importanceBadgeClass = (importance: string) => {
    switch (importance.toLowerCase()) {
      case "high":
        return "bg-destructive/15 text-destructive border-destructive/30";
      case "medium":
        return "bg-accent/50 text-accent-foreground border-accent/30";
      default:
        return "bg-primary/15 text-primary border-primary/30";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/80 border-border/50 mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">Generating insights...</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card/80 border-destructive/30 mb-6">
        <CardContent className="py-4 flex items-center justify-between">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchInsights}>
            <RefreshCw className="w-4 h-4 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  return (
    <Card className="bg-card/80 border-border/50 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary" />
            Auto Insights
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchInsights} disabled={isLoading}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {result.summary && (
          <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
        )}
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4 pt-0">
          {/* Key insights */}
          {result.insights?.length > 0 && (
            <div className="space-y-2">
              {result.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                  <Lightbulb className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{insight.title}</span>
                      <Badge variant="outline" className={importanceBadgeClass(insight.importance)}>
                        {insight.importance}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Patterns */}
          {result.patterns?.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Patterns
              </h4>
              {result.patterns.map((p, i) => (
                <p key={i} className="text-xs text-muted-foreground pl-4">
                  <span className="font-medium text-foreground">{p.name}:</span> {p.description}
                </p>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3 h-3" /> Recommendations
              </h4>
              {result.recommendations.map((r, i) => (
                <p key={i} className="text-xs text-muted-foreground pl-4">
                  <span className="font-medium text-foreground">{r.action}</span> — {r.reason}
                </p>
              ))}
            </div>
          )}

          {/* Dive deeper */}
          {onNavigateToAnalyze && (
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={onNavigateToAnalyze}>
                <BarChart3 className="w-4 h-4 mr-1" /> Dive Deeper
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default AutoInsightGenerator;
