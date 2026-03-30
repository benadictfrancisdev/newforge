import { useRef, useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ThemeToggle from "@/components/ThemeToggle";
import CreditMeter from "@/components/data-agent/CreditMeter";
import PrivacyShield from "@/components/data-agent/PrivacyShield";
import Logo from "@/components/Logo";

interface NavGroup {
  label: string;
  items: {
    value: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    requiresData?: boolean;
  }[];
}

interface ResponsiveSidebarProps {
  navGroups: NavGroup[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasData: boolean;
  datasetInfo?: {
    name: string;
    rowCount: number;
    columnCount: number;
  };
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  children?: React.ReactNode;
}

const ResponsiveSidebar = memo(({
  navGroups,
  activeTab,
  onTabChange,
  hasData,
  datasetInfo,
  collapsed,
  onCollapsedChange,
  children,
}: ResponsiveSidebarProps) => {
  const isMobile = useIsMobile();
  const navRef = useRef<HTMLElement>(null);

  const handleItemClick = useCallback((value: string, isDisabled: boolean) => {
    if (!isDisabled) {
      onTabChange(value);
    }
  }, [onTabChange]);

  if (isMobile) return null;

  return (
    <aside
      data-onboarding="sidebar"
      style={{ width: collapsed ? "56px" : "224px" }}
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] z-40",
        "transition-all duration-300 ease-out flex flex-col",
        "hidden md:flex",
        "bg-card/95 backdrop-blur-xl border-r border-border"
      )}
    >
      {/* Sidebar Header */}
      <div className="p-3 border-b border-border/50">
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className={cn(
            "w-full flex items-center gap-2 rounded-xl hover:bg-secondary transition-all duration-200",
            collapsed ? "justify-center p-2" : "px-2 py-2"
          )}
        >
          <Logo size="sm" showText={false} iconOnly />
          {!collapsed && (
            <>
              <span className="text-sm font-semibold text-foreground flex-1 text-left">Data Agent</span>
              <ChevronRight className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-200",
                !collapsed && "rotate-180"
              )} />
            </>
          )}
        </button>
      </div>

      {/* Dataset Badge */}
      {datasetInfo && !collapsed && (
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl" style={{ background: "rgba(0,200,255,0.06)", border: "1px solid rgba(0,200,255,0.15)" }}>
            <div
              className="w-2 h-2 rounded-full animate-pulse shrink-0"
              style={{ background: "hsl(160 84% 39%)", boxShadow: "0 0 6px hsl(160 84% 39% / 0.5)" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{datasetInfo.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {datasetInfo.rowCount.toLocaleString()} rows • {datasetInfo.columnCount} cols
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Groups — scroll preserved via ref, no remount */}
      <nav ref={navRef} className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <div className="px-4 py-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;
              const isDisabled = item.requiresData && !hasData;

              return (
                <button
                  key={item.value}
                  onClick={() => handleItemClick(item.value, !!isDisabled)}
                  disabled={!!isDisabled}
                  className={cn(
                    "w-full flex items-center text-sm transition-all duration-200 relative",
                    collapsed
                      ? "justify-center py-3 px-0"
                      : "gap-3 px-4 py-2.5",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    isDisabled && "opacity-40 cursor-not-allowed"
                  )}
                  title={collapsed ? item.label : undefined}
                  style={isActive ? {
                    background: "linear-gradient(90deg, rgba(0,102,255,0.1) 0%, transparent 100%)",
                  } : undefined}
                >
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                      style={{
                        background: "hsl(216 90% 53%)",
                        boxShadow: "0 0 8px rgba(0,102,255,0.5)",
                      }}
                    />
                  )}
                  <Icon className={cn(
                    "w-[18px] h-[18px] shrink-0",
                    isActive && "text-primary"
                  )} />
                  {!collapsed && (
                    <span className={cn("font-medium", isActive && "text-primary")}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Privacy Shield */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-border/50">
          <PrivacyShield compact={false} />
        </div>
      )}

      {/* Credit Meter */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-border/50">
          <CreditMeter />
        </div>
      )}

      {/* Additional content */}
      {children && !collapsed && (
        <div className="p-3 border-t border-border/50">
          {children}
        </div>
      )}

      {/* Theme Toggle */}
      <div className={cn(
        "p-3 border-t border-border/50",
        collapsed ? "flex justify-center" : "flex items-center justify-between px-4"
      )}>
        {!collapsed && <span className="text-xs text-muted-foreground">Theme</span>}
        <ThemeToggle />
      </div>
    </aside>
  );
});

ResponsiveSidebar.displayName = "ResponsiveSidebar";

export default ResponsiveSidebar;
