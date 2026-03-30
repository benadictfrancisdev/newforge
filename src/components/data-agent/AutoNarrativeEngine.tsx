import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { summarizeDataset } from "@/lib/statisticalSummarizer";
import { BookOpen, Loader2, AlertTriangle, TrendingDown, TrendingUp, Lightbulb, Download, RefreshCw, Minus } from "lucide-react";

interface AutoNarrativeEngineProps {
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
  columnTypes?: Record<string, string>;
}

interface NarrativeResult {
  executive_briefing: string;
  technical_deep_dive?: string;
  what_happened: string;
  why_it_happened: string;
  where_it_happened: string;
  when_it_changed: string;
  what_is_at_risk: string;
  anomaly_chain: { anomaly: string; root_cause: string; segment: string; recommendation: string }[];
  key_metrics: { name: string; value: string; change: string; direction: "up" | "down" | "stable" }[];
  story_sections: { heading: string; content: string; priority: "high" | "medium" | "low" }[];
}

type AudienceRole = "executive" | "technical" | "stakeholder";

const AutoNarrativeEngine = ({ data, columns, datasetName, columnTypes }: AutoNarrativeEngineProps) => {
  const { user } = useAuth();
  const [result, setResult] = useState<NarrativeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<AudienceRole>("executive");

  const generate = async () => {
    setLoading(true);
    try {
      const summary = summarizeDataset(data, columns);
      const { data: res, error } = await supabase.functions.invoke("data-agent", {
        body: {
          action: "auto_narrative",
          data: data.slice(0, 50),
          columns,
          datasetName,
          userId: user?.id,
          dataSummary: JSON.stringify(summary),
          audienceRole: role,
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");
      if (res?.error) throw new Error(res.error);
      setResult(res);
      toast.success("Executive briefing generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate narrative");
    } finally {
      setLoading(false);
    }
  };

  const downloadText = () => {
    if (!result) return;
    const sections = [
      `EXECUTIVE BRIEFING: ${datasetName}`,
      "=".repeat(50),
      result.executive_briefing,
      "",
      "STRUCTURED STORY",
      "-".repeat(30),
      `WHAT HAPPENED:\n${result.what_happened}`,
      `\nWHY IT HAPPENED:\n${result.why_it_happened}`,
      `\nWHERE IT HAPPENED:\n${result.where_it_happened}`,
      `\nWHEN IT CHANGED:\n${result.when_it_changed}`,
      `\nWHAT IS AT RISK:\n${result.what_is_at_risk}`,
      "",
      "KEY METRICS",
      "-".repeat(30),
      ...result.key_metrics.map(m => `${m.name}: ${m.value} (${m.change})`),
      "",
      "ANOMALY CHAIN ANALYSIS",
      "-".repeat(30),
      ...result.anomaly_chain.map((a, i) => `${i + 1}. Anomaly: ${a.anomaly}\n   Root Cause: ${a.root_cause}\n   Segment: ${a.segment}\n   Action: ${a.recommendation}`),
    ].join("\n");
    const blob = new Blob([sections], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${datasetName}-executive-briefing.txt`;
    a.click();
  };

  const dirIcon = (d: string) => {
    if (d === "up") return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (d === "down") return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                AutoNarrative Engine
              </CardTitle>
              <CardDescription className="mt-1">
                Structured story: What → Why → Where → When → Risk — adjusted for audience
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={role} onValueChange={(v) => setRole(v as AudienceRole)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="stakeholder">Stakeholder</SelectItem>
                </SelectContent>
              </Select>
              {result && (
                <Button size="sm" variant="outline" onClick={downloadText}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Export
                </Button>
              )}
              <Button size="sm" onClick={generate} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                {result ? "Regenerate" : "Generate Briefing"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {result && (
        <>
          {/* Executive Briefing */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Executive Briefing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{result.executive_briefing}</p>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {result.key_metrics?.map((m, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.name}</p>
                  <p className="text-lg font-bold mt-1">{m.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {dirIcon(m.direction)}
                    <span className={`text-xs ${m.direction === "up" ? "text-green-500" : m.direction === "down" ? "text-red-500" : "text-muted-foreground"}`}>{m.change}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Structured Story: What → Why → Where → When → Risk */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Structured Data Story</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-4">
                  {[
                    { label: "What Happened", content: result.what_happened, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
                    { label: "Why It Happened", content: result.why_it_happened, color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
                    { label: "Where It Happened", content: result.where_it_happened, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
                    { label: "When It Changed", content: result.when_it_changed, color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
                    { label: "What Is At Risk", content: result.what_is_at_risk, color: "bg-red-500/10 text-red-600 border-red-500/20" },
                  ].filter(s => s.content).map((section, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`text-[10px] ${section.color}`}>{section.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-border">{section.content}</p>
                      {i < 4 && <Separator className="mt-3" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Additional Story Sections */}
          {result.story_sections?.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Deep Dive Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-4">
                    {result.story_sections.map((s, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium">{s.heading}</h4>
                          <Badge variant="outline" className="text-[9px]">{s.priority}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{s.content}</p>
                        {i < result.story_sections.length - 1 && <Separator className="mt-3" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Anomaly Chain */}
          {result.anomaly_chain?.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Anomaly → Root Cause → Action Chain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.anomaly_chain.map((a, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-600 border-red-500/20 shrink-0">Anomaly</Badge>
                        <p className="text-xs">{a.anomaly}</p>
                      </div>
                      <div className="flex items-start gap-2 pl-4">
                        <Badge variant="outline" className="text-[9px] bg-orange-500/10 text-orange-600 border-orange-500/20 shrink-0">Root Cause</Badge>
                        <p className="text-xs text-muted-foreground">{a.root_cause}</p>
                      </div>
                      <div className="flex items-start gap-2 pl-4">
                        <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20 shrink-0">Segment</Badge>
                        <p className="text-xs text-muted-foreground">{a.segment}</p>
                      </div>
                      <div className="flex items-start gap-2 pl-4">
                        <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20 shrink-0">Action</Badge>
                        <p className="text-xs text-muted-foreground">{a.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technical Deep Dive (only for technical role) */}
          {result.technical_deep_dive && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Technical Deep Dive</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line font-mono">{result.technical_deep_dive}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AutoNarrativeEngine;
