import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FlaskConical, Loader2, CheckCircle, XCircle, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface HypothesisTestingPanelProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

interface TestResults {
  testSelected: string;
  testSelectionReason: string;
  hypothesis: { null: string; alternative: string; significance_level: number };
  assumptions: {
    checked: string[];
    normality: { assessment: string; method: string; details: string };
    equal_variance: { assessment: string; method: string; details: string };
    sample_size_adequate: boolean;
  };
  results: {
    test_statistic: number;
    test_statistic_name: string;
    degrees_of_freedom: number;
    p_value: number;
    confidence_interval: { lower: number; upper: number; level: number };
    effect_size: { value: number; name: string; interpretation: string };
    power: number;
  };
  groups: Array<{ name: string; n: number; mean: number; std: number; median: number }>;
  decision: string;
  interpretation: string;
  caveats: string[];
  recommendations: string[];
  followUpTests: string[];
}

const HypothesisTestingPanel = ({ data, columns, columnTypes, datasetName }: HypothesisTestingPanelProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [testType, setTestType] = useState<string>("");
  const [groupColumn, setGroupColumn] = useState<string>("");
  const [valueColumn, setValueColumn] = useState<string>("");
  const [hypothesis, setHypothesis] = useState("");

  const numericCols = columns.filter(c => columnTypes[c] === "numeric");
  const categoricalCols = columns.filter(c => columnTypes[c] === "categorical");

  const handleRunTest = async () => {
    if (!valueColumn) {
      toast.error("Please select a value column to test");
      return;
    }
    setIsRunning(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("data-agent", {
        body: {
          action: "hypothesis_testing",
          data: data.slice(0, 500),
          columns,
          datasetName,
          testType: testType || undefined,
          groupColumn: groupColumn || undefined,
          valueColumn,
          hypothesisDescription: hypothesis || undefined,
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");
      setResults(result);
      toast.success("Hypothesis test complete!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setIsRunning(false);
    }
  };

  if (!results) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <FlaskConical className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-1">Hypothesis Testing</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Validate business assumptions with automated statistical tests. The AI selects the right test, checks assumptions, and explains results in plain English.
            </p>
          </div>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Configure Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value Column *</Label>
                <Select value={valueColumn} onValueChange={setValueColumn}>
                  <SelectTrigger><SelectValue placeholder="Select column to test" /></SelectTrigger>
                  <SelectContent>
                    {numericCols.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group Column (optional)</Label>
                <Select value={groupColumn} onValueChange={setGroupColumn}>
                  <SelectTrigger><SelectValue placeholder="Compare groups by..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (single-sample test)</SelectItem>
                    {categoricalCols.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Test Type (optional — AI auto-selects if empty)</Label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger><SelectValue placeholder="Auto-select best test" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Auto-select</SelectItem>
                  <SelectItem value="t-test">Independent t-test</SelectItem>
                  <SelectItem value="paired-t-test">Paired t-test</SelectItem>
                  <SelectItem value="welch-t-test">Welch's t-test</SelectItem>
                  <SelectItem value="chi-square">Chi-square test</SelectItem>
                  <SelectItem value="mann-whitney-u">Mann-Whitney U</SelectItem>
                  <SelectItem value="anova">ANOVA</SelectItem>
                  <SelectItem value="kruskal-wallis">Kruskal-Wallis</SelectItem>
                  <SelectItem value="z-test">Z-test</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Describe your hypothesis (optional)</Label>
              <Textarea
                placeholder="e.g., 'Revenue is significantly higher in Q4 than Q1' or 'There is no difference in churn rate between regions'"
                value={hypothesis}
                onChange={e => setHypothesis(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              onClick={handleRunTest}
              disabled={isRunning || !valueColumn}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90"
            >
              {isRunning ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Test...</>
              ) : (
                <><FlaskConical className="w-4 h-4 mr-2" />Run Hypothesis Test</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pValueColor = results.results.p_value < 0.05 ? "text-green-400" : "text-yellow-400";
  const decisionIcon = results.decision === "reject" ? <CheckCircle className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-yellow-400" />;

  return (
    <div className="space-y-4">
      {/* Decision Banner */}
      <Card className={`border-2 ${results.decision === "reject" ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {decisionIcon}
            <div>
              <p className="font-semibold text-lg">
                {results.decision === "reject" ? "Statistically Significant Result" : "No Significant Difference Found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {results.testSelected} | p-value: <span className={pValueColor}>{results.results.p_value.toFixed(4)}</span> | 
                Effect size: {results.results.effect_size.interpretation} ({results.results.effect_size.name} = {results.results.effect_size.value.toFixed(3)})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hypotheses */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FlaskConical className="w-4 h-4 text-violet-400" />Hypotheses</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Null Hypothesis (H₀)</p>
            <p className="text-sm">{results.hypothesis.null}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Alternative Hypothesis (H₁)</p>
            <p className="text-sm">{results.hypothesis.alternative}</p>
          </div>
          <p className="text-xs text-muted-foreground">Significance level: α = {results.hypothesis.significance_level}</p>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Results</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: results.results.test_statistic_name + "-statistic", value: results.results.test_statistic.toFixed(3) },
              { label: "p-value", value: results.results.p_value.toFixed(4) },
              { label: "Degrees of Freedom", value: results.results.degrees_of_freedom },
              { label: "Statistical Power", value: (results.results.power * 100).toFixed(1) + "%" },
            ].map((s, i) => (
              <div key={i} className="p-3 bg-muted/20 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold mt-1">{s.value}</p>
              </div>
            ))}
          </div>
          {results.results.confidence_interval && (
            <p className="text-sm text-muted-foreground mt-3">
              {(results.results.confidence_interval.level * 100)}% CI: [{results.results.confidence_interval.lower.toFixed(3)}, {results.results.confidence_interval.upper.toFixed(3)}]
            </p>
          )}
        </CardContent>
      </Card>

      {/* Groups */}
      {results.groups && results.groups.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Group Statistics</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.groups.map((g, i) => (
                <div key={i} className="p-3 bg-muted/20 rounded-lg">
                  <p className="font-medium mb-2">{g.name} <span className="text-xs text-muted-foreground">(n={g.n})</span></p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Mean:</span> {g.mean.toFixed(2)}</div>
                    <div><span className="text-muted-foreground">Median:</span> {g.median.toFixed(2)}</div>
                    <div><span className="text-muted-foreground">Std:</span> {g.std.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interpretation */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Plain-English Interpretation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{results.interpretation}</p>
        </CardContent>
      </Card>

      {/* Assumptions */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base">Assumption Checks</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {results.assumptions.checked.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {a.toLowerCase().includes("met") ? <CheckCircle className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />}
              <span>{a}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recommendations & Follow-ups */}
      {results.recommendations && results.recommendations.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {results.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary shrink-0" />
                <span>{r}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {results.followUpTests && results.followUpTests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Suggested follow-up tests:</span>
          {results.followUpTests.map((t, i) => (
            <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
          ))}
        </div>
      )}

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => setResults(null)}>
          <FlaskConical className="w-4 h-4 mr-2" />Run Another Test
        </Button>
      </div>
    </div>
  );
};

export default HypothesisTestingPanel;
