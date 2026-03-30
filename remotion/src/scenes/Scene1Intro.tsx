import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
const { fontFamily } = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const logoO = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const words = ["Your", "Data.", "Your", "Decisions.", "Automated."];

  const subO = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [100, 120], [20, 0], { extrapolateRight: "clamp" });

  const urlO = interpolate(frame, [130, 150], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily }}>
      {/* Expanding ring */}
      <div style={{
        position: "absolute",
        width: 400, height: 400, borderRadius: "50%",
        border: `2px solid rgba(124,58,237,${interpolate(frame, [0, 40], [0.6, 0], { extrapolateRight: "clamp" })})`,
        transform: `scale(${interpolate(frame, [0, 40], [0.5, 3], { extrapolateRight: "clamp" })})`,
      }} />

      {/* Logo */}
      <div style={{ opacity: logoO, transform: `scale(${logoScale})`, marginBottom: 40 }}>
        <Img src={staticFile("images/logo.png")} style={{ height: 120, objectFit: "contain" }} />
      </div>

      {/* Tagline */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 1200 }}>
        {words.map((w, i) => {
          const delay = 30 + i * 10;
          const o = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const y = interpolate(frame, [delay, delay + 12], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <span key={i} style={{
              fontSize: 56, fontWeight: 700, color: "white",
              opacity: o, transform: `translateY(${y}px)`,
              textShadow: "0 0 40px rgba(124,58,237,0.5)",
            }}>{w}</span>
          );
        })}
      </div>

      <p style={{
        fontSize: 24, color: "#94A3B8", marginTop: 30,
        opacity: subO, transform: `translateY(${subY}px)`,
      }}>AI-Powered Data Intelligence Platform</p>

      <p style={{
        fontSize: 20, color: "#7C3AED", marginTop: 16, fontWeight: 600,
        opacity: urlO,
      }}>www.spaceforge.in</p>
    </AbsoluteFill>
  );
};
