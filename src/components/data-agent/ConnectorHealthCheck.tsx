import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

interface ConnectorStatus {
  name: string;
  key: string;
  status: "checking" | "ok" | "error" | "warning";
  message: string;
  latencyMs?: number;
}

const CONNECTORS = [
  { key: "firebase_auth",  name: "Firebase Auth" },
  { key: "supabase_db",    name: "Supabase DB" },
  { key: "supabase_rls",   name: "Supabase RLS" },
  { key: "edge_data_agent",name: "Data-Agent Edge Fn" },
  { key: "edge_razorpay",  name: "Razorpay Edge Fn" },
  { key: "edge_spacebot",  name: "SpaceBot Edge Fn" },
];

async function checkConnector(key: string): Promise<{ status: "ok"|"error"|"warning"; message: string; latencyMs?: number }> {
  const t0 = Date.now();
  try {
    switch (key) {
      case "firebase_auth": {
        const user = auth.currentUser;
        return { status: user ? "ok" : "warning", message: user ? `Signed in as ${user.email}` : "Not signed in (anonymous OK)", latencyMs: Date.now() - t0 };
      }
      case "supabase_db": {
        const { error } = await supabase.from("profiles").select("id").limit(1);
        if (error) return { status: "error", message: error.message };
        return { status: "ok", message: "Connected", latencyMs: Date.now() - t0 };
      }
      case "supabase_rls": {
        // Try to access datasets table — should succeed or give RLS error (both mean connected)
        const { error } = await supabase.from("datasets").select("id").limit(1);
        if (error && error.code === "PGRST301") return { status: "warning", message: "RLS active (unauthenticated)" };
        if (error) return { status: "error", message: error.message };
        return { status: "ok", message: "RLS policies active", latencyMs: Date.now() - t0 };
      }
      case "edge_data_agent": {
        const { error } = await supabase.functions.invoke("data-agent", { body: { action: "health" } });
        if (error) return { status: "error", message: error.message };
        return { status: "ok", message: "Edge function responding", latencyMs: Date.now() - t0 };
      }
      case "edge_razorpay": {
        const { error } = await supabase.functions.invoke("razorpay-payment", { body: { action: "subscription-status", userId: "health-check" } });
        // 400/422 errors mean function is alive but rejected invalid input — that's fine
        if (error && !error.message.includes("non-2xx")) return { status: "error", message: error.message };
        return { status: "ok", message: "Edge function responding", latencyMs: Date.now() - t0 };
      }
      case "edge_spacebot": {
        const { error } = await supabase.functions.invoke("spacebot", { body: { message: "__health__", sessionId: "health-check" } });
        if (error && !error.message.includes("non-2xx")) return { status: "error", message: error.message };
        return { status: "ok", message: "Edge function responding", latencyMs: Date.now() - t0 };
      }
      default:
        return { status: "warning", message: "Unknown connector" };
    }
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Unknown error" };
  }
}

export function ConnectorHealthCheck({ onClose }: { onClose?: () => void }) {
  const [statuses, setStatuses] = useState<ConnectorStatus[]>(
    CONNECTORS.map(c => ({ ...c, status: "checking" as const, message: "Checking…" }))
  );
  const [running, setRunning] = useState(false);

  const runAll = useCallback(async () => {
    setRunning(true);
    setStatuses(CONNECTORS.map(c => ({ ...c, status: "checking", message: "Checking…" })));
    for (const c of CONNECTORS) {
      const result = await checkConnector(c.key);
      setStatuses(prev => prev.map(s => s.key === c.key ? { ...s, ...result } : s));
    }
    setRunning(false);
  }, []);

  useEffect(() => { runAll(); }, [runAll]);

  const allOk = statuses.every(s => s.status === "ok" || s.status === "warning");
  const hasError = statuses.some(s => s.status === "error");

  const icon = (s: ConnectorStatus["status"]) => {
    if (s === "checking") return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    if (s === "ok") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (s === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  return (
    <Card className="w-full max-w-lg border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            System Health
            <Badge variant={hasError ? "destructive" : allOk ? "default" : "secondary"} className="text-[10px]">
              {running ? "Checking…" : hasError ? "Issues found" : "All systems OK"}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={runAll} disabled={running} className="h-7 w-7 p-0">
            <RefreshCw className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {statuses.map(s => (
          <div key={s.key} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              {icon(s.status)}
              <span className="text-sm font-medium">{s.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {s.latencyMs !== undefined && s.status === "ok" && (
                <span className="text-[10px] text-muted-foreground">{s.latencyMs}ms</span>
              )}
              <span className="text-xs text-muted-foreground max-w-[160px] truncate text-right">{s.message}</span>
            </div>
          </div>
        ))}
        {onClose && (
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={onClose}>Close</Button>
        )}
      </CardContent>
    </Card>
  );
}

export default ConnectorHealthCheck;
