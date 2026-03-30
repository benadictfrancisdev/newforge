import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SpaceBackground from "@/components/SpaceBackground";

const ADASection = lazy(() => import("@/components/ADASection"));
const ADAFutureSection = lazy(() => import("@/components/ADAFutureSection"));
const SpaceBotSection = lazy(() => import("@/components/SpaceBotSection"));
const CognitiveLayersSection = lazy(() => import("@/components/CognitiveLayersSection"));
const DemoSection = lazy(() => import("@/components/DemoSection"));
const Features = lazy(() => import("@/components/Features"));
const WhySpaceForge = lazy(() => import("@/components/WhySpaceForge"));
const PainPoints = lazy(() => import("@/components/PainPoints"));
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const Integrations = lazy(() => import("@/components/Integrations"));
const CTASection = lazy(() => import("@/components/CTASection"));
const Footer = lazy(() => import("@/components/Footer"));

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SpaceBackground />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Suspense fallback={null}>
          <DemoSection />
          <Features />
          <ADASection />
          <ADAFutureSection />
          <SpaceBotSection />
          <CognitiveLayersSection />
          <WhySpaceForge />
          <PainPoints />
          <HowItWorks />
          <Integrations />
          <CTASection />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
