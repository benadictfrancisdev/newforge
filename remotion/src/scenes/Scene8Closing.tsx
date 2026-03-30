import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
const { fontFamily } = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });

const features = [
  "📊 Statistics Engine",
  "📈 KPI Intelligence",
  "🔍 NLP Queries",
  "📉 Predictive Analytics",
  "🤖 ML Workbench",
  "📋 Auto Reports",
];

export const Scene8Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoO = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const logoSc = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });

  const tagO = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [25, 40], [30, 0], { extrapolateRight: "clamp" });

  const urlO = interpolate(frame, [100, 115], [0, 1], { extrapolateRight: "clamp" });
  const urlSc = spring({ frame: frame - 100, fps, config: { damping: 10 } });
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ fontFamily, justifyContent: "center", alignItems: "center" }}>
      <div style={{
        position: "absolute",
        width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(124,58,237,${0.12 * glowPulse}) 0%, transparent 70%)`,
      }} />

      <div style={{ opacity: logoO, transform: `scale(${logoSc})`, marginBottom: 30 }}>
        <Img src={staticFile("images/logo.png")} style={{ height: 100, objectFit: "contain" }} />
      </div>

      <h1 style={{
        fontSize: 48, fontWeight: 700, color: "white", textAlign: "center",
        opacity: tagO, transform: `translateY(${tagY}px)`, marginBottom: 30,
      }}>Stop Analyzing. Start Deciding.</h1>

      <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center",
        gap: 12, maxWidth: 800, marginBottom: 40,
      }}>
        {features.map((f, i) => {
          const delay = 45 + i * 8;
          const o = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const sc = spring({ frame: frame - delay, fps, config: { damping: 15 } });
          return (
            <span key={i} style={{
              opacity: o, transform: `scale(${0.7 + sc * 0.3})`,
              padding: "8px 18px", borderRadius: 20,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#CBD5E1", fontSize: 15, fontWeight: 600,
            }}>{f}</span>
          );
        })}
      </div>

      <div style={{
        opacity: urlO, transform: `scale(${0.8 + urlSc * 0.2})`,
        padding: "14px 40px", borderRadius: 12,
        background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.3))",
        border: "1px solid rgba(124,58,237,0.5)",
        boxShadow: `0 0 30px rgba(124,58,237,${0.3 * glowPulse})`,
      }}>
        <p style={{ fontSize: 28, fontWeight: 700, color: "white", textAlign: "center", letterSpacing: 1 }}>www.spaceforge.in</p>
      </div>
    </AbsoluteFill>
  );
};
