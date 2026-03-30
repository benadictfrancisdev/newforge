import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Lightbulb, TrendingUp, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DatasetState } from "@/pages/DataAgent";

interface AnalysisPanelProps {
  dataset: DatasetState;
}

interface AnalysisResult {
  summary: string;
  statistics: Record<string, unknown>;
  insights: Array<{ title: string; description: string; importance: string }>;
  patterns: Array<{ name: string; description: string }>;
  recommendations: Array<{ action: string; reason: string }>;
}

const AnalysisPanel = ({ dataset }: AnalysisPanelProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const dataToAnalyze = dataset.cleanedData || dataset.rawData;
      const { data, error } = await supabase.functions.invoke('data-agent', {
        body: { 
          action: 'analyze', 
          data: dataToAnalyze.slice(0, 500), // Limit for AI processing
          datasetName: dataset.name 
        }
      });

      if (error) throw error;
      setAnalysis(data);
      toast.success("Analysis complete!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const importanceBadgeClass = (importance: string) => {
    switch (importance.toLowerCase()) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shadow-glow">
          <BarChart3 className="w-10 h-10 text-primary-foreground" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Ready to Analyze</h3>
          <p className="text-muted-foreground max-w-md">
            Let our AI agent analyze your data to discover patterns, generate insights, and provide recommendations.
          </p>
        </div>
        <Button 
          size="lg"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <BarChart3 className="w-5 h-5 mr-2" />
              Start Analysis
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{analysis.summary}</p>
        </CardContent>
      </Card>

      {/* Insights */}
      {analysis.insights && analysis.insights.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.insights.map((insight, i) => (
              <div key={i} className="p-4 bg-muted/30 rounded-lg border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium">{insight.title}</h4>
                  <Badge className={importanceBadgeClass(insight.importance)}>
                    {insight.importance}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Patterns */}
      {analysis.patterns && analysis.patterns.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Patterns Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.patterns.map((pattern, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                <div>
                  <p className="font-medium">{pattern.name}</p>
                  <p className="text-sm text-muted-foreground">{pattern.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.recommendations.map((rec, i) => (
              <div key={i} className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                <p className="font-medium text-green-400 mb-1">{rec.action}</p>
                <p className="text-sm text-muted-foreground">{rec.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Re-analyze button */}
      <div className="flex justify-center">
        <Button 
          variant="outline"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <BarChart3 className="w-4 h-4 mr-2" />
          )}
          Re-analyze
        </Button>
      </div>
    </div>
  );
};

export default AnalysisPanel;
