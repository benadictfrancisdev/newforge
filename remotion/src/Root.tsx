import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 8 scenes: 180+150+150+150+120+120+120+150 = 1140
// Minus 7 transitions × 25 frames = 175
// Total: 965 frames ≈ 32 seconds
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={965}
    fps={30}
    width={1920}
    height={1080}
  />
);
