import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { StarField } from "./components/StarField";
import { Scene1Intro } from "./scenes/Scene1Intro";
import { Scene2Upload } from "./scenes/Scene2Upload";
import { Scene3Preview } from "./scenes/Scene3Preview";
import { Scene4Stats } from "./scenes/Scene4Stats";
import { Scene5KPI } from "./scenes/Scene5KPI";
import { Scene6NLP } from "./scenes/Scene6NLP";
import { Scene7Charts } from "./scenes/Scene7Charts";
import { Scene8Closing } from "./scenes/Scene8Closing";

const t25 = springTiming({ config: { damping: 200 }, durationInFrames: 25 });

export const MainVideo = () => (
  <AbsoluteFill style={{ background: "#0A0A1A" }}>
    <StarField />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={180}><Scene1Intro /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={150}><Scene2Upload /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={150}><Scene3Preview /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={150}><Scene4Stats /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={120}><Scene5KPI /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={120}><Scene6NLP /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={120}><Scene7Charts /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t25} />
      <TransitionSeries.Sequence durationInFrames={150}><Scene8Closing /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
