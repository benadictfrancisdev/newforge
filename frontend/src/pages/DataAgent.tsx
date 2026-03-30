import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "@/components/Navbar";
import DataUpload from "@/components/data-agent/DataUpload";
import DataPreview from "@/components/data-agent/DataPreview";
import { MobileBottomNav, ResponsiveSidebar, ResponsiveContainer } from "@/components/layout";
import { CollaborationProvider, JoinCollaborationDialog } from "@/components/data-agent/collaboration";
import { DashboardSkeleton } from "@/components/data-agent/skeletons";
import { cn } from "@/lib/utils";
import { 
  Upload, 
  Table, 
  BarChart3, 
  MessageSquare, 
  PieChart, 
  Loader2, 
  FileText, 
  Activity, 
  LayoutDashboard, 
  Zap, 
  Radio, 
  Layers, 
  Link2, 
  Brain,
} from "lucide-react";

// Lazy load heavy components
const AnalysisPanel = lazy(() => import("@/components/data-agent/AnalysisPanel"));
const DataChat = lazy(() => import("@/components/data-agent/DataChat"));
const VisualizationDashboard = lazy(() => import("@/components/data-agent/VisualizationDashboard"));
const ReportGenerator = lazy(() => import("@/components/data-agent/ReportGenerator"));
const NaturalLanguageEngine = lazy(() => import("@/components/data-agent/NaturalLanguageEngine"));
const PredictiveAnalytics = lazy(() => import("@/components/data-agent/PredictiveAnalytics"));
const AutoDashboard = lazy(() => import("@/components/data-agent/AutoDashboard"));
const RealTimeStream = lazy(() => import("@/components/data-agent/RealTimeStream"));
const PowerBIDashboard = lazy(() => import("@/components/data-agent/PowerBIDashboard"));
const WorkflowBuilder = lazy(() => import("@/components/data-agent/WorkflowBuilder"));
const MLWorkbench = lazy(() => import("@/components/data-agent/ml").then(m => ({ default: m.MLWorkbench })));

export interface DatasetState {
  id?: string;
  name: string;
  rawData: Record<string, unknown>[];
  cleanedData?: Record<string, unknown>[];
  columns: string[];
  status: string;
}

const DataAgent = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [dataset, setDataset] = useState<DatasetState | null>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const roomFromUrl = searchParams.get("room");

  useEffect(() => {
    // Allow demo access for testing - skip auth check if demo mode
    const isDemoMode = searchParams.get("demo") === "true";
    if (isDemoMode) {
      return; // Skip auth check for demo mode
    }
    
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate, searchParams]);

  const handleDataLoaded = (data: DatasetState) => {
    setDataset(data);
    setActiveTab("preview");
  };

  const handleDataCleaned = (cleanedData: Record<string, unknown>[]) => {
    if (dataset) {
      setDataset({ ...dataset, cleanedData, status: "cleaned" });
    }
  };

  const getColumnTypes = () => {
    if (!dataset) return {};
    return dataset.columns.reduce((acc, col) => {
      const sampleValues = (dataset.cleanedData || dataset.rawData).slice(0, 10).map(row => row[col]);
      const numericCount = sampleValues.filter(v => !isNaN(Number(v))).length;
      acc[col] = numericCount > 7 ? "numeric" : "categorical";
      return acc;
    }, {} as Record<string, "numeric" | "categorical" | "date">);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Allow demo access - skip auth check if demo mode
  const isDemoMode = searchParams.get("demo") === "true";
  if (!user && !isDemoMode) {
    return null;
  }

  const navGroups = [
    {
      label: "Data",
      items: [
        { value: "upload", label: "Upload", icon: Upload },
        { value: "connect", label: "Connect", icon: Link2 },
        { value: "preview", label: "Preview", icon: Table, requiresData: true },
      ]
    },
    {
      label: "Analysis",
      items: [
        { value: "nlp", label: "NLP Engine", icon: Zap, requiresData: true },
        { value: "analyze", label: "Analyze", icon: BarChart3, requiresData: true },
        { value: "predict", label: "Predict", icon: Activity, requiresData: true },
        { value: "ml", label: "ML Workbench", icon: Brain, requiresData: true },
      ]
    },
    {
      label: "Visualize",
      items: [
        { value: "powerbi", label: "Dashboard", icon: Layers, requiresData: true },
        { value: "visualize", label: "Charts", icon: PieChart, requiresData: true },
        { value: "dashboard", label: "Auto Dashboard", icon: LayoutDashboard, requiresData: true },
        { value: "stream", label: "Live Stream", icon: Radio, requiresData: true },
      ]
    },
    {
      label: "Export",
      items: [
        { value: "report", label: "Report", icon: FileText, requiresData: true },
        { value: "chat", label: "Chat", icon: MessageSquare, requiresData: true },
      ]
    },
  ];

  const getPageDescription = (tab: string) => {
    const descriptions: Record<string, string> = {
      upload: "Upload your data files to get started",
      connect: "Connect to external data sources",
      preview: "Preview and clean your dataset",
      nlp: "Query your data using natural language",
      powerbi: "Build interactive dashboards",
      stream: "Monitor real-time data streams",
      visualize: "Create custom visualizations",
      dashboard: "Auto-generate insights dashboard",
      ml: "Train and deploy ML models",
      predict: "Generate predictive analytics",
      analyze: "Deep dive into your data",
      report: "Generate and export reports",
      chat: "Chat with your data"
    };
    return descriptions[tab] || "";
  };

  return (
    <CollaborationProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        
        <div className="flex-1 flex pt-16">
          {/* Responsive Sidebar - hidden on mobile */}
          <ResponsiveSidebar
            navGroups={navGroups}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hasData={!!dataset}
            datasetInfo={dataset ? {
              name: dataset.name,
              rowCount: dataset.rawData.length,
              columnCount: dataset.columns.length
            } : undefined}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          >
            <JoinCollaborationDialog datasetName={dataset?.name} />
          </ResponsiveSidebar>

          {/* Main Content */}
          <main 
            className={cn(
              "flex-1 transition-all duration-200",
              // Mobile: full width with bottom padding for nav
              "pb-20 md:pb-0",
              // Desktop: margin for sidebar
              "md:ml-56",
              sidebarCollapsed && "lg:ml-16"
            )}
          >
            <ResponsiveContainer maxWidth="xl" className="py-4 sm:py-6">
              {/* Page Header */}
              <div className="mb-4 sm:mb-6">
                <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {navGroups.flatMap(g => g.items).find(t => t.value === activeTab)?.label || "Data Agent"}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {getPageDescription(activeTab)}
                </p>
              </div>

              {/* Content Panels with Suspense for lazy loading */}
              <div className="animate-fade-in">
                <div className={activeTab === "upload" ? "block" : "hidden"}>
                  <DataUpload onDataLoaded={handleDataLoaded} />
                </div>

                <div className={activeTab === "connect" ? "block" : "hidden"}>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <WorkflowBuilder onDataLoaded={handleDataLoaded} />
                  </Suspense>
                </div>

                <div className={activeTab === "preview" ? "block" : "hidden"}>
                  {dataset && (
                    <DataPreview 
                      dataset={dataset} 
                      onDataCleaned={handleDataCleaned}
                    />
                  )}
                </div>

                <div className={activeTab === "nlp" ? "block" : "hidden"}>
                  {dataset && (
                    <Suspense fallback={<DashboardSkeleton />}>
                      <NaturalLanguageEngine
                        data={dataset.cleanedData || dataset.rawData}
                        columns={dataset.columns}
                        columnTypes={getColumnTypes()}
                        datasetName={dataset.name}
                      />
                    </Suspense>
                  )}
                </div>

                <div className={activeTab === "powerbi" ? "block" : "hidden"}>
                  {dataset && (
                    <Suspense fallback={<DashboardSkeleton />}>
                      <PowerBIDashboard
                        data={dataset.cleanedData || dataset.rawData}
                        columns={dataset.columns}
                        columnTypes={getColumnTypes()}
                        datasetName={dataset.name}
                      />
                    </Suspense>
                  )}
                </div>

                <div className={activeTab === "stream" ? "block" : "hidden"}>
                  {dataset && (
                    <Suspense fallback={<DashboardSkeleton />}>
                      <RealTimeStream
                        data={dataset.cleanedData || dataset.rawData}
                        columns={dataset.columns}
                        columnTypes={getColumnTypes()}
                        datasetName={dataset.name}
                      />
                    </Suspense>
                  )}
                </div>

                <div className={activeTab === "visualize" ? "block" : "hidden"}>
                  {dataset && (
                    <Suspense fallback={<DashboardSkeleton />}>
                      <VisualizationDashboard dataset={dataset} />
                    </Suspense>
                  )}
                </div>

                <div className={activeTab === "dashboard" ? "block" : "hidden"}>
                  {dataset && (
                    <Suspense fallback={<DashboardSkeleton />}>
                      <AutoDashboard
                        data={dataset.cleanedData || dataset.rawData}
                        columns={dataset.columns}
                        columnTypes={getColumnTypes()}
                        datasetName={dataset.name}
                      />
                    </Suspense>
                  )}
                </div>

                <div className={activeTab === "ml" ? "block" : "hidden"}>
                  {dataset && (
                    <Suspense fallback={<DashboardSkeleton />}>
                      <MLWorkbench
                        data={dataset.cleanedData || dataset.rawData}
                        columns={dataset.columns}
                        columnTypes={getColumnTypes()}
                        datasetName={dataset.name}
                      />
                    </Suspense>
                  )}
                </div>

                <div className={activeTab === "predict" ? "block" : "hidden"}>
                  {dataset && (
                    <Suspense fallback={<DashboardSkeleton />}>
                      <PredictiveAnalytics
                        data={dataset.cleanedData || dataset.rawData}
                        columns={dataset.columns}
                        columnTypes={getColumnTypes()}
                        datasetName={dataset.name}
                      />
                    </Suspense>
                  )}
                </div>

                <div className={activeTab === "analyze" ? "block" : "hidden"}>
                  {dataset && (
                    <Suspense fallback={<DashboardSkeleton />}>
                      <AnalysisPanel dataset={dataset} />
                    </Suspense>
                  )}
                </div>

                <div className={activeTab === "report" ? "block" : "hidden"}>
                  {dataset && (
                    <Suspense fallback={<DashboardSkeleton />}>
                      <ReportGenerator dataset={dataset} />
                    </Suspense>
                  )}
                </div>

                <div className={activeTab === "chat" ? "block" : "hidden"}>
                  {dataset && (
                    <Suspense fallback={<DashboardSkeleton />}>
                      <DataChat dataset={dataset} />
                    </Suspense>
                  )}
                </div>
              </div>
            </ResponsiveContainer>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasData={!!dataset}
        />
      </div>
    </CollaborationProvider>
  );
};

export default DataAgent;
