import { useState } from "react";
import { Link } from "react-router-dom";
import DonateModal from "./DonateModal";
import Logo from "./Logo";
import { Linkedin, Instagram, Github } from "lucide-react";

const Footer = () => {
  const [donateOpen, setDonateOpen] = useState(false);

  const solutions = [
    { label: "Founders & CEOs", href: "/auth" },
    { label: "Enterprises", href: "/pricing" },
    { label: "Data Teams", href: "/data-agent" },
    { label: "Business Analysts", href: "/data-agent" },
  ];

  const resources = [
    { label: "Documentation", href: "/docs" },
    { label: "Blog", href: "/docs" },
    { label: "Tutorials", href: "/docs" },
    { label: "Support", href: "/docs" },
  ];

  const company = [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/about" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ];

  return (
    <footer className="relative z-10 py-16 border-t border-border bg-card/95 backdrop-blur-xl">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          <div className="md:col-span-1">
            <Logo size="md" className="mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              AI Decision Intelligence Engine. SpaceForge turns data into decisions instantly.
            </p>
            <div className="flex items-center gap-2">
              <a href="https://www.linkedin.com/in/benadict-francis-david-5959a7313" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://www.instagram.com/space_forge.in?igsh=MTY2aHNkamdmZXRmbg==" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://github.com/benadictfrancisdev/Semgenius/tree/main" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors">
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-foreground mb-4">Solutions</h4>
            <ul className="space-y-3">
              {solutions.map((s) => (
                <li key={s.label}>
                  <Link to={s.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">{s.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-foreground mb-4">Resources</h4>
            <ul className="space-y-3">
              {resources.map((r) => (
                <li key={r.label}>
                  <Link to={r.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">{r.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-foreground mb-4">How It Works</h4>
            <ul className="space-y-3">
              {["Upload Data", "AI Analysis", "Get Decisions", "Take Action", "Generate Reports"].map((step) => (
                <li key={step}><span className="text-sm text-muted-foreground">{step}</span></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              {company.map((c) => (
                <li key={c.label}>
                  <Link to={c.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">{c.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">© SpaceForge AI 2026. All Rights Reserved.</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/docs" className="hover:text-primary transition-colors">Docs</Link>
          </div>
        </div>
      </div>
      <DonateModal open={donateOpen} onOpenChange={setDonateOpen} />
    </footer>
  );
};

export default Footer;
