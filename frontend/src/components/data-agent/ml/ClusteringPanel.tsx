import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitBranch,
  Play,
  Loader2,
  CheckCircle2,
  Sparkles,
  Users,
  Lightbulb,
  Target,
  Server,
  Cpu
} from "lucide-react";
import { toast } from "sonner";
import type { MLModel } from "./MLWorkbench";
import { mlAPI, aiAPI } from "@/services/api";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis, Legend, Cell
} from "recharts";

interface ClusteringPanelProps {
  data: Record<string, unknown>[];
  columns: string[];
  numericColumns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
  onModelTrained: (model: MLModel) => void;
}

interface ClusterResult {
  id: number;
  name: string;
  count: number;
  percentage: number;
  centroid: Record<string, number>;
  characteristics: string;
  recommendation: string;
}

const CLUSTER_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#84cc16"];

const ClusteringPanel = ({
  data,
  columns,
  numericColumns,
  columnTypes,
  datasetName,
  onModelTrained
}: ClusteringPanelProps) => {
  const [algorithm, setAlgorithm] = useState<"kmeans" | "dbscan">("kmeans");
  const [autoDetectK, setAutoDetectK] = useState(true);
  const [numClusters, setNumClusters] = useState(3);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [result, setResult] = useState<{
    clusters: ClusterResult[];
    scatterData: { x: number; y: number; cluster: number }[];
    xAxis: string;
    yAxis: string;
    silhouetteScore: number;
    calinskiScore: number;
  } | null>(null);

  // Run clustering using backend API
  const runClustering = useCallback(async () => {
    if (numericColumns.length < 2) {
      toast.error("Need at least 2 numeric columns for clustering");
      return;
    }

    setIsTraining(true);
    setProgress({ stage: "Connecting", progress: 10, message: "Connecting to ML server..." });

    try {
      setProgress({ stage: "Uploading", progress: 25, message: "Uploading data for clustering..." });

      // Call backend ML API
      const response = await mlAPI.performClustering(
        data,
        numericColumns.slice(0, 10),
        autoDetectK ? undefined : numClusters,
        algorithm
      );

      setProgress({ stage: "Clustering", progress: 60, message: `Running ${algorithm.toUpperCase()} clustering...` });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Clustering failed");
      }

      const clusterResult = response.data;

      setProgress({ stage: "Analyzing", progress: 80, message: "Analyzing cluster characteristics..." });

      // Get AI-generated cluster names and recommendations
      const clusterStats: ClusterResult[] = clusterResult.cluster_stats.map((stat, i) => ({
        id: stat.cluster_id,
        name: `Cluster ${stat.cluster_id + 1}`,
        count: stat.size,
        percentage: stat.percentage,
        centroid: stat.centroid,
        characteristics: "",
        recommendation: ""
      }));

      try {
        setProgress({ stage: "AI Analysis", progress: 90, message: "Generating AI insights for clusters..." });

        const explainResponse = await aiAPI.explainAnalysis(
          "clustering",
          {
            n_clusters: clusterResult.n_clusters,
            silhouette_score: clusterResult.metrics.silhouette_score,
            cluster_stats: clusterResult.cluster_stats
          },
          `Dataset: ${datasetName}, ${data.length} rows`
        );

        if (explainResponse.success && explainResponse.data) {
          setAiExplanation(explainResponse.data.explanation);
        }

        // Try to get recommendations for each cluster
        const recsResponse = await aiAPI.generateRecommendations(
          data.slice(0, 100),
          numericColumns.slice(0, 5),
          { clusters: clusterResult.cluster_stats },
          "Customer segmentation analysis"
        );

        if (recsResponse.success && recsResponse.data?.recommendations) {
          const recs = recsResponse.data.recommendations;
          if (recs.immediate_actions) {
            clusterStats.forEach((cluster, i) => {
              if (recs.immediate_actions && recs.immediate_actions[i]) {
                cluster.recommendation = recs.immediate_actions[i];
              }
            });
          }
        }
      } catch {
        // Fallback names
        const names = ["Value Seekers", "Premium Customers", "Casual Browsers", "Power Users", "New Adopters", "Loyal Base"];
        clusterStats.forEach((c, i) => {
          c.name = names[i] || `Segment ${i + 1}`;
          c.recommendation = "Focus on personalized engagement strategies for this segment.";
        });
      }

      setProgress({ stage: "Complete", progress: 100, message: "Clustering complete!" });

      setResult({
        clusters: clusterStats,
        scatterData: clusterResult.scatter_data,
        xAxis: clusterResult.x_axis,
        yAxis: clusterResult.y_axis,
        silhouetteScore: clusterResult.metrics.silhouette_score,
        calinskiScore: clusterResult.metrics.calinski_harabasz_score
      });

      // Register model
      const model: MLModel = {
        id: `cluster-${Date.now()}`,
        name: `${algorithm.toUpperCase()} (${clusterResult.n_clusters} clusters)`,
        type: "clustering",
        clusters: clusterResult.n_clusters,
        trainedAt: new Date(),
        status: "ready",
        explanation: `Identified ${clusterResult.n_clusters} distinct segments with silhouette score of ${clusterResult.metrics.silhouette_score.toFixed(2)}`
      };

      onModelTrained(model);
      toast.success(`Found ${clusterResult.n_clusters} clusters using server-side ML!`);

    } catch (error) {
      console.error("Clustering error:", error);
      toast.error(error instanceof Error ? error.message : "Clustering failed");
    } finally {
      setIsTraining(false);
    }
  }, [data, numericColumns, numClusters, autoDetectK, algorithm, datasetName, onModelTrained]);

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Server-Side Clustering Analysis
            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
              <Server className="h-3 w-3 mr-1" />
              Backend ML
            </Badge>
          </CardTitle>
          <CardDescription>
            Automatically discover segments and patterns using scikit-learn on the server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Algorithm</Label>
              <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as "kmeans" | "dbscan")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kmeans">K-Means Clustering</SelectItem>
                  <SelectItem value="dbscan">DBSCAN (Density-based)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Auto-detect clusters (Elbow Method)</Label>
                <Switch checked={autoDetectK} onCheckedChange={setAutoDetectK} />
              </div>
              {!autoDetectK && (
                <Select value={String(numClusters)} onValueChange={(v) => setNumClusters(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8].map(k => (
                      <SelectItem key={k} value={String(k)}>{k} clusters</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-4 space-y-2 border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <Cpu className="h-4 w-4 text-primary" />
              <span className="font-medium">Server-Side Processing</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• <span className="text-primary font-medium">Algorithm:</span> scikit-learn {algorithm === "kmeans" ? "KMeans" : "DBSCAN"}</li>
              <li>• <span className="text-primary font-medium">Features:</span> {numericColumns.slice(0, 10).length} numeric columns</li>
              <li>• <span className="text-primary font-medium">Optimization:</span> Silhouette & Calinski-Harabasz scores</li>
              <li>• <span className="text-primary font-medium">AI Insights:</span> GPT-5.2 powered explanations</li>
            </ul>
          </div>

          <Button
            onClick={runClustering}
            disabled={isTraining || numericColumns.length < 2}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent"
          >
            {isTraining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Clustering on Server...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Clustering (Server-Side ML)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {progress && isTraining && (
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
      {result && !isTraining && (
        <div className="space-y-6">
          {/* Score Card */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/30">
            <CardContent className="py-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/20">
                    <CheckCircle2 className="h-8 w-8 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      Clustering Complete
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                        <Server className="h-3 w-3 mr-1" />
                        Server ML
                      </Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Found {result.clusters.length} distinct segments
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-500">
                      {result.silhouetteScore.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Silhouette Score</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-500">
                      {result.calinskiScore.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Calinski-Harabasz</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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

          {/* Scatter Plot */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cluster Visualization (2D)</CardTitle>
              <CardDescription>
                {result.xAxis} vs {result.yAxis}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" dataKey="x" name={result.xAxis} tick={{ fontSize: 12 }} />
                    <YAxis type="number" dataKey="y" name={result.yAxis} tick={{ fontSize: 12 }} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend />
                    {result.clusters.map((cluster, i) => (
                      <Scatter
                        key={cluster.id}
                        name={cluster.name}
                        data={result.scatterData.filter(d => d.cluster === cluster.id).slice(0, 200)}
                        fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cluster Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.clusters.map((cluster, i) => (
              <Card key={cluster.id} className="border-l-4" style={{ borderLeftColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" style={{ color: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }} />
                      {cluster.name}
                    </CardTitle>
                    <Badge variant="secondary">{cluster.count} members</Badge>
                  </div>
                  <CardDescription>{cluster.percentage.toFixed(1)}% of data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium mb-1">Key Characteristics:</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {Object.entries(cluster.centroid).slice(0, 3).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}:</span>
                          <span className="font-mono">{val.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {cluster.recommendation && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">{cluster.recommendation}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClusteringPanel;
