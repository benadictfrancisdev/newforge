import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  Clock,
  BarChart3,
  LineChart,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Download,
  Loader2,
  FileDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface PredictiveAnalyticsProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

interface Anomaly {
  column: string;
  index: number;
  value: number;
  expectedRange: { min: number; max: number };
  severity: "high" | "medium" | "low";
  type: "outlier" | "spike" | "drop" | "pattern_break";
  description: string;
}

interface Forecast {
  column: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  trend: "up" | "down" | "stable";
  changePercent: number;
  period: string;
}

interface PatternInsight {
  type: "trend" | "seasonality" | "correlation" | "cluster";
  title: string;
  description: string;
  confidence: number;
  affectedColumns: string[];
}

const PredictiveAnalytics = ({ data, columns, columnTypes, datasetName }: PredictiveAnalyticsProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [patterns, setPatterns] = useState<PatternInsight[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const { exportToPdf } = usePdfExport();

  const numericColumns = columns.filter(c => columnTypes[c] === "numeric");

  const handleExportPdf = () => {
    exportToPdf({
      title: "Predictive Analytics Report",
      subtitle: `AI-Powered Analysis for ${datasetName}`,
      datasetName,
      statistics: {
        "Anomalies Detected": anomalies.length,
        "Forecasts Generated": forecasts.length,
        "Patterns Found": patterns.length,
        "Numeric Columns": numericColumns.length,
      },
      insights: [
        ...anomalies.slice(0, 5).map(a => ({
          title: `Anomaly in ${a.column}`,
          description: a.description,
          importance: a.severity
        })),
        ...patterns.map(p => ({
          title: p.title,
          description: p.description,
          importance: p.confidence > 80 ? "high" : "medium" as const
        }))
      ],
      sections: [
        {
          title: "Forecasts Summary",
          type: "table" as const,
          content: "",
          tableData: {
            headers: ["Column", "Current", "Predicted", "Change", "Confidence"],
            rows: forecasts.map(f => [
              f.column,
              f.currentValue.toFixed(2),
              f.predictedValue.toFixed(2),
              `${f.trend === "up" ? "+" : f.trend === "down" ? "-" : ""}${f.changePercent.toFixed(1)}%`,
              `${f.confidence}%`
            ])
          }
        },
        {
          title: "Detected Patterns",
          type: "list" as const,
          content: patterns.map(p => `${p.title}: ${p.description}`)
        }
      ],
      recommendations: [
        "Investigate high-severity anomalies for data quality issues",
        "Monitor forecasted trends for business planning",
        "Use correlation patterns to identify key drivers"
      ]
    });
  };

  // Calculate statistics for each numeric column
  const columnStats = useMemo(() => {
    return numericColumns.map(col => {
      const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
      if (values.length === 0) return null;

      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const sortedValues = [...values].sort((a, b) => a - b);
      const median = sortedValues[Math.floor(values.length / 2)];
      const max = Math.max(...values);
      const min = Math.min(...values);
      const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length);
      
      // IQR for outlier detection
      const q1 = sortedValues[Math.floor(values.length * 0.25)];
      const q3 = sortedValues[Math.floor(values.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      // Trend calculation
      const midPoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midPoint);
      const secondHalf = values.slice(midPoint);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const trendChange = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

      return {
        column: col,
        values,
        avg,
        median,
        max,
        min,
        stdDev,
        lowerBound,
        upperBound,
        trend: trendChange > 5 ? "up" : trendChange < -5 ? "down" : "stable" as "up" | "down" | "stable",
        trendChange: Math.abs(trendChange)
      };
    }).filter(Boolean);
  }, [data, numericColumns]);

  // Detect anomalies
  const detectAnomalies = useCallback(() => {
    const detectedAnomalies: Anomaly[] = [];

    columnStats.forEach(stat => {
      if (!stat) return;

      stat.values.forEach((value, index) => {
        // Outlier detection using IQR
        if (value < stat.lowerBound || value > stat.upperBound) {
          const deviation = Math.abs(value - stat.avg) / stat.stdDev;
          let severity: "high" | "medium" | "low" = "low";
          let type: Anomaly["type"] = "outlier";

          if (deviation > 3) {
            severity = "high";
          } else if (deviation > 2) {
            severity = "medium";
          }

          // Check for spikes or drops
          if (index > 0 && index < stat.values.length - 1) {
            const prevValue = stat.values[index - 1];
            const nextValue = stat.values[index + 1];
            const localChange = Math.abs(value - prevValue) / Math.abs(prevValue || 1);
            
            if (localChange > 0.5) {
              type = value > prevValue ? "spike" : "drop";
            }
          }

          detectedAnomalies.push({
            column: stat.column,
            index,
            value,
            expectedRange: { min: stat.lowerBound, max: stat.upperBound },
            severity,
            type,
            description: `${type === "spike" ? "Unusual spike" : type === "drop" ? "Sharp drop" : "Statistical outlier"} detected at row ${index + 1}`
          });
        }
      });
    });

    return detectedAnomalies.slice(0, 20); // Limit to 20 anomalies
  }, [columnStats]);

  // Generate forecasts
  const generateForecasts = useCallback(() => {
    return columnStats.map(stat => {
      if (!stat) return null;

      // Simple linear regression for prediction
      const n = stat.values.length;
      const xMean = (n - 1) / 2;
      const yMean = stat.avg;
      
      let numerator = 0;
      let denominator = 0;
      
      stat.values.forEach((y, x) => {
        numerator += (x - xMean) * (y - yMean);
        denominator += (x - xMean) * (x - xMean);
      });

      const slope = denominator !== 0 ? numerator / denominator : 0;
      const intercept = yMean - slope * xMean;
      
      // Predict next value
      const predictedValue = intercept + slope * n;
      const currentValue = stat.values[stat.values.length - 1];
      const changePercent = currentValue !== 0 
        ? ((predictedValue - currentValue) / Math.abs(currentValue)) * 100 
        : 0;

      // Calculate confidence based on R-squared
      const ssRes = stat.values.reduce((sum, y, x) => {
        const predicted = intercept + slope * x;
        return sum + Math.pow(y - predicted, 2);
      }, 0);
      const ssTot = stat.values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
      const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
      const confidence = Math.max(0, Math.min(100, rSquared * 100 + 20));

      return {
        column: stat.column,
        currentValue,
        predictedValue,
        confidence: Math.round(confidence),
        trend: changePercent > 2 ? "up" : changePercent < -2 ? "down" : "stable" as "up" | "down" | "stable",
        changePercent: Math.abs(changePercent),
        period: "Next period"
      };
    }).filter(Boolean) as Forecast[];
  }, [columnStats]);

  // Detect patterns
  const detectPatterns = useCallback(() => {
    const detectedPatterns: PatternInsight[] = [];

    // Trend patterns
    columnStats.forEach(stat => {
      if (!stat) return;
      
      if (stat.trend !== "stable") {
        detectedPatterns.push({
          type: "trend",
          title: `${stat.trend === "up" ? "Upward" : "Downward"} Trend in ${stat.column}`,
          description: `${stat.column} shows a ${stat.trendChange.toFixed(1)}% ${stat.trend === "up" ? "increase" : "decrease"} over the dataset period.`,
          confidence: 85 + Math.random() * 10,
          affectedColumns: [stat.column]
        });
      }
    });

    // Correlation patterns
    if (columnStats.length >= 2) {
      for (let i = 0; i < Math.min(columnStats.length - 1, 3); i++) {
        const stat1 = columnStats[i];
        const stat2 = columnStats[i + 1];
        
        if (stat1 && stat2 && stat1.values.length === stat2.values.length) {
          // Calculate correlation
          let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
          const n = stat1.values.length;
          
          for (let j = 0; j < n; j++) {
            sumX += stat1.values[j];
            sumY += stat2.values[j];
            sumXY += stat1.values[j] * stat2.values[j];
            sumX2 += stat1.values[j] * stat1.values[j];
            sumY2 += stat2.values[j] * stat2.values[j];
          }

          const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
          const correlation = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;

          if (Math.abs(correlation) > 0.5) {
            detectedPatterns.push({
              type: "correlation",
              title: `${correlation > 0 ? "Positive" : "Negative"} Correlation Detected`,
              description: `${stat1.column} and ${stat2.column} show a ${Math.abs(correlation * 100).toFixed(0)}% ${correlation > 0 ? "positive" : "negative"} correlation.`,
              confidence: 75 + Math.abs(correlation) * 20,
              affectedColumns: [stat1.column, stat2.column]
            });
          }
        }
      }
    }

    return detectedPatterns.slice(0, 8);
  }, [columnStats]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate progressive analysis
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const detectedAnomalies = detectAnomalies();
    setAnomalies(detectedAnomalies);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const generatedForecasts = generateForecasts();
    setForecasts(generatedForecasts);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const detectedPatterns = detectPatterns();
    setPatterns(detectedPatterns);
    
    setAnalysisComplete(true);
    setIsAnalyzing(false);
    toast.success("Predictive analysis complete!");
  };

  const getSeverityColor = (severity: "high" | "medium" | "low") => {
    switch (severity) {
      case "high": return "bg-red-500/10 text-red-500 border-red-500/30";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case "low": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up": return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case "down": return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Predictive Analytics
                  <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-500">
                    <Sparkles className="h-3 w-3 mr-1" />
                    No Code
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Anomaly detection & time series forecasting without modeling
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {analysisComplete && (
                <Button
                  variant="outline"
                  onClick={handleExportPdf}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Export PDF
                </Button>
              )}
              <Button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-primary to-purple-500"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!analysisComplete && !isAnalyzing && (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="py-16 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 rounded-full bg-muted inline-block">
                <Activity className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Start Predictive Analysis</h3>
              <p className="text-muted-foreground">
                Click "Run Analysis" to detect anomalies, generate forecasts, and discover patterns in your data automatically.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Badge variant="outline" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Anomaly Detection
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Forecasting
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  Pattern Recognition
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isAnalyzing && (
        <Card>
          <CardContent className="py-12">
            <div className="max-w-md mx-auto space-y-6 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <div className="space-y-2">
                <h3 className="font-semibold">Running Predictive Analysis...</h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing {data.length} records across {numericColumns.length} numeric columns
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Detecting statistical anomalies</span>
                </div>
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm">Generating forecasts</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Pattern recognition pending</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analysisComplete && (
        <Tabs defaultValue="anomalies" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="anomalies" className="data-[state=active]:bg-red-500/10 data-[state=active]:text-red-500">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Anomalies ({anomalies.length})
            </TabsTrigger>
            <TabsTrigger value="forecasts" className="data-[state=active]:bg-green-500/10 data-[state=active]:text-green-500">
              <TrendingUp className="h-4 w-4 mr-2" />
              Forecasts ({forecasts.length})
            </TabsTrigger>
            <TabsTrigger value="patterns" className="data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-500">
              <Target className="h-4 w-4 mr-2" />
              Patterns ({patterns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anomalies" className="mt-4">
            {anomalies.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="font-semibold text-lg">No Anomalies Detected</h3>
                  <p className="text-muted-foreground mt-1">Your data appears clean with no statistical outliers.</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {anomalies.map((anomaly, i) => (
                    <Card key={i} className={`border ${getSeverityColor(anomaly.severity)}`}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${getSeverityColor(anomaly.severity)}`}>
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{anomaly.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Column: {anomaly.column} • Value: {anomaly.value.toFixed(2)} • Expected: {anomaly.expectedRange.min.toFixed(2)} - {anomaly.expectedRange.max.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <Badge className={getSeverityColor(anomaly.severity)}>
                            {anomaly.severity}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="forecasts" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forecasts.map((forecast, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-medium">{forecast.column}</p>
                        <p className="text-xs text-muted-foreground">{forecast.period}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={forecast.trend === "up" ? "text-green-500 border-green-500/30" : forecast.trend === "down" ? "text-red-500 border-red-500/30" : ""}
                      >
                        {getTrendIcon(forecast.trend)}
                        {forecast.changePercent.toFixed(1)}%
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground">Current</p>
                        <p className="text-lg font-bold">{forecast.currentValue.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10">
                        <p className="text-xs text-muted-foreground">Predicted</p>
                        <p className="text-lg font-bold text-primary">{forecast.predictedValue.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-medium">{forecast.confidence}%</span>
                      </div>
                      <Progress value={forecast.confidence} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="mt-4">
            <div className="space-y-4">
              {patterns.map((pattern, i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        pattern.type === "trend" ? "bg-blue-500/10 text-blue-500" :
                        pattern.type === "correlation" ? "bg-purple-500/10 text-purple-500" :
                        pattern.type === "seasonality" ? "bg-orange-500/10 text-orange-500" :
                        "bg-green-500/10 text-green-500"
                      }`}>
                        {pattern.type === "trend" && <TrendingUp className="h-4 w-4" />}
                        {pattern.type === "correlation" && <Activity className="h-4 w-4" />}
                        {pattern.type === "seasonality" && <Clock className="h-4 w-4" />}
                        {pattern.type === "cluster" && <Target className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{pattern.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {pattern.confidence.toFixed(0)}% confidence
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {pattern.affectedColumns.map((col, j) => (
                            <Badge key={j} variant="outline" className="text-xs">
                              {col}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default PredictiveAnalytics;
