import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
const { fontFamily } = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });

const kpis = [
  { name: "Revenue", value: "₹24.5L", trend: "+18.3%", direction: "up", insight: "Strong growth in Q3 driven by Premium segment" },
  { name: "Avg Score", value: "81.2", trend: "+4.7%", direction: "up", insight: "Quality metrics trending upward across all categories" },
  { name: "Customer Count", value: "12,450", trend: "+22.1%", direction: "up", insight: "New acquisitions outpacing churn 3:1" },
  { name: "Churn Risk", value: "8.2%", trend: "-2.4%", direction: "down", insight: "Retention improving with Premium tier loyalty" },
];

export const Scene5KPI = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headO = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily, justifyContent: "center", alignItems: "center" }}>
      <h1 style={{
        fontSize: 42, fontWeight: 700, color: "white", textAlign: "center",
        opacity: headO, marginBottom: 50,
      }}>
        <span style={{ color: "#06B6D4" }}>Step 4</span> — KPI Intelligence
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 1100 }}>
        {kpis.map((kpi, i) => {
          const delay = 15 + i * 15;
          const o = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const sc = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 100 } });
          const isUp = kpi.direction === "up";
          return (
            <div key={i} style={{
              opacity: o, transform: `scale(${0.85 + sc * 0.15})`,
              padding: 24,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid rgba(${isUp ? "34,197,94" : "239,68,68"},0.25)`,
              borderRadius: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 4 }}>{kpi.name}</p>
                  <p style={{ fontSize: 36, fontWeight: 700, color: "white" }}>{kpi.value}</p>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 10px", borderRadius: 8,
                  background: isUp ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                  color: isUp ? "#22C55E" : "#EF4444",
                  fontSize: 15, fontWeight: 600,
                }}>
                  {isUp ? "↑" : "↓"} {kpi.trend}
                </div>
              </div>
              <p style={{ fontSize: 13, color: "#64748B", marginTop: 10 }}>{kpi.insight}</p>
            </div>
          );
        })}
      </div>

      <p style={{
        fontSize: 18, color: "#94A3B8", marginTop: 30,
        opacity: interpolate(frame, [90, 105], [0, 1], { extrapolateRight: "clamp" }),
      }}>Auto-detected KPIs with real-time trend analysis</p>
    </AbsoluteFill>
  );
};
