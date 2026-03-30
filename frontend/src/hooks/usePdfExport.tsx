import { useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { renderGlossaryAndWorkflow } from "@/lib/pdfGlossaryRenderer";

interface ExportOptions {
  title: string;
  subtitle?: string;
  datasetName?: string;
  includeGlossary?: boolean;
  sections?: {
    title: string;
    content: string | string[];
    type?: "text" | "list" | "table";
    tableData?: { headers: string[]; rows: string[][] };
  }[];
  statistics?: Record<string, string | number>;
  insights?: { title: string; description: string; importance?: string }[];
  recommendations?: string[];
  footer?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  sentiment?: { sentiment: string };
}

interface ChartExportData {
  type: string;
  title: string;
  data?: Record<string, unknown>[];
  config?: Record<string, unknown>;
}

export const usePdfExport = () => {
  // Original export function for reports
  const exportToPdf = useCallback((options: ExportOptions) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      const checkNewPage = (height: number) => {
        if (yPosition + height > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Header with gradient-like effect
      pdf.setFillColor(99, 102, 241);
      pdf.rect(0, 0, pageWidth, 40, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text(options.title, margin, 25);

      if (options.subtitle) {
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.text(options.subtitle, margin, 34);
      }

      yPosition = 55;

      if (options.datasetName) {
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(10);
        pdf.text(`Dataset: ${options.datasetName}`, margin, yPosition);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 60, yPosition);
        yPosition += 15;
      }

      if (options.sections) {
        for (const section of options.sections) {
          checkNewPage(30);

          pdf.setTextColor(99, 102, 241);
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.text(section.title, margin, yPosition);
          yPosition += 8;

          pdf.setTextColor(60, 60, 60);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");

          if (section.type === "table" && section.tableData) {
            autoTable(pdf, {
              startY: yPosition,
              head: [section.tableData.headers],
              body: section.tableData.rows,
              margin: { left: margin, right: margin },
              styles: { fontSize: 9, cellPadding: 3 },
              headStyles: { fillColor: [99, 102, 241], textColor: 255 },
              alternateRowStyles: { fillColor: [245, 245, 250] },
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;
          } else if (section.type === "list" && Array.isArray(section.content)) {
            for (const item of section.content) {
              checkNewPage(8);
              const lines = pdf.splitTextToSize(`• ${item}`, pageWidth - margin * 2 - 5);
              pdf.text(lines, margin + 5, yPosition);
              yPosition += lines.length * 5 + 3;
            }
            yPosition += 5;
          } else {
            const content = Array.isArray(section.content) ? section.content.join("\n") : section.content;
            const lines = pdf.splitTextToSize(content, pageWidth - margin * 2);
            for (const line of lines) {
              checkNewPage(6);
              pdf.text(line, margin, yPosition);
              yPosition += 5;
            }
            yPosition += 8;
          }
        }
      }

      if (options.statistics && Object.keys(options.statistics).length > 0) {
        checkNewPage(40);
        pdf.setTextColor(99, 102, 241);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Key Statistics", margin, yPosition);
        yPosition += 10;

        const statsData = Object.entries(options.statistics).map(([key, value]) => [
          key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          String(value),
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [["Metric", "Value"]],
          body: statsData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 10, cellPadding: 4 },
          headStyles: { fillColor: [99, 102, 241], textColor: 255 },
          columnStyles: { 0: { fontStyle: "bold" } },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;
      }

      if (options.insights && options.insights.length > 0) {
        checkNewPage(30);
        pdf.setTextColor(99, 102, 241);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Key Insights", margin, yPosition);
        yPosition += 10;

        for (const insight of options.insights) {
          checkNewPage(20);
          pdf.setTextColor(40, 40, 40);
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          const titleText = insight.importance ? `[${insight.importance.toUpperCase()}] ${insight.title}` : insight.title;
          pdf.text(titleText, margin, yPosition);
          yPosition += 6;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(80, 80, 80);
          const descLines = pdf.splitTextToSize(insight.description, pageWidth - margin * 2);
          pdf.text(descLines, margin, yPosition);
          yPosition += descLines.length * 5 + 8;
        }
      }

      if (options.recommendations && options.recommendations.length > 0) {
        checkNewPage(30);
        pdf.setTextColor(99, 102, 241);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Recommendations", margin, yPosition);
        yPosition += 10;

        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");

        options.recommendations.forEach((rec, index) => {
          checkNewPage(10);
          const lines = pdf.splitTextToSize(`${index + 1}. ${rec}`, pageWidth - margin * 2 - 5);
          pdf.text(lines, margin, yPosition);
          yPosition += lines.length * 5 + 4;
        });
      }

      // Glossary & Workflow appendix
      if (options.includeGlossary !== false) {
        renderGlossaryAndWorkflow(pdf);
      }

      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `SpaceForge Report - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
        if (options.footer) {
          pdf.text(options.footer, margin, pageHeight - 10);
        }
      }

      const filename = `${options.title.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF. Please try again.");
    }
  }, []);

  // Export chat conversation to PDF
  const exportChatToPdf = useCallback((messages: ChatMessage[], datasetName: string, sessionTitle?: string) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      const checkNewPage = (height: number) => {
        if (yPosition + height > pageHeight - margin - 15) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Header
      pdf.setFillColor(99, 102, 241);
      pdf.rect(0, 0, pageWidth, 45, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Conversation History", margin, 22);

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(sessionTitle || `Chat with ${datasetName}`, margin, 32);
      pdf.text(`${messages.length} messages`, margin, 40);

      yPosition = 55;

      // Metadata
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(9);
      pdf.text(`Dataset: ${datasetName}`, margin, yPosition);
      pdf.text(`Exported: ${new Date().toLocaleString()}`, pageWidth - margin - 55, yPosition);
      yPosition += 15;

      // Separator
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);

      // Messages
      for (const message of messages) {
        checkNewPage(30);

        const isUser = message.role === "user";
        const bubbleColor = isUser ? [99, 102, 241] : [240, 240, 245];
        const textColor = isUser ? [255, 255, 255] : [40, 40, 40];
        
        // Role label
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        const roleLabel = isUser ? "You" : "AI Assistant";
        const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : "";
        pdf.text(`${roleLabel} ${timestamp ? `• ${timestamp}` : ""}`, isUser ? pageWidth - margin - 40 : margin, yPosition);
        yPosition += 6;

        // Message bubble
        const maxWidth = pageWidth - margin * 2 - 20;
        pdf.setFontSize(10);
        const contentLines = pdf.splitTextToSize(message.content, maxWidth);
        const bubbleHeight = contentLines.length * 5 + 10;
        
        const bubbleX = isUser ? pageWidth - margin - maxWidth - 10 : margin;
        
        pdf.setFillColor(bubbleColor[0], bubbleColor[1], bubbleColor[2]);
        pdf.roundedRect(bubbleX, yPosition - 3, maxWidth + 10, bubbleHeight, 3, 3, "F");
        
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        pdf.setFont("helvetica", "normal");
        
        let lineY = yPosition + 4;
        for (const line of contentLines) {
          pdf.text(line, bubbleX + 5, lineY);
          lineY += 5;
        }

        yPosition += bubbleHeight + 8;

        // Sentiment indicator for user messages
        if (isUser && message.sentiment?.sentiment) {
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Mood: ${message.sentiment.sentiment}`, pageWidth - margin - 35, yPosition - 5);
        }
      }

      // Footer on each page
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `SpaceForge Chat Export - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      const filename = `chat_${datasetName.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
      toast.success("Chat exported to PDF!");
    } catch (error) {
      console.error("Chat PDF export error:", error);
      toast.error("Failed to export chat. Please try again.");
    }
  }, []);

  // Export visualization/dashboard to PDF
  const exportVisualizationToPdf = useCallback((
    charts: ChartExportData[],
    datasetName: string,
    dashboardTitle?: string
  ) => {
    try {
      const pdf = new jsPDF("landscape");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Header
      pdf.setFillColor(99, 102, 241);
      pdf.rect(0, 0, pageWidth, 35, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(dashboardTitle || "Dashboard Export", margin, 20);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Dataset: ${datasetName} | ${charts.length} visualization(s) | ${new Date().toLocaleString()}`, margin, 30);

      yPosition = 45;

      // Chart summary table
      const chartData = charts.map((chart, index) => [
        String(index + 1),
        chart.title || `Chart ${index + 1}`,
        chart.type.charAt(0).toUpperCase() + chart.type.slice(1),
        chart.config?.xAxis as string || "-",
        chart.config?.yAxis as string || "-",
      ]);

      autoTable(pdf, {
        startY: yPosition,
        head: [["#", "Title", "Type", "X-Axis", "Y-Axis"]],
        body: chartData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 248, 252] },
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // Data summary for each chart
      for (const chart of charts) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setTextColor(99, 102, 241);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${chart.title || "Chart"} - ${chart.type}`, margin, yPosition);
        yPosition += 8;

        if (chart.data && chart.data.length > 0) {
          const headers = Object.keys(chart.data[0]);
          const rows = chart.data.slice(0, 10).map(row => 
            headers.map(h => String(row[h] ?? "-"))
          );

          autoTable(pdf, {
            startY: yPosition,
            head: [headers],
            body: rows,
            margin: { left: margin, right: margin },
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [120, 120, 140], textColor: 255 },
          });

          yPosition = (pdf as any).lastAutoTable.finalY + 10;

          if (chart.data.length > 10) {
            pdf.setFontSize(8);
            pdf.setTextColor(120, 120, 120);
            pdf.text(`... and ${chart.data.length - 10} more rows`, margin, yPosition);
            yPosition += 10;
          }
        }
      }

      // Footer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `SpaceForge Visualization Export - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: "center" }
        );
      }

      const filename = `dashboard_${datasetName.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
      toast.success("Dashboard exported to PDF!");
    } catch (error) {
      console.error("Visualization PDF export error:", error);
      toast.error("Failed to export dashboard. Please try again.");
    }
  }, []);

  // Generate shareable link (returns base64 encoded data)
  const generateShareableLink = useCallback((messages: ChatMessage[], datasetName: string): string => {
    try {
      const shareData = {
        dataset: datasetName,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp?.toISOString(),
        })),
        exportedAt: new Date().toISOString(),
      };

      const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
      const shareUrl = `${window.location.origin}/shared-chat?data=${encoded}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success("Shareable link copied to clipboard!");
      }).catch(() => {
        toast.error("Failed to copy link. Please try again.");
      });

      return shareUrl;
    } catch (error) {
      console.error("Share link generation error:", error);
      toast.error("Failed to generate shareable link.");
      return "";
    }
  }, []);

  // Export data table to CSV
  const exportToCsv = useCallback((data: Record<string, unknown>[], filename: string) => {
    try {
      if (!data || data.length === 0) {
        toast.error("No data to export");
        return;
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(","),
        ...data.map(row => 
          headers.map(h => {
            const val = row[h];
            const stringVal = String(val ?? "");
            // Escape quotes and wrap in quotes if contains comma
            if (stringVal.includes(",") || stringVal.includes('"') || stringVal.includes("\n")) {
              return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
          }).join(",")
        )
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully!");
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error("Failed to export CSV. Please try again.");
    }
  }, []);

  return { 
    exportToPdf, 
    exportChatToPdf, 
    exportVisualizationToPdf, 
    generateShareableLink,
    exportToCsv,
  };
};

export default usePdfExport;