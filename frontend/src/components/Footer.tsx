import { Github, Linkedin, Instagram } from "lucide-react";
import { useState } from "react";
import DonateModal from "./DonateModal";
import Logo from "./Logo";

const Footer = () => {
  const [donateOpen, setDonateOpen] = useState(false);

  return (
    <footer className="relative z-10 py-16 border-t border-border bg-card/95 backdrop-blur-xl">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-1">
            <Logo size="md" className="mb-4" />
            <p className="text-muted-foreground text-sm leading-relaxed">
              AI Decision Intelligence Engine. SpaceForge turns data into decisions instantly.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Product</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Integrations</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">API</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Resources</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Tutorials</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Support</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">© 2026 SpaceForge AI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://www.instagram.com/space_forge.in?igsh=MTY2aHNkamdmZXRmbg==" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="https://github.com/benadictfrancisdev/Semgenius/tree/main" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
              <Github className="w-5 h-5" />
            </a>
            <a href="https://www.linkedin.com/in/benadict-francis-david-5959a7313" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
      <DonateModal open={donateOpen} onOpenChange={setDonateOpen} />
    </footer>
  );
};

export default Footer;
