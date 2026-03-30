import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
const { fontFamily } = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });
const { fontFamily: mono } = loadMono("normal", { weights: ["400"], subsets: ["latin"] });

const rows = [
  ["Alice Johnson", "25", "₹45,000", "85", "Premium"],
  ["Bob Smith", "34", "₹62,000", "72", "Standard"],
  ["Carol Davis", "28", "₹38,000", "91", "Premium"],
  ["David Wilson", "45", "₹78,000", "68", "Standard"],
  ["Eva Brown", "31", "₹55,000", "89", "Premium"],
  ["Frank Miller", "29", "₹41,000", "76", "Standard"],
];
const headers = ["Name", "Age", "Income", "Score", "Category"];

export const Scene3Preview = () => {
  const frame = useCurrentFrame();

  const headO = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const tableO = interpolate(frame, [15, 25], [0, 1], { extrapolateRight: "clamp" });
  const scanLine = interpolate(frame, [30, 90], [0, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Data cleaning panel
  const cleanO = interpolate(frame, [60, 75], [0, 1], { extrapolateRight: "clamp" });
  const cleanX = interpolate(frame, [60, 75], [50, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily, justifyContent: "center", alignItems: "center" }}>
      <h1 style={{
        fontSize: 42, fontWeight: 700, color: "white", textAlign: "center",
        opacity: headO, marginBottom: 40,
      }}>
        <span style={{ color: "#06B6D4" }}>Step 2</span> — Preview & Clean Data
      </h1>

      <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
        {/* Data table */}
        <div style={{
          opacity: tableO,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: 8, overflow: "hidden",
        }}>
          <table style={{ borderCollapse: "collapse", fontSize: 15 }}>
            <thead>
              <tr>
                {headers.map(h => (
                  <th key={h} style={{
                    padding: "10px 20px", color: "#7C3AED",
                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                    textAlign: "left", fontWeight: 600,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{
                  background: Math.floor(scanLine) === ri ? "rgba(6,182,212,0.12)" : "transparent",
                }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: "8px 20px", color: "#CBD5E1",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      fontFamily: ci > 0 && ci < 4 ? mono : fontFamily,
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cleaning panel */}
        <div style={{
          opacity: cleanO, transform: `translateX(${cleanX}px)`,
          width: 350, padding: 24,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
        }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 16 }}>🧹 Auto-Clean</p>
          {[
            { action: "Remove duplicates", count: "23 found", done: frame > 80 },
            { action: "Fill missing values", count: "8 cells", done: frame > 90 },
            { action: "Standardize formats", count: "Done", done: frame > 100 },
            { action: "Detect outliers", count: "4 flagged", done: frame > 110 },
          ].map((item, i) => {
            const itemO = interpolate(frame, [70 + i * 8, 78 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", opacity: itemO,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{ fontSize: 14, color: "#CBD5E1" }}>{item.action}</span>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: item.done ? "#22C55E" : "#FBBF24",
                }}>{item.done ? "✓ " : ""}{item.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p style={{
        fontSize: 18, color: "#94A3B8", marginTop: 30,
        opacity: interpolate(frame, [120, 135], [0, 1], { extrapolateRight: "clamp" }),
      }}>Instant data preview with one-click cleaning & formatting</p>
    </AbsoluteFill>
  );
};
