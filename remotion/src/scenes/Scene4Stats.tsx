import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
const { fontFamily } = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });
const { fontFamily: mono } = loadMono("normal", { weights: ["400"], subsets: ["latin"] });

const stats = [
  { label: "Mean Income", value: "₹54,600", sub: "σ = ₹15,200" },
  { label: "Median Score", value: "81.5", sub: "IQR: 72–89" },
  { label: "Missing Values", value: "0.02%", sub: "8 of 300K cells" },
  { label: "Outliers", value: "4", sub: "IQR method" },
  { label: "Correlation", value: "0.83", sub: "Income ↔ Score" },
  { label: "Data Quality", value: "98.7%", sub: "Excellent" },
];

const termLines = [
  "> Computing descriptive stats...",
  "> Percentiles: P25=38K  P50=52K  P75=67K",
  "> Variance: 2.31e+8 | Std Dev: 15,200",
  "> Skewness: 0.42 | Kurtosis: 2.81",
  "> Outliers (IQR): rows [4, 127, 892, 1203]",
  "> ✅ 50+ metrics computed locally",
];

export const Scene4Stats = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headO = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily, justifyContent: "center", alignItems: "center" }}>
      <h1 style={{
        fontSize: 42, fontWeight: 700, color: "white", textAlign: "center",
        opacity: headO, marginBottom: 40,
      }}>
        <span style={{ color: "#8B5CF6" }}>Step 3</span> — Statistics Engine
      </h1>

      <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
        {/* Terminal */}
        <div style={{
          width: 480, padding: 20,
          background: "rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
        }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FBBF24" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E" }} />
          </div>
          {termLines.map((line, i) => {
            const delay = 10 + i * 14;
            const chars = Math.floor(interpolate(frame, [delay, delay + 12], [0, line.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
            const isOk = line.startsWith("> ✅");
            return (
              <p key={i} style={{
                fontFamily: mono, fontSize: 14,
                color: isOk ? "#22C55E" : "#06B6D4",
                margin: "3px 0",
                opacity: frame >= delay ? 1 : 0,
              }}>{line.slice(0, chars)}{frame >= delay && chars < line.length ? "▌" : ""}</p>
            );
          })}
        </div>

        {/* Stat cards */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
        }}>
          {stats.map((s, i) => {
            const delay = 30 + i * 10;
            const o = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const sc = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 120 } });
            return (
              <div key={i} style={{
                opacity: o, transform: `scale(${0.8 + sc * 0.2})`,
                width: 200, padding: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
              }}>
                <p style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: "white", fontFamily: mono }}>{s.value}</p>
                <p style={{ fontSize: 11, color: "#64748B" }}>{s.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      <p style={{
        fontSize: 18, color: "#94A3B8", marginTop: 30,
        opacity: interpolate(frame, [120, 135], [0, 1], { extrapolateRight: "clamp" }),
      }}>50+ statistical metrics — computed locally, zero AI cost</p>
    </AbsoluteFill>
  );
};
