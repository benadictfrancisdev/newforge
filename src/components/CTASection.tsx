import { memo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-16 relative">
      <div className="container mx-auto px-6">
        {/* Enterprise banner */}
        <div className="max-w-5xl mx-auto rounded-2xl bg-card border border-border p-8 md:p-10 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full mb-3">
                ⭐ ENTERPRISE
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">AI Decision Intelligence — built for scale.</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xl">
                For organizations that need dedicated AI infrastructure, custom decision models, SLAs, and white-glove onboarding.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground">
                {["Unlimited Datasets", "Unlimited Rows", "Unlimited Users", "Dedicated AI Cluster", "Custom SLA", "SSO / SAML", "Priority Support 24/7"].map((f) => (
                  <span key={f} className="flex items-center gap-1">
                    <span className="text-primary">✓</span> {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm text-muted-foreground">Custom pricing</p>
              <p className="text-xs text-muted-foreground mb-3">billed annually</p>
              <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90 gap-1">
                Contact Sales <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="max-w-5xl mx-auto mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { plan: "Standard", price: "$19.99/mo", credits: "300 credits/mo", slug: "standard" },
              { plan: "Pro", price: "$49.99/mo", credits: "1,500 credits/mo", slug: "pro", popular: true },
              { plan: "Team", price: "$99.99/mo", credits: "4,000 credits/mo", slug: "team" },
            ].map((p) => (
              <Link
                key={p.slug}
                to="/pricing"
                className={`rounded-xl border p-5 text-center transition-all hover:scale-[1.02] ${
                  p.popular
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                {p.popular && (
                  <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2">
                    MOST POPULAR
                  </span>
                )}
                <h4 className="font-bold text-foreground">{p.plan}</h4>
                <p className="text-xl font-bold text-foreground mt-1">{p.price}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Zap className="w-3 h-3 text-accent" /> {p.credits}
                </p>
                <span className="inline-block mt-3 text-xs font-semibold text-primary">View Plan →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA banner */}
        <div
          className="max-w-5xl mx-auto rounded-2xl p-10 md:p-14"
          style={{ background: "linear-gradient(135deg, hsl(222 38% 10%) 0%, hsl(210 60% 18%) 100%)" }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">Turns Data Into Decisions Instantly</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Stop analyzing.<br />Start deciding.
              </h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Upload your data and get instant decisions — what's working, what's broken, and exactly what to do next.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/data-agent">
                <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-6 gap-1">
                  <Zap className="w-4 h-4" /> Analyze My Data
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-6">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(CTASection);
