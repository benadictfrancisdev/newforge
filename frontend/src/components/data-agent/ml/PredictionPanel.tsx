import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Target,
  Play,
  Loader2,
  CheckCircle2,
  BarChart3,
  Sparkles,
  Info,
  Lightbulb,
  TrendingUp,
  Server,
  Cpu
} from "lucide-react";
import { toast } from "sonner";
import type { MLModel } from "./MLWorkbench";
import { mlAPI, aiAPI } from "@/services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

interface PredictionPanelProps {
  data: Record<string, unknown>[];
  columns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
  onModelTrained: (model: MLModel) => void;
}

interface TrainingProgress {
  stage: string;
  progress: number;
  message: string;
}

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#84cc16"];

const PredictionPanel = ({
  data,
  columns,
  numericColumns,
  categoricalColumns,
  columnTypes,
  datasetName,
  onModelTrained
}: PredictionPanelProps) => {
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [result, setResult] = useState<{
    type: "classification" | "regression";
    accuracy?: number;
    rSquared?: number;
    metrics: Record<string, number>;
    featureImportance: { feature: string; importance: number }[];
    explanation: string;
    predictions?: { actual: unknown; predicted: unknown }[];
  } | null>(null);

  // Detect if target is classification or regression
  const targetType = useMemo(() => {
    if (!targetColumn) return null;
    
    // If categorical, it's classification
    if (columnTypes[targetColumn] === "categorical") return "classification";
    
    // If numeric, check unique values
    const uniqueValues = new Set(data.map(row => row[targetColumn]));
    if (uniqueValues.size <= 10) return "classification";
    
    return "regression";
  }, [targetColumn, columnTypes, data]);

  // Get feature columns (all except target)
  const featureColumns = useMemo(() => 
    columns.filter(c => c !== targetColumn),
    [columns, targetColumn]
  );

  // Train model using backend API
  const trainModel = useCallback(async () => {
    if (!targetColumn || !targetType) {
      toast.error("Please select a target column");
      return;
    }

    setIsTraining(true);
    setProgress({ stage: "Connecting", progress: 10, message: "Connecting to ML server..." });

    try {
      setProgress({ stage: "Uploading", progress: 25, message: "Uploading data for training..." });
      
      // Call backend ML API
      const response = await mlAPI.trainPredictionModel(
        data,
        targetColumn,
        numericColumns.filter(c => c !== targetColumn),
        "auto"
      );

      setProgress({ stage: "Training", progress: 60, message: "Training Random Forest model..." });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Training failed");
      }

      const mlResult = response.data;

      setProgress({ stage: "Evaluating", progress: 80, message: "Evaluating model performance..." });

      // Get AI explanation
      let explanation = "";
      try {
        setProgress({ stage: "Explaining", progress: 90, message: "Generating AI explanation..." });
        
        const explainResponse = await aiAPI.explainAnalysis(
          "prediction_model",
          {
            model_type: mlResult.model_type,
            target: targetColumn,
            metrics: mlResult.metrics,
            top_features: mlResult.feature_importance.slice(0, 3)
          },
          `Dataset: ${datasetName}, ${data.length} rows`
        );

        if (explainResponse.success && explainResponse.data) {
          explanation = explainResponse.data.explanation;
        }
      } catch {
        // Fallback explanation
        explanation = mlResult.model_type === "classification"
          ? `The Random Forest classifier achieved ${((mlResult.metrics.accuracy || 0) * 100).toFixed(1)}% accuracy with ${((mlResult.metrics.cv_accuracy || 0) * 100).toFixed(1)}% cross-validation accuracy. ${mlResult.feature_importance[0]?.feature} is the most important predictor.`
          : `The Random Forest regressor achieved an R² score of ${mlResult.metrics.r2_score?.toFixed(3) || 'N/A'}. ${mlResult.feature_importance[0]?.feature} has the strongest influence on predictions.`;
      }

      setAiExplanation(explanation);
      setProgress({ stage: "Complete", progress: 100, message: "Model trained successfully!" });

      const modelResult = {
        type: mlResult.model_type,
        accuracy: mlResult.model_type === "classification" ? mlResult.metrics.accuracy : undefined,
        rSquared: mlResult.model_type === "regression" ? mlResult.metrics.r2_score : undefined,
        metrics: mlResult.metrics,
        featureImportance: mlResult.feature_importance,
        explanation,
        predictions: mlResult.sample_predictions
      };

      setResult(modelResult);

      // Register trained model
      const model: MLModel = {
        id: `pred-${Date.now()}`,
        name: `Random Forest ${mlResult.model_type === "classification" ? "Classifier" : "Regressor"}`,
        type: mlResult.model_type,
        accuracy: modelResult.accuracy,
        rSquared: modelResult.rSquared,
        featureImportance: mlResult.feature_importance,
        trainedAt: new Date(),
        status: "ready",
        explanation
      };

      onModelTrained(model);
      toast.success("Model trained successfully using server-side ML!");

    } catch (error) {
      console.error("Training error:", error);
      toast.error(error instanceof Error ? error.message : "Model training failed");
      setProgress(null);
    } finally {
      setIsTraining(false);
    }
  }, [targetColumn, targetType, data, numericColumns, datasetName, onModelTrained]);

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Server-Side Prediction Model
            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
              <Server className="h-3 w-3 mr-1" />
              Backend ML
            </Badge>
          </CardTitle>
          <CardDescription>
            Train production-grade Random Forest models using scikit-learn on the server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Target Column (What to predict)</Label>
              <Select value={targetColumn} onValueChange={setTargetColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>
                      <div className="flex items-center gap-2">
                        {col}
                        <Badge variant="outline" className="text-xs">
                          {columnTypes[col]}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {targetColumn && (
              <div className="space-y-2">
                <Label>Detected Model Type</Label>
                <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                  {targetType === "classification" ? (
                    <>
                      <Badge className="bg-blue-500/10 text-blue-500">Classification</Badge>
                      <span className="text-sm text-muted-foreground">Predicts categories</span>
                    </>
                  ) : (
                    <>
                      <Badge className="bg-green-500/10 text-green-500">Regression</Badge>
                      <span className="text-sm text-muted-foreground">Predicts numbers</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {targetColumn && (
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-4 space-y-3 border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <Cpu className="h-4 w-4 text-primary" />
                <span className="font-medium">Server-Side Training Configuration</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• <span className="text-primary font-medium">Algorithm:</span> Random Forest (100 trees, scikit-learn)</li>
                <li>• <span className="text-primary font-medium">Features:</span> {featureColumns.filter(c => columnTypes[c] === "numeric").length} numeric columns</li>
                <li>• <span className="text-primary font-medium">Validation:</span> 5-fold cross-validation</li>
                <li>• <span className="text-primary font-medium">Training samples:</span> {data.length} rows</li>
                <li>• <span className="text-primary font-medium">AI Explanation:</span> GPT-5.2 powered insights</li>
              </ul>
            </div>
          )}

          <Button
            onClick={trainModel}
            disabled={!targetColumn || isTraining}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent"
          >
            {isTraining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Training on Server...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Train Model (Server-Side ML)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Training Progress */}
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
          <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30">
            <CardContent className="py-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-500/20">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      Model Trained Successfully
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                        <Server className="h-3 w-3 mr-1" />
                        Server ML
                      </Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Random Forest {result.type === "classification" ? "Classifier" : "Regressor"} (scikit-learn)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {result.type === "classification" ? (
                    <>
                      <p className="text-3xl font-bold text-green-500">
                        {((result.accuracy || 0) * 100).toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Accuracy</p>
                      {result.metrics.cv_accuracy && (
                        <p className="text-xs text-muted-foreground">
                          CV: {(result.metrics.cv_accuracy * 100).toFixed(1)}% ± {((result.metrics.cv_std || 0) * 100).toFixed(1)}%
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-green-500">
                        {(result.rSquared || 0).toFixed(3)}
                      </p>
                      <p className="text-sm text-muted-foreground">R² Score</p>
                      {result.metrics.rmse && (
                        <p className="text-xs text-muted-foreground">
                          RMSE: {result.metrics.rmse.toFixed(4)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(result.metrics).map(([key, value]) => (
              <Card key={key} className="bg-card/50">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xl font-bold mt-1">
                    {typeof value === 'number' 
                      ? key.includes('accuracy') || key.includes('precision') || key.includes('recall') || key.includes('f1')
                        ? `${(value * 100).toFixed(1)}%`
                        : value.toFixed(4)
                      : value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feature Importance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Feature Importance
              </CardTitle>
              <CardDescription>
                Which features have the most influence on predictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={result.featureImportance.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 20, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                    <YAxis type="category" dataKey="feature" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Importance"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                      {result.featureImportance.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* AI Explanation */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                AI-Powered Explanation
                <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-500">
                  <Sparkles className="h-3 w-3 mr-1" />
                  GPT-5.2
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {result.explanation || aiExplanation || "The model has been trained successfully. Feature importance shows which variables are most predictive."}
              </p>
            </CardContent>
          </Card>

          {/* Sample Predictions */}
          {result.predictions && result.predictions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sample Predictions</CardTitle>
                <CardDescription>Comparison of actual vs predicted values</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {result.predictions.slice(0, 10).map((pred, i) => (
                    <div key={i} className="p-2 rounded-lg bg-muted/30 text-center">
                      <p className="text-xs text-muted-foreground">Actual</p>
                      <p className="font-medium text-sm">{String(pred.actual)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Predicted</p>
                      <p className={`font-medium text-sm ${pred.actual === pred.predicted ? 'text-green-500' : 'text-orange-500'}`}>
                        {String(pred.predicted)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default PredictionPanel;
