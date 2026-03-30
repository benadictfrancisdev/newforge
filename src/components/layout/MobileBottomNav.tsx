import { cn } from "@/lib/utils";
import { 
  Upload, 
  Table, 
  Layers, 
  MessageSquare, 
  MoreHorizontal,
  Link2,
  BarChart3,
  FileText,
  Brain,
  Activity,
  Radio,
  LayoutDashboard,
  Zap,
  PieChart
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasData: boolean;
}

const MobileBottomNav = ({ activeTab, onTabChange, hasData }: MobileBottomNavProps) => {
  const [moreOpen, setMoreOpen] = useState(false);

  // Primary navigation items for bottom bar
  const primaryItems = [
    { value: "upload", label: "Upload", icon: Upload, requiresData: false },
    { value: "preview", label: "Preview", icon: Table, requiresData: true },
    { value: "powerbi", label: "Dashboard", icon: Layers, requiresData: true },
    { value: "chat", label: "Chat", icon: MessageSquare, requiresData: true },
  ];

  // Secondary items for overflow menu
  const secondaryItems = [
    { value: "connect", label: "Connect", icon: Link2, requiresData: false },
    { value: "nlp", label: "NLP Engine", icon: Zap, requiresData: true },
    { value: "analyze", label: "Analyze", icon: BarChart3, requiresData: true },
    { value: "predict", label: "Predict", icon: Activity, requiresData: true },
    { value: "ml", label: "ML Workbench", icon: Brain, requiresData: true },
    { value: "visualize", label: "Charts", icon: PieChart, requiresData: true },
    { value: "dashboard", label: "Auto Dashboard", icon: LayoutDashboard, requiresData: true },
    { value: "stream", label: "Live Stream", icon: Radio, requiresData: true },
    { value: "report", label: "Report", icon: FileText, requiresData: true },
  ];

  const handleSecondarySelect = (value: string) => {
    onTabChange(value);
    setMoreOpen(false);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border md:hidden pb-safe">
      <div className="flex items-center justify-around h-14">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.value;
          const isDisabled = item.requiresData && !hasData;

          return (
            <button
              key={item.value}
              onClick={() => !isDisabled && onTabChange(item.value)}
              disabled={isDisabled}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-0 px-1 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground",
                isDisabled && "opacity-40 cursor-not-allowed"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-0.5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </button>
          );
        })}

        {/* More Menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button 
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-0 px-1 transition-colors",
                secondaryItems.some(i => i.value === activeTab) 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-safe">
            <SheetHeader>
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 py-4">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.value;
                const isDisabled = item.requiresData && !hasData;

                return (
                  <button
                    key={item.value}
                    onClick={() => !isDisabled && handleSecondarySelect(item.value)}
                    disabled={isDisabled}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg transition-colors min-h-[72px]",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "bg-muted/50 text-muted-foreground hover:bg-muted",
                      isDisabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <Icon className="w-5 h-5 mb-1.5" />
                    <span className="text-xs font-medium text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Theme Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle showLabel />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
