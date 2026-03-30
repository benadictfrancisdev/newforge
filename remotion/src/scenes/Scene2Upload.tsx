import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });

export const Scene2Upload = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headO = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const headY = interpolate(frame, [0, 15], [20, 0], { extrapolateRight: "clamp" });

  // File drag animation
  const fileX = interpolate(frame, [20, 50], [500, 0], { extrapolateRight: "clamp" });
  const fileY = interpolate(frame, [20, 50], [-150, 0], { extrapolateRight: "clamp" });
  const fileO = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" });

  // Progress bar
  const progress = interpolate(frame, [55, 80], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Success
  const checkScale = spring({ frame: frame - 85, fps, config: { damping: 12 } });
  const checkO = interpolate(frame, [83, 88], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Stats
  const statsO = interpolate(frame, [95, 108], [0, 1], { extrapolateRight: "clamp" });
  const statsY = interpolate(frame, [95, 108], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily, justifyContent: "center", alignItems: "center" }}>
      <h1 style={{
        fontSize: 42, fontWeight: 700, color: "white", textAlign: "center",
        opacity: headO, transform: `translateY(${headY}px)`, marginBottom: 50,
      }}>
        <span style={{ color: "#7C3AED" }}>Step 1</span> — Upload Your Data
      </h1>

      {/* Upload zone */}
      <div style={{
        width: 700, height: 300, position: "relative",
        background: "rgba(255,255,255,0.03)",
        border: `2px dashed rgba(124,58,237,${frame > 50 ? 0.8 : 0.35})`,
        borderRadius: 24, display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", gap: 16,
      }}>
        {/* File icon flying in */}
        <div style={{
          opacity: fileO,
          transform: `translate(${fileX}px, ${fileY}px)`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        }}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M12 18v-6" /><path d="m9 15 3-3 3 3" />
          </svg>
          <span style={{ fontSize: 16, color: "#CBD5E1" }}>sales_data.csv — 300,000 rows</span>
        </div>

        {/* Progress bar */}
        {frame > 55 && (
          <div style={{
            position: "absolute", bottom: 30, left: 40, right: 40,
            height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4,
          }}>
            <div style={{
              width: `${progress}%`, height: "100%",
              background: "linear-gradient(90deg, #7C3AED, #06B6D4)",
              borderRadius: 4,
              boxShadow: "0 0 12px rgba(124,58,237,0.5)",
            }} />
          </div>
        )}

        {/* Checkmark */}
        {frame > 83 && (
          <div style={{
            position: "absolute", top: -20, right: -20,
            width: 48, height: 48, borderRadius: "50%",
            background: "#22C55E", display: "flex",
            justifyContent: "center", alignItems: "center",
            opacity: checkO, transform: `scale(${checkScale})`,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* File stats */}
      {frame > 95 && (
        <div style={{
          display: "flex", gap: 40, marginTop: 30,
          opacity: statsO, transform: `translateY(${statsY}px)`,
        }}>
          {[
            { label: "Rows", value: "300,000" },
            { label: "Columns", value: "12" },
            { label: "File Size", value: "48.2 MB" },
            { label: "Parse Time", value: "2.1s" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: "#06B6D4" }}>{s.value}</p>
              <p style={{ fontSize: 14, color: "#94A3B8" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
