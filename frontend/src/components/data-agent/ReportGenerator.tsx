import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Download,
  Loader2,
  Sparkles,
  Calendar,
  Target,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Settings,
  FileDown,
  RefreshCw,
  Clock,
  Zap,
  BookOpen,
  Lightbulb,
  Rocket,
  Eye,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DatasetState } from "@/pages/DataAgent";
import PDFTemplateSelector, { PDFTemplate, PDF_TEMPLATES } from "./PDFTemplateSelector";

interface ReportGeneratorProps {
  dataset: DatasetState;
}

interface KeyFinding {
  id?: string;
  headline?: string;
  description?: string;
  evidence?: string;
  impact?: string;
  confidence?: number;
  finding?: string;
  title?: string;
}

interface Recommendation {
  id?: string;
  priority?: string;
  action?: string;
  rationale?: string;
  expectedOutcome?: string;
  timeline?: string;
  roi?: string;
  reason?: string;
}

interface RiskItem {
  risk?: string;
  probability?: string;
  impact?: string;
  mitigation?: string;
  severity?: number;
}

interface Opportunity {
  opportunity?: string;
  value?: string;
  effort?: string;
  timeline?: string;
}

interface PatternAnalysis {
  trends?: Array<{ name?: string; description?: string; trajectory?: string; magnitude?: string; }>;
  correlations?: Array<{ variables?: string[]; strength?: number; interpretation?: string; }>;
  anomalies?: Array<{ description?: string; severity?: string; }>;
  segments?: Array<{ name?: string; characteristics?: string; size?: string; }>;
}

interface GeneratedReport {
  title: string;
  executiveSummary: string;
  situationAnalysis?: string;
  introduction: string;
  objectives: string[];
  problemStatement: string;
  methodology: string;
  datasetOverview: {
    name: string;
    records: number;
    columns: number;
    dataTypes: string[];
  };
  toolsAndTechnologies: string[];
  implementationSteps: Array<string | { phase?: string; step?: string; description?: string; }>;
  keyFindings: string[]; // Always strings after mapping
  patternAnalysis?: PatternAnalysis;
  rootCauseAnalysis?: Array<{ finding?: string; causes?: string[]; contributingFactors?: string[]; }>;
  riskAssessment?: RiskItem[];
  opportunities?: Opportunity[];
  recommendations: string[]; // Always strings after mapping
  implementationRoadmap?: {
    phase1?: { name?: string; actions?: string[]; milestones?: string[]; };
    phase2?: { name?: string; actions?: string[]; milestones?: string[]; };
    phase3?: { name?: string; actions?: string[]; milestones?: string[]; };
  };
  conclusion: string;
  futureScope: string[];
  keyMetrics?: Array<{ name?: string; value?: string; change?: string; trend?: string; status?: string; }>;
  confidence?: number;
  wordCount?: number;
  generatedAt: string;
}

const ReportGenerator = ({ dataset }: ReportGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [projectDetails, setProjectDetails] = useState("");
  const [projectGoals, setProjectGoals] = useState("");
  const [projectStatus, setProjectStatus] = useState("in-progress");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [lastDataHash, setLastDataHash] = useState<string>("");
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate>(PDF_TEMPLATES[0]);

  // Calculate simple hash of data for change detection
  const calculateDataHash = useCallback(() => {
    const dataToHash = dataset.cleanedData || dataset.rawData;
    return JSON.stringify(dataToHash.slice(0, 50)).length + "-" + dataToHash.length;
  }, [dataset]);

  // Auto-update effect
  useEffect(() => {
    if (!autoUpdate || !report) return;

    const currentHash = calculateDataHash();
    if (currentHash !== lastDataHash && lastDataHash !== "") {
      console.log("Data changed, regenerating report...");
      generateReport();
    }
    setLastDataHash(currentHash);
  }, [dataset, autoUpdate, report, lastDataHash, calculateDataHash]);

  const generateReport = async () => {
    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      const dataToAnalyze = dataset.cleanedData || dataset.rawData;
      
      setGenerationProgress(20);
      
      // Simulate progressive loading
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 70));
      }, 500);
      
      const { data, error } = await supabase.functions.invoke('data-agent', {
        body: {
          action: 'generate-report',
          data: dataToAnalyze.slice(0, 200),
          datasetName: dataset.name,
          projectDetails,
          projectGoals,
          projectStatus,
          columns: dataset.columns,
        }
      });

      clearInterval(progressInterval);
      setGenerationProgress(85);

      if (error) throw error;

      // Helper to extract text from findings/recommendations
      const extractFindingText = (f: unknown): string => {
        if (typeof f === 'string') return f;
        const obj = f as KeyFinding;
        return obj?.headline || obj?.description || obj?.finding || obj?.title || String(f);
      };
      
      const extractRecommendationText = (r: unknown): string => {
        if (typeof r === 'string') return r;
        const obj = r as Recommendation;
        return obj?.action || obj?.rationale || obj?.reason || String(r);
      };

      // Parse the AI response with enhanced structure
      const reportData: GeneratedReport = {
        title: data.title || `${dataset.name} Analysis Report`,
        executiveSummary: data.executiveSummary || data.summary || "Comprehensive analysis has been completed for the provided dataset, revealing key patterns and actionable insights for strategic decision-making.",
        situationAnalysis: data.situationAnalysis || undefined,
        introduction: data.introduction || `This report presents a comprehensive analysis of the ${dataset.name} dataset, utilizing advanced AI-powered analytics to extract meaningful insights and recommendations.`,
        objectives: Array.isArray(data.objectives) 
          ? data.objectives.map((o: unknown) => typeof o === 'string' ? o : String(o))
          : ["Analyze data patterns and trends", "Identify key insights and correlations", "Provide actionable recommendations", "Generate comprehensive documentation"],
        problemStatement: data.problemStatement || "Understanding complex data patterns to derive actionable business intelligence and strategic insights.",
        methodology: data.methodology || "The analysis employed a multi-phase approach including data validation, statistical analysis, pattern recognition, and AI-driven insight generation.",
        datasetOverview: {
          name: dataset.name,
          records: dataToAnalyze.length,
          columns: dataset.columns.length,
          dataTypes: dataset.columns.map(c => {
            const sample = dataToAnalyze[0]?.[c];
            return typeof sample === 'number' ? 'Numeric' : typeof sample === 'boolean' ? 'Boolean' : 'Text';
          }),
        },
        toolsAndTechnologies: Array.isArray(data.toolsAndTechnologies) 
          ? data.toolsAndTechnologies.map((t: unknown) => typeof t === 'string' ? t : String(t))
          : ["AI Data Analysis Engine", "Statistical Processing Module", "Pattern Recognition System", "Natural Language Generation"],
        implementationSteps: Array.isArray(data.implementationSteps) ? data.implementationSteps : ["Data Upload & Validation", "Automated Data Cleaning", "Statistical Analysis", "Pattern Detection", "Insight Generation", "Report Compilation"],
        keyFindings: Array.isArray(data.keyFindings) 
          ? data.keyFindings.map(extractFindingText)
          : ["Analysis completed successfully with significant patterns identified"],
        patternAnalysis: data.patternAnalysis || undefined,
        rootCauseAnalysis: data.rootCauseAnalysis || undefined,
        riskAssessment: data.riskAssessment || undefined,
        opportunities: data.opportunities || undefined,
        recommendations: Array.isArray(data.recommendations) 
          ? data.recommendations.map(extractRecommendationText)
          : ["Review detailed findings for strategic implementation"],
        implementationRoadmap: data.implementationRoadmap || undefined,
        conclusion: data.conclusion || "The analysis has been successfully completed, providing comprehensive insights and actionable recommendations for data-driven decision making.",
        futureScope: Array.isArray(data.futureScope) 
          ? data.futureScope.map((s: unknown) => typeof s === 'string' ? s : String(s))
          : ["Continuous monitoring and trend analysis", "Predictive modeling implementation", "Advanced correlation studies", "Real-time dashboard integration"],
        keyMetrics: data.keyMetrics || undefined,
        confidence: data.confidence || undefined,
        wordCount: data.wordCount || undefined,
        generatedAt: new Date().toISOString(),
      };

      setReport(reportData);
      setGenerationProgress(100);
      setLastDataHash(calculateDataHash());
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToPDF = (template: PDFTemplate = selectedTemplate) => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Get colors from template
    const { primary, secondary, accent, text, textLight, background, headerBg } = template.colors;

    // Helper function to check page break
    const checkPageBreak = (neededSpace: number = 30) => {
      if (yPos + neededSpace > pageHeight - 20) {
        doc.addPage();
        // Add background color if template has it
        if (template.style === "elegant" || template.style === "modern") {
          doc.setFillColor(background[0], background[1], background[2]);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
        }
        yPos = 20;
      }
    };

    // Add decorative element based on style
    const addDecorativeElement = (style: string) => {
      if (style === "elegant") {
        // Add side accent bar
        doc.setFillColor(accent[0], accent[1], accent[2]);
        doc.rect(0, 0, 4, pageHeight, 'F');
      } else if (style === "bold") {
        // Add top and bottom bars
        doc.setFillColor(secondary[0], secondary[1], secondary[2]);
        doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');
      }
    };

    // Title Page with template colors
    doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.rect(0, 0, pageWidth, 70, 'F');
    
    // Add accent stripe
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(0, 70, pageWidth, 4, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(report.title, pageWidth / 2, 30, { align: "center" });
    
    // Add template badge
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(template.name + " Template", pageWidth / 2, 45, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date(report.generatedAt).toLocaleDateString()}`, pageWidth / 2, 58, { align: "center" });
    
    yPos = 90;

    // Section header helper with template styling
    const addSectionHeader = (title: string) => {
      checkPageBreak(40);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primary[0], primary[1], primary[2]);
      
      if (template.style === "bold") {
        // Add background rectangle for bold style
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(14, yPos - 6, pageWidth - 28, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(title, 18, yPos);
        doc.setTextColor(text[0], text[1], text[2]);
      } else if (template.style === "elegant") {
        // Add underline for elegant style
        doc.text(title, 14, yPos);
        doc.setDrawColor(accent[0], accent[1], accent[2]);
        doc.setLineWidth(0.5);
        doc.line(14, yPos + 2, 14 + doc.getTextWidth(title), yPos + 2);
      } else if (template.style === "minimal") {
        // Simple text for minimal
        doc.setTextColor(text[0], text[1], text[2]);
        doc.text(title.toUpperCase(), 14, yPos);
      } else {
        // Modern style - with accent bar
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(14, yPos - 5, 3, 8, 'F');
        doc.text(title, 22, yPos);
      }
      yPos += 12;
    };

    // Executive Summary
    addSectionHeader("Executive Summary");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(text[0], text[1], text[2]);
    const summaryLines = doc.splitTextToSize(report.executiveSummary, pageWidth - 28);
    doc.text(summaryLines, 14, yPos);
    yPos += summaryLines.length * 5 + 15;

    // Dataset Overview Table with template colors
    addSectionHeader("Dataset Overview");

    autoTable(doc, {
      startY: yPos,
      head: [["Property", "Value"]],
      body: [
        ["Dataset Name", report.datasetOverview.name],
        ["Total Records", report.datasetOverview.records.toLocaleString()],
        ["Total Columns", report.datasetOverview.columns.toString()],
        ["Status", projectStatus.charAt(0).toUpperCase() + projectStatus.slice(1).replace('-', ' ')],
        ["Report Template", template.name],
      ],
      theme: template.style === "minimal" ? "plain" : "striped",
      headStyles: { 
        fillColor: [primary[0], primary[1], primary[2]], 
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: { 
        fillColor: [background[0], background[1], background[2]] 
      },
      styles: {
        textColor: [text[0], text[1], text[2]],
      }
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

    // Objectives
    addSectionHeader("Objectives");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(text[0], text[1], text[2]);
    report.objectives.forEach((obj, idx) => {
      checkPageBreak(10);
      doc.setFillColor(secondary[0], secondary[1], secondary[2]);
      doc.circle(17, yPos - 1.5, 1.5, 'F');
      doc.text(obj, 22, yPos);
      yPos += 7;
    });
    yPos += 10;

    // Key Findings
    addSectionHeader(`Key Findings (${report.keyFindings.length})`);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    report.keyFindings.forEach((finding, idx) => {
      checkPageBreak(15);
      // Add numbered badge
      doc.setFillColor(secondary[0], secondary[1], secondary[2]);
      doc.roundedRect(14, yPos - 4, 8, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(String(idx + 1), 16.5, yPos, { align: 'center' });
      
      doc.setTextColor(text[0], text[1], text[2]);
      doc.setFontSize(10);
      const findingLines = doc.splitTextToSize(finding, pageWidth - 38);
      doc.text(findingLines, 26, yPos);
      yPos += findingLines.length * 5 + 5;
    });
    yPos += 10;

    // Recommendations
    addSectionHeader(`Recommendations (${report.recommendations.length})`);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    report.recommendations.forEach((rec, idx) => {
      checkPageBreak(15);
      // Add priority indicator
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.roundedRect(14, yPos - 4, 8, 6, 1, 1, 'F');
      doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.setFontSize(8);
      doc.text(String(idx + 1), 16.5, yPos, { align: 'center' });
      
      doc.setTextColor(text[0], text[1], text[2]);
      doc.setFontSize(10);
      const recLines = doc.splitTextToSize(rec, pageWidth - 38);
      doc.text(recLines, 26, yPos);
      yPos += recLines.length * 5 + 5;
    });
    yPos += 10;

    // Conclusion
    addSectionHeader("Conclusion");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(text[0], text[1], text[2]);
    const conclusionLines = doc.splitTextToSize(report.conclusion, pageWidth - 28);
    doc.text(conclusionLines, 14, yPos);
    yPos += conclusionLines.length * 5 + 15;

    // Future Scope
    addSectionHeader("Future Scope");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(text[0], text[1], text[2]);
    report.futureScope.forEach((scope, idx) => {
      checkPageBreak(10);
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.circle(17, yPos - 1.5, 1.5, 'F');
      doc.text(scope, 22, yPos);
      yPos += 7;
    });

    // Footer on all pages with template styling
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Add decorative elements based on style
      addDecorativeElement(template.style);
      
      // Footer bar
      doc.setFillColor(primary[0], primary[1], primary[2]);
      doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 5, { align: "center" });
      doc.text("Generated by SpaceForge AI", 14, pageHeight - 5);
      doc.text(template.name, pageWidth - 14, pageHeight - 5, { align: "right" });
    }

    // Save
    doc.save(`${report.title.replace(/\s+/g, '_')}_${template.id}_Report.pdf`);
    toast.success(`PDF exported with ${template.name} template!`);
  };

  const handleTemplateSelect = (template: PDFTemplate) => {
    setSelectedTemplate(template);
    exportToPDF(template);
    setShowTemplateSelector(false);
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="premium-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-cyan-500 shadow-button">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">AI Report Generator</CardTitle>
              <CardDescription className="mt-1">
                Generate comprehensive, professional reports automatically
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-update"
                  checked={autoUpdate}
                  onCheckedChange={setAutoUpdate}
                />
                <Label htmlFor="auto-update" className="text-sm flex items-center gap-1.5 cursor-pointer">
                  <RefreshCw className={`h-3.5 w-3.5 ${autoUpdate ? 'text-primary' : 'text-muted-foreground'}`} />
                  Auto-update
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Project Details
              </Label>
              <Textarea
                placeholder="Describe your project, requirements, context, and any specific areas of focus..."
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                className="min-h-[120px] bg-background resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Project Goals
              </Label>
              <Textarea
                placeholder="What are the goals, expected outcomes, and success metrics?"
                value={projectGoals}
                onChange={(e) => setProjectGoals(e.target.value)}
                className="min-h-[120px] bg-background resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="space-y-2 w-full sm:w-48">
              <Label className="text-sm font-medium">Project Status</Label>
              <Select value={projectStatus} onValueChange={setProjectStatus}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Planning
                    </span>
                  </SelectItem>
                  <SelectItem value="in-progress">
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4" /> In Progress
                    </span>
                  </SelectItem>
                  <SelectItem value="review">
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" /> Review
                    </span>
                  </SelectItem>
                  <SelectItem value="completed">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" /> Completed
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generateReport}
              disabled={isGenerating}
              size="lg"
              className="bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90 shadow-button transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>

          {isGenerating && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <span className="text-lg font-medium text-primary">We are creating a perfect report</span>
                </div>
                <span className="text-sm text-muted-foreground">Please wait a while...</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Processing your data...</span>
                <span className="font-medium">{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Report Preview */}
      {report && (
        <div className="space-y-5 animate-fade-in">
          {/* Report Header */}
          <Card className="overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary via-cyan-500 to-primary" />
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{report.title}</CardTitle>
                  <CardDescription className="mt-1.5 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Dataset: {dataset.name} • {report.datasetOverview.records.toLocaleString()} records
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1.5" />
                    {new Date(report.generatedAt).toLocaleDateString()}
                  </Badge>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowTemplateSelector(true)} 
                    className="shadow-button"
                  >
                    <Palette className="w-4 h-4 mr-2" />
                    Templates
                  </Button>
                  <Button onClick={() => exportToPDF()} className="shadow-button">
                    <FileDown className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-5">
              {/* Executive Summary */}
              <Card className="stat-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Executive Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{report.executiveSummary}</p>
                </CardContent>
              </Card>

              {/* Methodology */}
              {report.methodology && (
                <Card className="stat-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4 text-primary" />
                      Methodology
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{report.methodology}</p>
                  </CardContent>
                </Card>
              )}

              {/* Key Findings */}
              <Card className="stat-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Key Findings ({report.keyFindings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {report.keyFindings.map((finding, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        </div>
                        <span className="text-muted-foreground">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="stat-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Recommendations ({report.recommendations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {report.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                          <AlertCircle className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Conclusion */}
              <Card className="stat-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Conclusion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{report.conclusion}</p>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Dataset Overview */}
              <Card className="stat-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Dataset Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{report.datasetOverview.records.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Records</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{report.datasetOverview.columns}</p>
                      <p className="text-xs text-muted-foreground">Columns</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Badge className="capitalize">{projectStatus.replace('-', ' ')}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Objectives */}
              <Card className="stat-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Objectives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {report.objectives.slice(0, 4).map((obj, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Future Scope */}
              <Card className="stat-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-primary" />
                    Future Scope
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {report.futureScope.slice(0, 4).map((scope, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 mt-2 rounded-full bg-cyan-500 flex-shrink-0" />
                        {scope}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* PDF Template Selector Modal */}
      <PDFTemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        onSelectTemplate={handleTemplateSelect}
        selectedTemplateId={selectedTemplate.id}
      />
    </div>
  );
};

export default ReportGenerator;