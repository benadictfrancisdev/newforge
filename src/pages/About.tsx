import Navbar from "@/components/Navbar";
import SpaceBackground from "@/components/SpaceBackground";
import Footer from "@/components/Footer";

const About = () => (
  <div className="min-h-screen bg-background relative">
    <SpaceBackground />
    <Navbar />
    <main className="relative z-10 pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-3xl">
        <h1 className="text-4xl font-extrabold text-foreground mb-6">About SpaceForge</h1>
        <p className="text-muted-foreground leading-relaxed mb-6">
          SpaceForge is an AI-powered data analytics platform built for teams that demand real-time insights. 
          We believe every organization — from startups to enterprises — deserves access to advanced analytics 
          without the complexity of traditional data infrastructure.
        </p>
        <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          To democratize data intelligence by making advanced analytics accessible, instant, and actionable 
          for every team, regardless of technical expertise.
        </p>
        <h2 className="text-2xl font-bold text-foreground mb-4">The Team</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Founded by data engineers and AI researchers, SpaceForge combines deep expertise in distributed 
          systems, machine learning, and user experience design to deliver a platform that's both powerful 
          and intuitive.
        </p>
        <h2 className="text-2xl font-bold text-foreground mb-4">Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          Reach out to us at{" "}
          <a href="mailto:hello@spaceforge.in" className="text-primary hover:underline">hello@spaceforge.in</a>
          {" "}or connect on{" "}
          <a href="https://www.linkedin.com/in/benadict-francis-david-5959a7313" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn</a>.
        </p>
      </div>
    </main>
    <Footer />
  </div>
);

export default About;
