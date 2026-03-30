import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Eye,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Server,
  Cpu,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import type { MLModel } from "./MLWorkbench";
import { mlAPI, aiAPI } from "@/services/api";

interface AnomalyPanelProps {
  data: Record<string, unknown>[];
  columns: string[];
  numericColumns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
  onModelTrained: (model: MLModel) => void;
}

interface DetectedAnomaly {
  index: number;
  row: Record<string, unknown>;
  score: number;
  severity: "critical" | "high" | "medium" | "low";
  affectedColumns: Array<{ column: string; value: number; z_score: number }>;
  explanation: string;
  suggestedAction: string;
}

const AnomalyPanel = ({
  data,
  columns,
  numericColumns,
  columnTypes,
  datasetName,
  onModelTrained
}: AnomalyPanelProps) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [contamination, setContamination] = useState(0.1);
  const [progress, setProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);
  const [anomalies, setAnomalies] = useState<DetectedAnomaly[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<DetectedAnomaly | null>(null);
  const [severitySummary, setSeveritySummary] = useState<Record<string, number>>({});
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [totalRecords, setTotalRecords] = useState(0);

  // Detect anomalies using backend API
  const detectAnomalies = useCallback(async () => {
    if (numericColumns.length === 0) {
      toast.error("Need numeric columns for anomaly detection");
      return;
    }

    setIsDetecting(true);
    setProgress({ stage: "Connecting", progress: 10, message: "Connecting to ML server..." });

    try {
      setProgress({ stage: "Uploading", progress: 25, message: "Uploading data for analysis..." });

      // Call backend ML API
      const response = await mlAPI.detectAnomalies(
        data,
        numericColumns.slice(0, 10),
        contamination
      );

      setProgress({ stage: "Detecting", progress: 60, message: "Running Isolation Forest algorithm..." });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Anomaly detection failed");
      }

      const anomalyResult = response.data;

      setProgress({ stage: "Analyzing", progress: 80, message: "Analyzing detected anomalies..." });

      // Transform anomalies with explanations
      const detectedAnomalies: DetectedAnomaly[] = anomalyResult.anomalies.map(anomaly => {
        // Generate explanation
        const topDeviations = anomaly.affected_columns.slice(0, 3);
        let explanation = `Row ${anomaly.index + 1} shows unusual values. `;
        topDeviations.forEach(dev => {
          explanation += `${dev.column} is ${dev.z_score.toFixed(1)} standard deviations from mean. `;
        });

        // Suggested action based on severity
        let suggestedAction = "Review this data point for potential errors.";
        if (anomaly.severity === "critical") {
          suggestedAction = "Investigate immediately - this may indicate a data quality issue or significant event.";
        } else if (anomaly.severity === "high") {
          suggestedAction = "Verify this data entry and correct if necessary.";
        } else if (anomaly.severity === "medium") {
          suggestedAction = "Flag for review during next data quality check.";
        }

        return {
          index: anomaly.index,
          row: anomaly.row_data as Record<string, unknown>,
          score: anomaly.anomaly_score,
          severity: anomaly.severity,
          affectedColumns: anomaly.affected_columns,
          explanation,
          suggestedAction
        };
      });

      // Get AI explanation for the overall anomaly analysis
      try {
        setProgress({ stage: "AI Analysis", progress: 90, message: "Generating AI insights..." });

        const explainResponse = await aiAPI.explainAnalysis(
          "anomaly_detection",
          {
            total_anomalies: anomalyResult.anomaly_count,
            anomaly_rate: anomalyResult.anomaly_rate,
            severity_breakdown: anomalyResult.severity_summary,
            sample_anomalies: detectedAnomalies.slice(0, 5).map(a => ({
              index: a.index,
              severity: a.severity,
              top_deviations: a.affectedColumns.slice(0, 2)
            }))
          },
          `Dataset: ${datasetName}, ${data.length} rows, Contamination: ${contamination}`
        );

        if (explainResponse.success && explainResponse.data) {
          setAiExplanation(explainResponse.data.explanation);
        }
      } catch {
        setAiExplanation(`Detected ${anomalyResult.anomaly_count} anomalies (${anomalyResult.anomaly_rate.toFixed(1)}% of data) using Isolation Forest algorithm.`);
      }

      setProgress({ stage: "Complete", progress: 100, message: "Detection complete!" });

      setAnomalies(detectedAnomalies);
      setSeveritySummary(anomalyResult.severity_summary);
      setTotalRecords(anomalyResult.total_records);

      // Register model
      const model: MLModel = {
        id: `anomaly-${Date.now()}`,
        name: "Isolation Forest Detector",
        type: "anomaly",
        anomalyCount: anomalyResult.anomaly_count,
        trainedAt: new Date(),
        status: "ready",
        explanation: `Detected ${anomalyResult.anomaly_count} anomalies (${anomalyResult.anomaly_rate.toFixed(1)}% of data)`
      };

      onModelTrained(model);
      toast.success(`Found ${anomalyResult.anomaly_count} anomalies using server-side ML!`);

    } catch (error) {
      console.error("Detection error:", error);
      toast.error(error instanceof Error ? error.message : "Anomaly detection failed");
    } finally {
      setIsDetecting(false);
    }
  }, [data, numericColumns, contamination, datasetName, onModelTrained]);

  const getSeverityColor = (severity: DetectedAnomaly["severity"]) => {
    switch (severity) {
      case "critical": return "bg-red-500/10 text-red-500 border-red-500/30";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/30";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case "low": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    }
  };

  const getSeverityIcon = (severity: DetectedAnomaly["severity"]) => {
    switch (severity) {
      case "critical": return <XCircle className="h-4 w-4" />;
      case "high": return <AlertTriangle className="h-4 w-4" />;
      case "medium": return <Target className="h-4 w-4" />;
      case "low": return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Server-Side Anomaly Detection
            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
              <Server className="h-3 w-3 mr-1" />
              Backend ML
            </Badge>
          </CardTitle>
          <CardDescription>
            Find unusual data points using Isolation Forest algorithm on the server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contamination Rate (Expected anomaly %)</Label>
                <span className="text-sm font-medium">{(contamination * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[contamination * 100]}
                onValueChange={(v) => setContamination(v[0] / 100)}
                min={1}
                max={30}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Higher values detect more anomalies, lower values are more strict
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-4 space-y-2 border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <Cpu className="h-4 w-4 text-primary" />
              <span className="font-medium">Server-Side Detection Methods</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• <span className="text-primary font-medium">Algorithm:</span> Isolation Forest (scikit-learn)</li>
              <li>• <span className="text-primary font-medium">Features:</span> {numericColumns.slice(0, 10).length} numeric columns</li>
              <li>• <span className="text-primary font-medium">Scoring:</span> Z-score & IQR-based severity</li>
              <li>• <span className="text-primary font-medium">AI Insights:</span> GPT-5.2 powered explanations</li>
            </ul>
          </div>

          <Button
            onClick={detectAnomalies}
            disabled={isDetecting || numericColumns.length === 0}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent"
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Detecting on Server...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Detect Anomalies (Server-Side ML)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {progress && isDetecting && (
        <Card className="border-primary/30">
          <CardContent className="py-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary animate-pulse" />
                  {progress.stage}
                </span>
                <span className="text-sm text-muted-foreground">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{progress.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {anomalies.length > 0 && !isDetecting && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Card className="bg-card/50 col-span-1">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                <p className="text-2xl font-bold mt-1">{anomalies.length}</p>
                <p className="text-xs text-muted-foreground">
                  {((anomalies.length / totalRecords) * 100).toFixed(1)}% of data
                </p>
              </CardContent>
            </Card>
            {["critical", "high", "medium", "low"].map(severity => {
              const count = severitySummary[severity] || 0;
              return (
                <Card key={severity} className={`${getSeverityColor(severity as DetectedAnomaly["severity"])} border`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(severity as DetectedAnomaly["severity"])}
                      <span className="text-sm font-medium capitalize">{severity}</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{count}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* AI Explanation */}
          {aiExplanation && (
            <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  AI Analysis
                  <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-500">
                    <Sparkles className="h-3 w-3 mr-1" />
                    GPT-5.2
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{aiExplanation}</p>
              </CardContent>
            </Card>
          )}

          {/* Anomalies Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Detected Anomalies
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                  <Server className="h-3 w-3 mr-1" />
                  Isolation Forest
                </Badge>
              </CardTitle>
              <CardDescription>
                Top {anomalies.length} unusual data points ranked by severity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead className="w-24">Severity</TableHead>
                      <TableHead>Affected Columns</TableHead>
                      <TableHead>Explanation</TableHead>
                      <TableHead className="w-24">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anomalies.map((anomaly, i) => (
                      <TableRow 
                        key={i}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAnomaly(anomaly)}
                      >
                        <TableCell className="font-mono">{anomaly.index + 1}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(anomaly.severity)}>
                            {getSeverityIcon(anomaly.severity)}
                            <span className="ml-1 capitalize">{anomaly.severity}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {anomaly.affectedColumns.slice(0, 3).map(col => (
                              <Badge key={col.column} variant="outline" className="text-xs">
                                {col.column} ({col.z_score.toFixed(1)}σ)
                              </Badge>
                            ))}
                            {anomaly.affectedColumns.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{anomaly.affectedColumns.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                          {anomaly.explanation}
                        </TableCell>
                        <TableCell>
                          <div className="w-16">
                            <Progress value={Math.abs(anomaly.score) * 100} className="h-2" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Selected Anomaly Details */}
          {selectedAnomaly && (
            <Card className="border-2 border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    Row {selectedAnomaly.index + 1} Details
                  </CardTitle>
                  <Badge className={getSeverityColor(selectedAnomaly.severity)}>
                    {getSeverityIcon(selectedAnomaly.severity)}
                    <span className="ml-1 capitalize">{selectedAnomaly.severity}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Affected Values (by Z-Score)</h4>
                    <div className="space-y-2">
                      {selectedAnomaly.affectedColumns.map(col => (
                        <div key={col.column} className="flex justify-between text-sm bg-muted/30 rounded px-3 py-2">
                          <span>{col.column}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{col.value.toFixed(2)}</span>
                            <Badge variant="outline" className="text-xs">
                              {col.z_score.toFixed(1)}σ
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">All Values</h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {Object.entries(selectedAnomaly.row).slice(0, 10).map(([key, val]) => (
                          <div key={key} className="flex justify-between text-sm text-muted-foreground">
                            <span>{key}</span>
                            <span className="font-mono">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Why is this anomalous?
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedAnomaly.explanation}</p>
                </div>

                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Suggested Action
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedAnomaly.suggestedAction}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {anomalies.length === 0 && !isDetecting && (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 rounded-full bg-muted inline-block">
                <AlertTriangle className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No Anomalies Detected Yet</h3>
              <p className="text-muted-foreground">
                Click "Detect Anomalies" to find unusual data points using server-side Isolation Forest algorithm.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnomalyPanel;
