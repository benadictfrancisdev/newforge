import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "@/components/Navbar";
import DataUpload from "@/components/data-agent/DataUpload";
import DataPreview from "@/components/data-agent/DataPreview";
import AutoInsightGenerator from "@/components/data-agent/AutoInsightGenerator";
import FeatureGate from "@/components/data-agent/FeatureGate";
import CognitiveModeSelector, { type CognitiveMode } from "@/components/data-agent/CognitiveModeSelector";
import { MobileBottomNav, ResponsiveSidebar, ResponsiveContainer } from "@/components/layout";
import { CollaborationProvider, JoinCollaborationDialog } from "@/components/data-agent/collaboration";
import { DashboardSkeleton } from "@/components/data-agent/skeletons";
import { cn } from "@/lib/utils";
import { detectColumnTypes } from "@/lib/statisticsEngine";
import { useRollback } from "@/hooks/useRollback";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Upload, 
  Table, 
  BarChart3, 
  MessageSquare, 
  PieChart, 
  Loader2, 
  FileText, 
  Activity,
  TrendingUp,
  LayoutDashboard, 
  Zap, 
  Radio, 
  Layers, 
  Link2, 
  Brain,
  FlaskConical,
  FileBarChart,
  Sparkles,
  GitBranch,
  Shield,
  Rocket,
  HeartPulse,
  ShieldAlert,
  Target,
  Play,
  Briefcase,
  Beaker,
  Wrench,
  Trophy,
  BookOpen,
  Database as DatabaseIcon,
  
  Building2,
  Calendar,
  Wand2,
  Users,
  CalendarDays,
  Bot,
  Wallet,
  Workflow,
  MemoryStick,
  Scan,
  TestTubes,
  Eye,
  MonitorCheck,
  Cpu,
  Search,
  Network,
  Terminal,
  RotateCcw,
  Split,
  ClipboardCheck,
  Bell,
  Radar,
  Crown,
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
const HypothesisTestingPanel = lazy(() => import("@/components/data-agent/HypothesisTestingPanel"));
const StakeholderReport = lazy(() => import("@/components/data-agent/StakeholderReport"));

// Roadmap features
const MultiSourceJoiner = lazy(() => import("@/components/data-agent/MultiSourceJoiner"));
const PIIGovernanceScanner = lazy(() => import("@/components/data-agent/PIIGovernanceScanner"));
const ScheduledReportsPanel = lazy(() => import("@/components/data-agent/ScheduledReportsPanel"));
const TeamCollaborationHub = lazy(() => import("@/components/data-agent/TeamCollaborationHub"));

// Causal & Narrative (kept from autonomous folder)
const PredictiveCausalModeling = lazy(() => import("@/components/data-agent/autonomous/PredictiveCausalModeling"));
const ExecutiveNarrativeGenerator = lazy(() => import("@/components/data-agent/autonomous/ExecutiveNarrativeGenerator"));

// Founder mode
const BusinessHealthDashboard = lazy(() => import("@/components/data-agent/founder/BusinessHealthDashboard"));
const RiskEngine = lazy(() => import("@/components/data-agent/founder/RiskEngine"));
const ActionRecommendationEngine = lazy(() => import("@/components/data-agent/founder/ActionRecommendationEngine"));
const ScenarioSimulation = lazy(() => import("@/components/data-agent/founder/ScenarioSimulation"));
const InvestorReport = lazy(() => import("@/components/data-agent/founder/InvestorReport"));

// Scientist mode
const HypothesisBuilder = lazy(() => import("@/components/data-agent/scientist/HypothesisBuilder"));
const ExperimentDesign = lazy(() => import("@/components/data-agent/scientist/ExperimentDesign"));
const FeatureEngineering = lazy(() => import("@/components/data-agent/scientist/FeatureEngineering"));
const ModelArena = lazy(() => import("@/components/data-agent/scientist/ModelArena"));
const ResearchPaperGenerator = lazy(() => import("@/components/data-agent/scientist/ResearchPaperGenerator"));
const SQLForge = lazy(() => import("@/components/data-agent/SQLForge"));
const TimeIntelligenceEngine = lazy(() => import("@/components/data-agent/TimeIntelligenceEngine"));
const SmartImputation = lazy(() => import("@/components/data-agent/SmartImputation"));
const BehavioralSegmentation = lazy(() => import("@/components/data-agent/BehavioralSegmentation"));
const CalendarTableGenerator = lazy(() => import("@/components/data-agent/CalendarTableGenerator"));
const KPIComparisonCards = lazy(() => import("@/components/data-agent/KPIComparisonCards"));

const ADAAgentManager = lazy(() => import("@/components/data-agent/ADAAgentManager"));
const PaymentHistory = lazy(() => import("@/components/data-agent/PaymentHistory"));
const DecisionIntelligence = lazy(() => import("@/components/data-agent/DecisionIntelligence"));
const AutoMLForecasting = lazy(() => import("@/components/data-agent/AutoMLForecasting"));
const WorkflowOrchestrator = lazy(() => import("@/components/data-agent/WorkflowOrchestrator"));
const MemoryContextPanel = lazy(() => import("@/components/data-agent/MemoryContextPanel"));
const AutoIngestPanel = lazy(() => import("@/components/data-agent/AutoIngestPanel"));
const AutoNarrativeEngine = lazy(() => import("@/components/data-agent/AutoNarrativeEngine"));
const AutoExperimentEngine = lazy(() => import("@/components/data-agent/AutoExperimentEngine"));
const CausalDiscoveryAgent = lazy(() => import("@/components/data-agent/CausalDiscoveryAgent"));
const ProactiveAnomalyWatch = lazy(() => import("@/components/data-agent/ProactiveAnomalyWatch"));
const AutonomousPipeline = lazy(() => import("@/components/data-agent/AutonomousPipeline"));
const DataLayerMonitor = lazy(() => import("@/components/data-agent/DataLayerMonitor"));
const ABTestingPanel = lazy(() => import("@/components/data-agent/ABTestingPanel"));
const CohortAnalysisPanel = lazy(() => import("@/components/data-agent/CohortAnalysisPanel"));
const DataAnalyticsTestingPanel = lazy(() => import("@/components/data-agent/DataAnalyticsTestingPanel"));
const UnifiedResultsView = lazy(() => import("@/components/data-agent/UnifiedResultsView"));
const SegmentDiscoveryAgent = lazy(() => import("@/components/data-agent/SegmentDiscoveryAgent"));
const RootCauseAgent = lazy(() => import("@/components/data-agent/RootCauseAgent"));
const KPIIntelligenceLayer = lazy(() => import("@/components/data-agent/KPIIntelligenceLayer"));
const MasterDashboard = lazy(() => import("@/components/data-agent/MasterDashboard"));
const AutoReportEngine = lazy(() => import("@/components/data-agent/AutoReportEngine"));
const RollbackPanel = lazy(() => import("@/components/data-agent/RollbackPanel"));
const InsightInbox = lazy(() => import("@/components/data-agent/InsightInbox"));
const AIDataScientist = lazy(() => import("@/components/data-agent/AIDataScientist"));
const ForgeAutopilot = lazy(() => import("@/components/data-agent/ForgeAutopilot"));
const CEOMode = lazy(() => import("@/components/data-agent/CEOMode"));

export interface DatasetState {
  id?: string;
  name: string;
  rawData: Record<string, unknown>[];
  cleanedData?: Record<string, unknown>[];
  columns: string[];
  status: string;
}

const getNavGroups = (mode: CognitiveMode) => {
  const autonomousGroup = {
    label: "AUTONOMOUS",
    items: [
      { value: "ceo_mode", label: "CEO Mode", icon: Crown, requiresData: true },
      { value: "autonomous_run", label: "Auto-Analyze", icon: Cpu, requiresData: true },
      { value: "forge_autopilot", label: "Autopilot", icon: Radar, requiresData: true },
      { value: "ai_scientist", label: "AI Scientist", icon: Sparkles, requiresData: true },
    ]
  };

  const dataGroup = {
    label: "DATA",
    items: [
      { value: "upload", label: "Upload", icon: Upload },
      { value: "multi_join", label: "Multi Join", icon: Link2, requiresData: true },
      { value: "connect", label: "Connect", icon: Link2 },
      { value: "preview", label: "Preview", icon: Table, requiresData: true },
    ]
  };

  const governanceGroup = {
    label: "GOVERNANCE",
    items: [
      { value: "data_monitor", label: "Data Monitor", icon: MonitorCheck, requiresData: true },
      { value: "pii_scanner", label: "PII Scanner", icon: Shield, requiresData: true },
      { value: "collab", label: "Team Collab", icon: Users, requiresData: true },
    ]
  };

  const sharedTools = {
    label: "TOOLS",
    items: [
      { value: "sql_forge", label: "SQL Forge", icon: DatabaseIcon, requiresData: true },
      { value: "sql_query", label: "SQL Query", icon: Terminal, requiresData: true },
      { value: "calendar_table", label: "Calendar Table", icon: CalendarDays, requiresData: true },
    ]
  };

  const intelligenceGroup = {
    label: "INTELLIGENCE",
    items: [
      { value: "auto_ingest", label: "Schema Intel", icon: Scan, requiresData: true },
      { value: "auto_narrative", label: "AutoNarrative", icon: BookOpen, requiresData: true },
      { value: "segment_discovery", label: "Segments", icon: PieChart, requiresData: true },
      { value: "root_cause", label: "Root Cause", icon: Search, requiresData: true },
      { value: "kpi_intel", label: "KPI Intelligence", icon: Network, requiresData: true },
      { value: "auto_experiment", label: "AutoExperiment", icon: TestTubes, requiresData: true },
      { value: "causal_discovery", label: "Causal Agent", icon: GitBranch, requiresData: true },
      { value: "anomaly_watch", label: "Anomaly Watch", icon: Eye, requiresData: true },
    ]
  };

  const agentGroup = {
    label: "AGENT",
    items: [
      { value: "orchestrator", label: "Orchestrator", icon: Workflow, requiresData: true },
      { value: "decision_intel", label: "Decisions", icon: Target, requiresData: true },
      { value: "automl_forecast", label: "AutoML Forecast", icon: TrendingUp, requiresData: true },
      { value: "memory", label: "Data Memory", icon: MemoryStick },
      { value: "ada_agent", label: "ADA Agent", icon: Bot },
      { value: "insight_inbox", label: "Insight Inbox", icon: Bell },
    ]
  };

  const testingGroup = {
    label: "TESTING",
    items: [
      { value: "ab_testing", label: "A/B Testing", icon: Split, requiresData: true },
      { value: "cohort_analysis", label: "Cohort Analysis", icon: Users, requiresData: true },
      { value: "data_testing", label: "Data Quality Tests", icon: ClipboardCheck, requiresData: true },
    ]
  };

  const sharedExport = {
    label: "EXPORT",
    items: [
      { value: "auto_report", label: "Auto Report", icon: FileText, requiresData: true },
      { value: "stakeholder", label: "Stakeholder", icon: FileBarChart, requiresData: true },
      { value: "report", label: "Full Report", icon: FileText, requiresData: true },
      { value: "chat", label: "Chat", icon: MessageSquare, requiresData: true },
      { value: "scheduled", label: "Scheduled", icon: Calendar, requiresData: true },
      { value: "payments", label: "Payments", icon: Wallet },
      { value: "rollback", label: "Rollback", icon: RotateCcw },
    ]
  };

  if (mode === "analyst") {
    return [
      autonomousGroup,
      dataGroup,
      governanceGroup,
      {
        label: "ANALYSIS",
        items: [
          { value: "nlp", label: "NLP Engine", icon: Zap, requiresData: true },
          { value: "analyze", label: "Statistics", icon: BarChart3, requiresData: true },
          { value: "hypothesis", label: "Hypothesis", icon: FlaskConical, requiresData: true },
          { value: "predict", label: "Predict", icon: Activity, requiresData: true },
          { value: "ml", label: "ML Workbench", icon: Brain, requiresData: true },
          { value: "causal", label: "Causal Model", icon: GitBranch, requiresData: true },
          { value: "time_intel", label: "Time Intelligence", icon: Calendar, requiresData: true },
          { value: "imputation", label: "Smart Impute", icon: Wand2, requiresData: true },
          { value: "segmentation", label: "Segments", icon: Users, requiresData: true },
        ]
      },
      {
        label: "VISUALIZE",
        items: [
          { value: "master_dashboard", label: "Master Dashboard", icon: LayoutDashboard, requiresData: true },
          { value: "powerbi", label: "Dashboard", icon: Layers, requiresData: true },
          { value: "visualize", label: "Charts", icon: PieChart, requiresData: true },
          { value: "dashboard", label: "Auto Dashboard", icon: LayoutDashboard, requiresData: true },
          { value: "kpi_cards", label: "KPI Cards", icon: Sparkles, requiresData: true },
          { value: "stream", label: "Live Stream", icon: Radio, requiresData: true },
        ]
      },
      {
        label: "AI ENGINE",
        items: [
          { value: "narrative", label: "Narratives", icon: FileText, requiresData: true },
        ]
      },
      sharedTools,
      testingGroup,
      intelligenceGroup,
      agentGroup,
      sharedExport,
    ];
  }

  if (mode === "scientist") {
    return [
      autonomousGroup,
      dataGroup,
      governanceGroup,
      {
        label: "RESEARCH",
        items: [
          { value: "sci_hypothesis", label: "Hypothesis", icon: FlaskConical, requiresData: true },
          { value: "experiment", label: "Experiment", icon: Beaker, requiresData: true },
          { value: "features", label: "Features", icon: Wrench, requiresData: true },
          { value: "arena", label: "ML Arena", icon: Trophy, requiresData: true },
          { value: "paper", label: "Research Paper", icon: BookOpen, requiresData: true },
        ]
      },
      {
        label: "ANALYSIS",
        items: [
          { value: "nlp", label: "NLP Engine", icon: Zap, requiresData: true },
          { value: "predict", label: "Predict", icon: Activity, requiresData: true },
          { value: "analyze", label: "Statistics", icon: BarChart3, requiresData: true },
          { value: "causal", label: "Causal Model", icon: GitBranch, requiresData: true },
        ]
      },
      {
        label: "AI ENGINE",
        items: [
          { value: "narrative", label: "Narratives", icon: FileText, requiresData: true },
        ]
      },
      sharedTools,
      testingGroup,
      intelligenceGroup,
      agentGroup,
      sharedExport,
    ];
  }

  if (mode === "founder") {
    return [
      autonomousGroup,
      dataGroup,
      governanceGroup,
      {
        label: "BUSINESS INTELLIGENCE",
        items: [
          { value: "biz_health", label: "Biz KPIs", icon: HeartPulse, requiresData: true },
          { value: "risk", label: "Risk Engine", icon: ShieldAlert, requiresData: true },
          { value: "actions", label: "Actions", icon: Target, requiresData: true },
          { value: "simulate", label: "Simulate", icon: Play, requiresData: true },
          { value: "investor", label: "Investor Report", icon: Briefcase, requiresData: true },
        ]
      },
      {
        label: "ANALYSIS",
        items: [
          { value: "nlp", label: "NLP Engine", icon: Zap, requiresData: true },
          { value: "powerbi", label: "Dashboard", icon: Layers, requiresData: true },
          { value: "narrative", label: "Narratives", icon: FileText, requiresData: true },
        ]
      },
      sharedTools,
      testingGroup,
      intelligenceGroup,
      agentGroup,
      sharedExport,
    ];
  }

  // Organization mode — combined Analyst + Founder
  return [
    autonomousGroup,
    dataGroup,
    governanceGroup,
    {
      label: "ANALYSIS",
      items: [
        { value: "nlp", label: "NLP Engine", icon: Zap, requiresData: true },
        { value: "analyze", label: "Statistics", icon: BarChart3, requiresData: true },
        { value: "hypothesis", label: "Hypothesis", icon: FlaskConical, requiresData: true },
        { value: "predict", label: "Predict", icon: Activity, requiresData: true },
        { value: "ml", label: "ML Workbench", icon: Brain, requiresData: true },
        { value: "causal", label: "Causal Model", icon: GitBranch, requiresData: true },
        { value: "time_intel", label: "Time Intelligence", icon: Calendar, requiresData: true },
        { value: "imputation", label: "Smart Impute", icon: Wand2, requiresData: true },
        { value: "segmentation", label: "Segments", icon: Users, requiresData: true },
      ]
    },
    {
      label: "BUSINESS INTELLIGENCE",
      items: [
        { value: "biz_health", label: "Biz KPIs", icon: HeartPulse, requiresData: true },
        { value: "risk", label: "Risk Engine", icon: ShieldAlert, requiresData: true },
        { value: "actions", label: "Actions", icon: Target, requiresData: true },
        { value: "simulate", label: "Simulate", icon: Play, requiresData: true },
        { value: "investor", label: "Investor Report", icon: Briefcase, requiresData: true },
      ]
    },
      {
        label: "VISUALIZE",
        items: [
          { value: "master_dashboard", label: "Master Dashboard", icon: LayoutDashboard, requiresData: true },
          { value: "powerbi", label: "Dashboard", icon: Layers, requiresData: true },
          { value: "visualize", label: "Charts", icon: PieChart, requiresData: true },
          { value: "dashboard", label: "Auto Dashboard", icon: LayoutDashboard, requiresData: true },
          { value: "kpi_cards", label: "KPI Cards", icon: Sparkles, requiresData: true },
          { value: "stream", label: "Live Stream", icon: Radio, requiresData: true },
        ]
      },
    {
      label: "AI ENGINE",
      items: [
        { value: "narrative", label: "Narratives", icon: FileText, requiresData: true },
      ]
    },
    sharedTools,
    testingGroup,
    intelligenceGroup,
    agentGroup,
    sharedExport,
  ];
};

const getPageDescription = (tab: string) => {
  const descriptions: Record<string, string> = {
    upload: "Upload your data files to get started",
    connect: "Connect to external data sources",
    preview: "Preview and clean your dataset",
    multi_join: "Join multiple datasets with visual join builder — SQL-style inner, left, right, full joins",
    pii_scanner: "Detect and mask sensitive PII — emails, SSNs, credit cards, addresses with GDPR compliance",
    collab: "Real-time team collaboration with shared cursors, comments, and synchronized workspaces",
    scheduled: "Automate report delivery with email scheduling — daily, weekly, monthly reports",
    nlp: "Query your data using natural language",
    powerbi: "Build interactive dashboards",
    stream: "Monitor real-time data streams",
    visualize: "Create custom visualizations",
    dashboard: "Auto-generate insights dashboard",
    ml: "Train and deploy ML models",
    predict: "Generate predictive analytics",
    analyze: "Deep dive into your data",
    hypothesis: "Validate assumptions with statistical tests",
    causal: "Discover causal relationships and what-if scenarios",
    narrative: "Generate boardroom-ready executive narratives",
    stakeholder: "Executive summaries for stakeholders",
    report: "Generate and export reports",
    chat: "Chat with your data",
    biz_health: "Auto-calculate CAC, LTV, churn, burn rate, runway",
    risk: "Identify churn segments, revenue risks, declining retention",
    actions: "Data-driven strategic moves with predicted impact",
    simulate: "What-if scenario simulation with predicted outcomes",
    investor: "One-click investor deck with metrics and SWOT",
    sci_hypothesis: "Write a hypothesis, get statistical validation",
    experiment: "A/B test setup, sample size, power analysis",
    features: "Auto features, PCA, dimensionality reduction, SHAP",
    arena: "Train multiple models, auto leaderboard",
    paper: "Generate Abstract, Methodology, Results, Conclusion",
    sql_forge: "Generate SQL schema and analytical queries from your dataset",
    sql_query: "Describe what you want in plain English → get SQL",
    time_intel: "Auto-generate YTD, MTD, YoY KPIs with delta comparison",
    imputation: "Context-aware smart imputation with category-wise strategies",
    segmentation: "Auto-create customer cohorts: New, Returning, Loyal",
    calendar_table: "Auto-build date dimension table for time analysis",
    kpi_cards: "Generate contextual KPI delta cards with business narratives",
    payments: "Manage your payments, subscriptions, and refunds",
    ada_agent: "Schedule autonomous AI analysis runs on your datasets",
    orchestrator: "Auto-detect intent and run all relevant pipelines in parallel",
    decision_intel: "AI recommends ranked actions based on data patterns",
    automl_forecast: "Zero-config ensemble forecasting with confidence bands",
    memory: "View and manage your Data Brain — persistent analysis memory",
    auto_ingest: "Auto-detect column types, relationships, and data quality score",
    auto_narrative: "Structured business story: What → Why → Where → When → Risk with audience targeting",
    segment_discovery: "Auto-slice every metric by every dimension with statistical significance testing",
    root_cause: "Automatic waterfall contribution analysis — finds why KPIs changed",
    kpi_intel: "Auto-discovers KPIs from raw columns, builds formula tree, monitors health",
    auto_experiment: "Auto-select and run the right statistical tests on your data",
    causal_discovery: "Discover causal relationships, leading/lagging indicators",
    anomaly_watch: "Proactive monitoring for point, contextual, and collective anomalies",
    data_monitor: "Track data health, quality metrics, completeness, outliers, and alerts across your dataset",
    autonomous_run: "AI runs all agents in parallel — zero prompts, full intelligence output",
    master_dashboard: "Unified editable dashboard with KPIs, charts, anomalies, and recommendations",
    auto_report: "One-click structured report: Executive Summary → KPI → Anomalies → Forecast → Recommendations",
    rollback: "Undo changes, save snapshots, and restore previous states across data, dashboards, and datasets",
    ab_testing: "Design and analyze A/B tests with statistical significance, power analysis, and lift calculation",
    cohort_analysis: "Track retention by cohort, compare KPIs across user segments, and visualize retention heatmaps",
    data_testing: "Run normality, stationarity, outlier detection, and completeness tests on your data",
    ai_scientist: "Your virtual data scientist — ask in plain English to clean, predict, forecast, and analyze. Shows model confidence and assumptions.",
    forge_autopilot: "Continuous AI business analyst — monitors data, detects anomalies/trends/risks, and recommends prioritized actions with expected impact.",
    ceo_mode: "AI COO — full executive intelligence. Revenue risks, churn signals, growth levers, and dollar-impact action plans in one briefing.",
  };
  return descriptions[tab] || "";
};

const DataAgent = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [dataset, setDataset] = useState<DatasetState | null>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cognitiveMode, setCognitiveMode] = useState<CognitiveMode>("analyst");
  const [modeSelected, setModeSelected] = useState(false);
  const [pipelineResults, setPipelineResults] = useState<any>(null);
  const rollback = useRollback();
  const roomFromUrl = searchParams.get("room");

  useEffect(() => {
    if (roomFromUrl && user) {
      const timer = setTimeout(() => {
        try {
          const event = new CustomEvent("join-collaboration-room", { detail: { roomId: roomFromUrl, datasetName: dataset?.name } });
          window.dispatchEvent(event);
        } catch {}
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [roomFromUrl, user, dataset?.name]);

  useEffect(() => {
    const isDemoMode = searchParams.get("demo") === "true";
    if (isDemoMode) return;
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate, searchParams]);

  const handleDataLoaded = (data: DatasetState) => {
    // Save snapshot on data load
    if (dataset) {
      rollback.createSnapshot(`Before loading ${data.name}`, "dataset", dataset, "Auto-saved before new dataset load");
    }
    setDataset(data);
    setActiveTab("autonomous_run");
    // Sync context to SpaceBot so it knows about the loaded dataset
    try {
      sessionStorage.setItem("spacebot-data-context", JSON.stringify({
        datasetName: data.name,
        rowCount: data.rawData.length,
        columnCount: data.columns.length,
        columns: data.columns.slice(0, 20),
        sampleRow: data.rawData[0] ?? {},
      }));
    } catch { /* ignore */ }
  };

  const handlePipelineComplete = useCallback((results: any) => {
    setPipelineResults(results);
  }, []);

  const handleDataCleaned = (cleanedData: Record<string, unknown>[]) => {
    if (dataset) {
      const prevData = dataset.cleanedData || dataset.rawData;
      rollback.pushAction({
        type: "clean",
        label: `Cleaned ${dataset.name}`,
        category: "data",
        undoFn: () => setDataset(d => d ? { ...d, cleanedData: prevData === dataset.rawData ? undefined : prevData, status: prevData === dataset.rawData ? "uploaded" : "cleaned" } : d),
        redoFn: () => setDataset(d => d ? { ...d, cleanedData, status: "cleaned" } : d),
      });
      setDataset({ ...dataset, cleanedData, status: "cleaned" });
    }
  };

  const getColumnTypes = () => {
    if (!dataset) return {};
    return detectColumnTypes(dataset.cleanedData || dataset.rawData, dataset.columns) as Record<string, "numeric" | "categorical" | "date">;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  const isDemoMode = searchParams.get("demo") === "true";
  if (!user && !isDemoMode) return null;

  const navGroups = getNavGroups(cognitiveMode);

  const handleModeChange = (newMode: CognitiveMode) => {
    const newGroups = getNavGroups(newMode);
    const allTabs = newGroups.flatMap(g => g.items).map(i => i.value);
    if (!allTabs.includes(activeTab)) {
      setActiveTab("upload");
    }
    setCognitiveMode(newMode);
    setModeSelected(true);
  };

  const dataProps = {
    data: dataset?.cleanedData || dataset?.rawData || [],
    columns: dataset?.columns || [],
    columnTypes: getColumnTypes(),
    datasetName: dataset?.name || "",
  };

  // Landing page: show cognitive lens selector prominently when no mode selected and no data
  const showLanding = !modeSelected && !dataset;

  return (
    <CollaborationProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <div className="flex-1 flex pt-16">
          {!showLanding && (
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
          )}

          <main 
            className={cn(
              "flex-1 transition-all duration-200",
              "pb-20 md:pb-0",
              showLanding ? "" : (sidebarCollapsed ? "md:ml-14" : "md:ml-56")
            )}
          >
            {showLanding ? (
              /* Landing: full-page cognitive lens selector */
              <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="max-w-2xl w-full px-6">
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground mb-2">Choose Your Cognitive Lens</h1>
                    <p className="text-sm text-muted-foreground">Select a mode to begin your analysis journey</p>
                  </div>
                  <CognitiveModeSelector
                    mode={cognitiveMode}
                    onModeChange={handleModeChange}
                    layout="horizontal"
                  />
                </div>
              </div>
            ) : (
              <ResponsiveContainer maxWidth="xl" className="py-4 sm:py-6">
                {/* Cognitive Lens — horizontal above content */}
                <CognitiveModeSelector
                  mode={cognitiveMode}
                  onModeChange={handleModeChange}
                  layout="horizontal"
                />

                <div className="mb-4 sm:mb-6">
                  <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                    {navGroups.flatMap(g => g.items).find(t => t.value === activeTab)?.label || "Data Agent"}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {getPageDescription(activeTab)}
                  </p>
                </div>

                <div key={activeTab} className="animate-fade-in tab-content-enter">
                  {/* ─── Autonomous Pipeline ─── */}
                  {activeTab === "autonomous_run" && dataset && (
                    <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                      <div className="space-y-4">
                        <AutonomousPipeline
                          {...dataProps}
                          onComplete={handlePipelineComplete}
                          autoStart={true}
                        />
                        {pipelineResults && (
                          <UnifiedResultsView results={pipelineResults} onNavigate={setActiveTab} />
                        )}
                      </div>
                    </Suspense></ErrorBoundary>
                  )}

                  {/* ─── Free tier tabs ─── */}
                  {activeTab === "upload" && (
                    <DataUpload onDataLoaded={handleDataLoaded} />
                  )}
                  {activeTab === "connect" && (
                    <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                      <WorkflowBuilder onDataLoaded={handleDataLoaded} />
                    </Suspense></ErrorBoundary>
                  )}
                  {activeTab === "preview" && dataset && (
                    <>
                      <AutoInsightGenerator dataset={dataset} onNavigateToAnalyze={() => setActiveTab("analyze")} />
                      <DataPreview dataset={dataset} onDataCleaned={handleDataCleaned} />
                    </>
                  )}
                  {activeTab === "visualize" && (
                    <FeatureGate feature="Visualization Dashboard" creditCost={1} requiredPlan="free">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><VisualizationDashboard dataset={dataset} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "kpi_cards" && (
                    <FeatureGate feature="KPI Comparison Cards" creditCost={1} requiredPlan="free">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><KPIComparisonCards {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "chat" && (
                    <FeatureGate feature="Data Chat" creditCost={1} requiredPlan="free">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><DataChat dataset={dataset} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "analyze" && (
                    <FeatureGate feature="Analysis Panel" creditCost={1} requiredPlan="free">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><AnalysisPanel dataset={dataset} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}

                  {/* ─── Standard tier tabs ─── */}
                  {activeTab === "nlp" && (
                    <FeatureGate feature="NLP Engine" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><NaturalLanguageEngine {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "powerbi" && (
                    <FeatureGate feature="Power BI Dashboard" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><PowerBIDashboard {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "dashboard" && (
                    <FeatureGate feature="Auto Dashboard" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><AutoDashboard {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "report" && (
                    <FeatureGate feature="Report Generator" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><ReportGenerator dataset={dataset} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "hypothesis" && (
                    <FeatureGate feature="Hypothesis Testing" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><HypothesisTestingPanel {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "stream" && (
                    <FeatureGate feature="Real-Time Stream" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><RealTimeStream {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "calendar_table" && (
                    <FeatureGate feature="Calendar Table Generator" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><CalendarTableGenerator {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "time_intel" && (
                    <FeatureGate feature="Time Intelligence Engine" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><TimeIntelligenceEngine {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "imputation" && (
                    <FeatureGate feature="Smart Contextual Imputation" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><SmartImputation {...dataProps} onDataCleaned={handleDataCleaned} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "stakeholder" && (
                    <FeatureGate feature="Stakeholder Report" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><StakeholderReport data={dataProps.data} columns={dataProps.columns} datasetName={dataProps.datasetName} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}

                  {/* ─── Pro tier tabs ─── */}
                  {activeTab === "predict" && (
                    <FeatureGate feature="Predictive Analytics" creditCost={1} requiredPlan="pro">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><PredictiveAnalytics {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "ml" && (
                    <FeatureGate feature="ML Workbench" creditCost={1} requiredPlan="pro">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><MLWorkbench {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "segmentation" && (
                    <FeatureGate feature="Behavioral Segmentation" creditCost={1} requiredPlan="pro">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><BehavioralSegmentation {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "causal" && (
                    <FeatureGate feature="Predictive Causal Modeling" creditCost={1} requiredPlan="pro">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><PredictiveCausalModeling {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "narrative" && (
                    <FeatureGate feature="Executive Narrative Generator" creditCost={1} requiredPlan="pro">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><ExecutiveNarrativeGenerator data={dataProps.data} columns={dataProps.columns} datasetName={dataProps.datasetName} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {(activeTab === "sql_forge" || activeTab === "sql_query") && (
                    <FeatureGate feature="SQL Forge" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><SQLForge {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}

                  {/* ─── Team tier tabs (Founder mode) ─── */}
                  {activeTab === "biz_health" && (
                    <FeatureGate feature="Business Health Dashboard" creditCost={1} requiredPlan="team">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><BusinessHealthDashboard {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "risk" && (
                    <FeatureGate feature="Risk Engine" creditCost={1} requiredPlan="team">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><RiskEngine {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "actions" && (
                    <FeatureGate feature="Action Recommendation Engine" creditCost={1} requiredPlan="team">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><ActionRecommendationEngine {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "simulate" && (
                    <FeatureGate feature="Scenario Simulation" creditCost={1} requiredPlan="team">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><ScenarioSimulation {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "investor" && (
                    <FeatureGate feature="Investor Report" creditCost={1} requiredPlan="team">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><InvestorReport {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}

                  {/* ─── Team tier tabs (Scientist mode) ─── */}
                  {activeTab === "sci_hypothesis" && (
                    <FeatureGate feature="Hypothesis Builder" creditCost={1} requiredPlan="team">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><HypothesisBuilder {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "experiment" && (
                    <FeatureGate feature="Experiment Design" creditCost={1} requiredPlan="team">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><ExperimentDesign {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "features" && (
                    <FeatureGate feature="Feature Engineering" creditCost={1} requiredPlan="team">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><FeatureEngineering {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "arena" && (
                    <FeatureGate feature="Model Arena" creditCost={1} requiredPlan="team">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><ModelArena {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "paper" && (
                    <FeatureGate feature="Research Paper Generator" creditCost={1} requiredPlan="team">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><ResearchPaperGenerator {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}

                  {/* ─── Agent & Intelligence tabs ─── */}
                  {activeTab === "orchestrator" && (
                    <FeatureGate feature="Workflow Orchestrator" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><WorkflowOrchestrator {...dataProps} onNavigate={setActiveTab} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "decision_intel" && (
                    <FeatureGate feature="Decision Intelligence" creditCost={1} requiredPlan="pro">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><DecisionIntelligence {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "automl_forecast" && (
                    <FeatureGate feature="AutoML Forecasting" creditCost={1} requiredPlan="pro">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><AutoMLForecasting {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "memory" && (
                    <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><MemoryContextPanel datasetName={dataProps.datasetName} /></Suspense></ErrorBoundary>
                  )}

                  {/* ─── Intelligence tabs ─── */}
                  {activeTab === "auto_ingest" && dataset && (
                    <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><AutoIngestPanel {...dataProps} /></Suspense></ErrorBoundary>
                  )}
                  {activeTab === "auto_narrative" && (
                    <FeatureGate feature="AutoNarrative Engine" creditCost={1} requiredPlan="pro">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><AutoNarrativeEngine {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "segment_discovery" && (
                    <FeatureGate feature="Segment Discovery Agent" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><SegmentDiscoveryAgent {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "root_cause" && (
                    <FeatureGate feature="Root Cause Agent" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><RootCauseAgent {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "kpi_intel" && (
                    <FeatureGate feature="KPI Intelligence Layer" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><KPIIntelligenceLayer {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "auto_experiment" && (
                    <FeatureGate feature="AutoExperiment Engine" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><AutoExperimentEngine {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "causal_discovery" && (
                    <FeatureGate feature="Causal Discovery Agent" creditCost={1} requiredPlan="pro">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><CausalDiscoveryAgent {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "anomaly_watch" && (
                    <FeatureGate feature="Proactive Anomaly Watch" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><ProactiveAnomalyWatch {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "data_monitor" && (
                    <FeatureGate feature="Data Layer Monitor" creditCost={1} requiredPlan="free">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><DataLayerMonitor {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "ada_agent" && (
                    <FeatureGate feature="ADA Agent" creditCost={1} requiredPlan="standard">
                      <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><ADAAgentManager /></Suspense></ErrorBoundary>
                    </FeatureGate>
                  )}
                  {activeTab === "insight_inbox" && (
                    <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                      <InsightInbox datasetName={dataset?.name} />
                    </Suspense></ErrorBoundary>
                  )}
                  {activeTab === "forge_autopilot" && (
                    <FeatureGate feature="Forge Autopilot" creditCost={1} requiredPlan="pro">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><ForgeAutopilot {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "ceo_mode" && (
                    <FeatureGate feature="CEO Mode" creditCost={8} requiredPlan="pro">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><CEOMode {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "ai_scientist" && (
                    <FeatureGate feature="AI Data Scientist" creditCost={1} requiredPlan="free">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><AIDataScientist {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "payments" && (
                    <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><PaymentHistory /></Suspense></ErrorBoundary>
                  )}
                  {activeTab === "rollback" && (
                    <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                      <RollbackPanel
                        history={rollback.history}
                        redoStack={rollback.redoStack}
                        snapshots={rollback.snapshots}
                        canUndo={rollback.canUndo}
                        canRedo={rollback.canRedo}
                        onUndo={rollback.undo}
                        onRedo={rollback.redo}
                        onCreateSnapshot={() => {
                          if (dataset) {
                            rollback.createSnapshot(
                              `${dataset.name} — ${new Date().toLocaleTimeString()}`,
                              "dataset",
                              dataset,
                              `Manual snapshot of ${dataset.name} (${dataset.rawData.length} rows)`
                            );
                          }
                        }}
                        onRestoreSnapshot={(id) => {
                          const restored = rollback.restoreSnapshot(id);
                          if (restored) setDataset(restored as DatasetState);
                        }}
                        onDeleteSnapshot={rollback.deleteSnapshot}
                        onClearHistory={rollback.clearHistory}
                      />
                    </Suspense></ErrorBoundary>
                  )}

                  {/* ─── New Roadmap Features ─── */}
                  {activeTab === "multi_join" && (
                    <FeatureGate feature="Multi-Source Data Joins" creditCost={1} requiredPlan="standard">
                      {dataset && (
                        <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                          <MultiSourceJoiner 
                            primaryDataset={dataset} 
                            onJoinComplete={(joinedData, columns) => {
                              const joinedDataset: DatasetState = {
                                ...dataset,
                                name: `${dataset.name}_joined`,
                                rawData: joinedData,
                                cleanedData: joinedData,
                                columns,
                                status: "cleaned"
                              };
                              setDataset(joinedDataset);
                              setActiveTab("preview");
                            }}
                          />
                        </Suspense></ErrorBoundary>
                      )}
                    </FeatureGate>
                  )}
                  {activeTab === "pii_scanner" && (
                    <FeatureGate feature="PII Governance Scanner" creditCost={1} requiredPlan="pro">
                      {dataset && (
                        <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                          <PIIGovernanceScanner 
                            dataset={dataset} 
                            onDataMasked={handleDataCleaned}
                          />
                        </Suspense></ErrorBoundary>
                      )}
                    </FeatureGate>
                  )}
                  {activeTab === "collab" && (
                    <FeatureGate feature="Team Collaboration Hub" creditCost={1} requiredPlan="team">
                      {dataset && (
                        <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                          <TeamCollaborationHub dataset={dataset} sessionId={roomFromUrl || undefined} />
                        </Suspense></ErrorBoundary>
                      )}
                    </FeatureGate>
                  )}
                  {activeTab === "scheduled" && (
                    <FeatureGate feature="Scheduled Reports" creditCost={1} requiredPlan="pro">
                      {dataset && (
                        <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                          <ScheduledReportsPanel dataset={dataset} />
                        </Suspense></ErrorBoundary>
                      )}
                    </FeatureGate>
                  )}

                  {/* ─── Master Dashboard & Auto Report ─── */}
                  {activeTab === "master_dashboard" && (
                    <FeatureGate feature="Master Dashboard" creditCost={0} requiredPlan="free">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><MasterDashboard {...dataProps} pipelineResults={pipelineResults} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "auto_report" && (
                    <FeatureGate feature="Auto Report Engine" creditCost={1} requiredPlan="pro">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><AutoReportEngine {...dataProps} pipelineResults={pipelineResults} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}

                  {/* ─── Testing Suite ─── */}
                  {activeTab === "ab_testing" && (
                    <FeatureGate feature="A/B Testing" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><ABTestingPanel {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "cohort_analysis" && (
                    <FeatureGate feature="Cohort Analysis" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><CohortAnalysisPanel {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                  {activeTab === "data_testing" && (
                    <FeatureGate feature="Data Analytics Testing" creditCost={1} requiredPlan="standard">
                      {dataset && <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><DataAnalyticsTestingPanel {...dataProps} /></Suspense></ErrorBoundary>}
                    </FeatureGate>
                  )}
                </div>
              </ResponsiveContainer>
            )}
          </main>
        </div>

        {!showLanding && (
          <MobileBottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hasData={!!dataset}
          />
        )}

      </div>
    </CollaborationProvider>
  );
};

export default DataAgent;
