import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
const { fontFamily } = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const Scene6NLP = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headO = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // User query typing
  const query = "Show me revenue by category with predictions";
  const chars = Math.floor(interpolate(frame, [20, 60], [0, query.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  // AI response
  const respO = interpolate(frame, [65, 78], [0, 1], { extrapolateRight: "clamp" });
  const respY = interpolate(frame, [65, 78], [20, 0], { extrapolateRight: "clamp" });

  // Chart appear
  const chartO = interpolate(frame, [75, 88], [0, 1], { extrapolateRight: "clamp" });
  const chartSc = spring({ frame: frame - 75, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill style={{ fontFamily, justifyContent: "center", alignItems: "center" }}>
      <h1 style={{
        fontSize: 42, fontWeight: 700, color: "white", textAlign: "center",
        opacity: headO, marginBottom: 40,
      }}>
        <span style={{ color: "#FBBF24" }}>Step 5</span> — Ask in Plain English
      </h1>

      <div style={{ width: 900 }}>
        {/* Query input */}
        <div style={{
          padding: "16px 24px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(124,58,237,0.4)",
          borderRadius: 12, marginBottom: 20,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <span style={{ fontSize: 18, color: "white" }}>
            {query.slice(0, chars)}
            {chars < query.length && <span style={{ opacity: Math.sin(frame * 0.2) > 0 ? 1 : 0, color: "#7C3AED" }}>|</span>}
          </span>
        </div>

        {/* AI Response */}
        <div style={{
          opacity: respO, transform: `translateY(${respY}px)`,
          display: "flex", gap: 24,
        }}>
          {/* Text response */}
          <div style={{
            flex: 1, padding: 20,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} />
              <span style={{ fontSize: 14, color: "#22C55E", fontWeight: 600 }}>SpaceForge AI</span>
            </div>
            <p style={{ fontSize: 15, color: "#CBD5E1", lineHeight: 1.6 }}>
              Premium category generates <strong style={{ color: "#7C3AED" }}>62% higher revenue</strong> than Standard. 
              Based on current trends, Premium revenue will grow <strong style={{ color: "#06B6D4" }}>23% next quarter</strong>.
            </p>
          </div>

          {/* Mini chart */}
          <div style={{
            width: 320, padding: 16,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            opacity: chartO, transform: `scale(${0.8 + chartSc * 0.2})`,
          }}>
            <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>Revenue by Category</p>
            <svg width="280" height="120" viewBox="0 0 280 120">
              {/* Premium bar */}
              <rect x="40" y="20" width={interpolate(frame, [80, 95], [0, 180], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} height="30" rx="6" fill="#7C3AED" />
              <text x="30" y="40" fill="#94A3B8" fontSize="12" textAnchor="end">Premium</text>
              {/* Standard bar */}
              <rect x="40" y="70" width={interpolate(frame, [85, 100], [0, 110], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} height="30" rx="6" fill="#06B6D4" />
              <text x="30" y="90" fill="#94A3B8" fontSize="12" textAnchor="end">Standard</text>
            </svg>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
