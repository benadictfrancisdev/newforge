import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
const { fontFamily } = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const Scene7Charts = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headO = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const charts = [
    { title: "Revenue Trend", type: "line", delay: 15 },
    { title: "Category Distribution", type: "pie", delay: 25 },
    { title: "Score Heatmap", type: "heat", delay: 35 },
    { title: "Predictive Forecast", type: "forecast", delay: 45 },
  ];

  return (
    <AbsoluteFill style={{ fontFamily, justifyContent: "center", alignItems: "center" }}>
      <h1 style={{
        fontSize: 42, fontWeight: 700, color: "white", textAlign: "center",
        opacity: headO, marginBottom: 40,
      }}>
        <span style={{ color: "#22C55E" }}>Step 6</span> — Visualize Everything
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 1100 }}>
        {charts.map((c, i) => {
          const o = interpolate(frame, [c.delay, c.delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const sc = spring({ frame: frame - c.delay, fps, config: { damping: 15 } });
          return (
            <div key={i} style={{
              opacity: o, transform: `scale(${0.85 + sc * 0.15})`,
              padding: 20,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16, height: 200,
            }}>
              <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 12 }}>{c.title}</p>
              <svg width="100%" height="140" viewBox="0 0 400 140">
                {c.type === "line" && (() => {
                  const pts = Array.from({ length: 12 }, (_, j) => {
                    const x = 20 + j * 33;
                    const y = 100 - Math.sin(j * 0.5 + 1) * 40 - j * 3;
                    return `${x},${y}`;
                  }).join(" ");
                  const draw = interpolate(frame, [c.delay + 5, c.delay + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  return (
                    <>
                      <polyline points={pts} fill="none" stroke="#7C3AED" strokeWidth="2.5"
                        strokeDasharray="500" strokeDashoffset={500 - draw * 500} />
                      <polyline points={pts} fill="none" stroke="rgba(124,58,237,0.2)" strokeWidth="1" />
                    </>
                  );
                })()}
                {c.type === "pie" && (() => {
                  const segments = [
                    { pct: 0.45, color: "#7C3AED" },
                    { pct: 0.3, color: "#06B6D4" },
                    { pct: 0.15, color: "#FBBF24" },
                    { pct: 0.1, color: "#22C55E" },
                  ];
                  let cumAngle = -90;
                  return segments.map((seg, si) => {
                    const startAngle = cumAngle;
                    const endAngle = startAngle + seg.pct * 360;
                    cumAngle = endAngle;
                    const draw = interpolate(frame, [c.delay + 5 + si * 5, c.delay + 15 + si * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                    const actualEnd = startAngle + (endAngle - startAngle) * draw;
                    const cx = 200, cy = 70, r = 55;
                    const x1 = cx + r * Math.cos(startAngle * Math.PI / 180);
                    const y1 = cy + r * Math.sin(startAngle * Math.PI / 180);
                    const x2 = cx + r * Math.cos(actualEnd * Math.PI / 180);
                    const y2 = cy + r * Math.sin(actualEnd * Math.PI / 180);
                    const largeArc = (actualEnd - startAngle) > 180 ? 1 : 0;
                    return (
                      <path key={si}
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={seg.color} opacity="0.85" />
                    );
                  });
                })()}
                {c.type === "heat" && Array.from({ length: 24 }, (_, j) => {
                  const row = Math.floor(j / 6);
                  const col = j % 6;
                  const v = 0.2 + Math.sin(j * 0.8) * 0.4 + 0.3;
                  const heatO = interpolate(frame, [c.delay + 5 + j, c.delay + 10 + j], [0, v], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  return <rect key={j} x={30 + col * 58} y={10 + row * 32} width="52" height="26" rx="4" fill="#06B6D4" opacity={heatO} />;
                })}
                {c.type === "forecast" && (() => {
                  const actual = Array.from({ length: 8 }, (_, j) => {
                    const x = 20 + j * 33;
                    const y = 100 - (20 + j * 6 + Math.sin(j) * 10);
                    return `${x},${y}`;
                  }).join(" ");
                  const predicted = Array.from({ length: 5 }, (_, j) => {
                    const x = 20 + (7 + j) * 33;
                    const y = 100 - (62 + j * 5 + Math.sin(j + 7) * 8);
                    return `${x},${y}`;
                  }).join(" ");
                  const draw = interpolate(frame, [c.delay + 5, c.delay + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  return (
                    <>
                      <polyline points={actual} fill="none" stroke="#22C55E" strokeWidth="2.5"
                        strokeDasharray="400" strokeDashoffset={400 - draw * 400} />
                      <polyline points={predicted} fill="none" stroke="#FBBF24" strokeWidth="2" strokeDasharray="6,4"
                        opacity={interpolate(frame, [c.delay + 20, c.delay + 30], [0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
                      <text x="300" y="25" fill="#FBBF24" fontSize="11">Predicted</text>
                      <text x="100" y="110" fill="#22C55E" fontSize="11">Actual</text>
                    </>
                  );
                })()}
              </svg>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
