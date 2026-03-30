import { memo } from "react";
import { AlertCircle, Trash2, CheckCircle2, Sparkles, Zap, Eye, FileWarning, Users } from "lucide-react";

const PainPoints = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-semibold tracking-wide mb-4">
            Real Problems We Solve
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">
            The pain every analyst <span className="text-destructive">knows too well</span>
          </h2>
        </div>

        <div className="space-y-12">
          {/* Pain Point 1 */}
          <div className="grid lg:grid-cols-2 gap-0 rounded-2xl border border-border overflow-hidden bg-card">
            {/* Problem Side */}
            <div className="p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-border bg-destructive/[0.03]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-destructive/10">
                  <FileWarning className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-destructive tracking-widest uppercase">Pain Point 1</span>
                  <h3 className="text-xl font-bold text-foreground">Dirty, Messy Raw Data</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Raw data almost always contains errors, missing values, inconsistencies, and other issues that need to be addressed before any analysis can begin.
              </p>
              <div className="space-y-3">
                <SufferingItem text="Spending entire work days just fixing null values and type mismatches" />
                <SufferingItem text="Missing values that silently corrupt analysis results" />
                <SufferingItem text="No clear audit trail of what was cleaned and why" />
              </div>
            </div>

            {/* Solution Side */}
            <div className="p-8 lg:p-10 bg-primary/[0.03]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <span className="text-lg font-bold text-primary">SpaceForge Fix</span>
              </div>
              <p className="text-base text-foreground font-medium leading-relaxed mb-6">
                AI-powered cleaning suggestions on upload — accept or reject with one click. Zero manual pandas scripts needed.
              </p>
              <div className="space-y-3">
                <FixItem text="Auto-detect nulls, type mismatches, and outliers on upload" />
                <FixItem text="One-click accept/reject for every suggested fix" />
                <FixItem text="Full audit log of every transformation applied" />
              </div>
            </div>
          </div>

          {/* Pain Point 2 */}
          <div className="grid lg:grid-cols-2 gap-0 rounded-2xl border border-border overflow-hidden bg-card">
            {/* Problem Side */}
            <div className="p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-border bg-destructive/[0.03]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-destructive/10">
                  <Users className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-destructive tracking-widest uppercase">Pain Point 2</span>
                  <h3 className="text-xl font-bold text-foreground">Duplicate & Inconsistent Records</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Duplicate data leads to incorrect analysis and wasted resources. Inconsistent formatting across sources creates nightmares when combining data.
              </p>
              <div className="space-y-3">
                <SufferingItem text="Same customer appearing 3 times with slightly different names" />
                <SufferingItem text="Revenue inflated due to double-counted transactions" />
                <SufferingItem text="Hours spent on manual deduplication in Excel" />
              </div>
            </div>

            {/* Solution Side */}
            <div className="p-8 lg:p-10 bg-primary/[0.03]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <span className="text-lg font-bold text-primary">SpaceForge Fix</span>
              </div>
              <p className="text-base text-foreground font-medium leading-relaxed mb-6">
                Auto-deduplication detection with instant preview before committing changes.
              </p>
              <div className="space-y-3">
                <FixItem text="Fuzzy matching detects near-duplicate records automatically" />
                <FixItem text="Side-by-side preview before any merge or deletion" />
                <FixItem text="Standardize formats across all data sources in one click" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SufferingItem = ({ text }: { text: string }) => (
  <div className="flex items-start gap-2.5">
    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
    <span className="text-sm text-muted-foreground leading-snug">{text}</span>
  </div>
);

const FixItem = ({ text }: { text: string }) => (
  <div className="flex items-start gap-2.5">
    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
    <span className="text-sm text-muted-foreground leading-snug">{text}</span>
  </div>
);

export default memo(PainPoints);
