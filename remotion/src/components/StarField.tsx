import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

const stars = Array.from({ length: 120 }, (_, i) => ({
  x: (i * 137.508) % 100,
  y: (i * 73.13) % 100,
  size: 1 + (i % 3),
  speed: 0.3 + (i % 5) * 0.15,
  brightness: 0.4 + (i % 4) * 0.2,
}));

export const StarField = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {/* Nebula glow */}
      <div style={{
        position: "absolute",
        width: "60%", height: "60%",
        top: "20%", left: "20%",
        borderRadius: "50%",
        background: `radial-gradient(ellipse, rgba(124,58,237,${0.08 + Math.sin(frame * 0.02) * 0.03}) 0%, transparent 70%)`,
      }} />
      <div style={{
        position: "absolute",
        width: "40%", height: "40%",
        top: "35%", left: "55%",
        borderRadius: "50%",
        background: `radial-gradient(ellipse, rgba(6,182,212,${0.06 + Math.cos(frame * 0.025) * 0.02}) 0%, transparent 70%)`,
      }} />
      {/* Stars */}
      {stars.map((s, i) => {
        const drift = Math.sin(frame * 0.01 * s.speed + i) * 3;
        const twinkle = 0.5 + Math.sin(frame * 0.05 * s.speed + i * 2) * 0.5;
        return (
          <div key={i} style={{
            position: "absolute",
            left: `${s.x + drift * 0.1}%`,
            top: `${s.y + Math.cos(frame * 0.008 + i) * 0.5}%`,
            width: s.size, height: s.size,
            borderRadius: "50%",
            background: `rgba(255,255,255,${s.brightness * twinkle})`,
            boxShadow: `0 0 ${s.size * 2}px rgba(255,255,255,${s.brightness * twinkle * 0.5})`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};
