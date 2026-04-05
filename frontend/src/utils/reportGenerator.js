// frontend/src/utils/reportGenerator.js
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * Generate a 3-page professional PDF report for a completed EEG session.
 * @param {Object} session - The session object with snapshots, averages, and peaks.
 */
export async function generateSessionReport(session) {
  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4"
  });

  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const primaryColor = "#00D4FF"; // NeuroInsight Cyan
  const secondaryColor = "#6B8BAE"; // Slate Blue

  // --- Helper: Add Interpretation Text ---
  const getInterpretation = (averages) => {
    const notes = [];
    if (averages.attention  > 65) notes.push("High sustained focus observed.");
    if (averages.relaxation > 65) notes.push("Calm cognitive state detected.");
    if (averages.stress     > 65) notes.push("Elevated mental load detected.");
    if (averages.engagement > 65) notes.push("Strong task engagement observed.");
    return notes.length > 0 ? notes.join(" ") : "Normal cognitive variance observed during this session.";
  };

  // ==========================================
  // PAGE 1: COVER PAGE
  // ==========================================
  // Header Background
  doc.setFillColor(15, 23, 42); // Dark slate
  doc.rect(0, 0, pageWidth, 80, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("NeuroInsight", marginLeft, 40);
  
  doc.setFontSize(16);
  doc.setTextColor(primaryColor);
  doc.text("Cognitive Session Report", marginLeft, 52);

  // Tagline
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.text("Real-time Explainable EEG Cognitive Monitoring", marginLeft, 62);

  // Session Metadata
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  
  const metaY = 100;
  doc.text(`Session ID: ${session.id}`, marginLeft, metaY);
  doc.text(`Date: ${new Date(session.startTime).toLocaleDateString()}`, marginLeft, metaY + 10);
  doc.text(`Time: ${new Date(session.startTime).toLocaleTimeString()}`, marginLeft, metaY + 20);
  doc.text(`Duration: ${session.duration} seconds`, marginLeft, metaY + 30);
  doc.text(`Generated: ${new Date().toLocaleString()}`, marginLeft, metaY + 40);

  // Professional Footer
  doc.setDrawColor(200, 200, 200);
  doc.line(marginLeft, pageHeight - 30, pageWidth - marginLeft, pageHeight - 30);
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor);
  doc.text("NeuroInsight BCI Project • EEG Session Analytics v2.2", marginLeft, pageHeight - 20);

  // ==========================================
  // PAGE 2: SUMMARY METRICS
  // ==========================================
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("Metric Summary & Interpretation", marginLeft, 13);

  // Metric Cards
  let cardY = 40;
  const metrics = [
    { label: "Attention",  avg: session.averages.attention,  peak: session.peaks.maxAttention, color: [0, 212, 255] },
    { label: "Relaxation", avg: session.averages.relaxation, peak: session.averages.relaxation, color: [0, 255, 136] }, // Simplified avg/peak map
    { label: "Stress",     avg: session.averages.stress,     peak: session.peaks.maxStress,   color: [255, 51, 102] },
    { label: "Engagement", avg: session.averages.engagement, peak: session.peaks.maxEngagement, color: [123, 47, 190] }
  ];

  metrics.forEach((m) => {
    // Label
    doc.setFont("helvetica", "bold");
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.label, marginLeft, cardY);
    
    // Values
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(`Average: ${m.avg}%`, marginLeft + 40, cardY);
    doc.text(`Peak: ${m.peak}%`, marginLeft + 80, cardY);
    
    doc.setDrawColor(240, 240, 240);
    doc.line(marginLeft, cardY + 5, pageWidth - marginLeft, cardY + 5);
    cardY += 20;
  });

  // Interpretation Section
  cardY += 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Clinical Observations:", marginLeft, cardY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const splitText = doc.splitTextToSize(getInterpretation(session.averages), pageWidth - (marginLeft * 2));
  doc.text(splitText, marginLeft, cardY + 10);

  // ==========================================
  // PAGE 3: TREND VISUALIZATION
  // ==========================================
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("Neural Trend Visualizations", marginLeft, 13);

  // Capture Charts using html2canvas
  try {
    const chartIds = ["perf-chart-1", "perf-chart-2"];
    let chartY = 30;

    for (const id of chartIds) {
      const el = document.getElementById(id);
      if (el) {
        const canvas = await html2canvas(el, {
          backgroundColor: "#0F172A",
          scale: 2,
          logging: false
        });
        const imgData = canvas.toDataURL("image/png");
        // Maintain aspect ratio
        const imgWidth = pageWidth - (marginLeft * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        doc.addImage(imgData, "PNG", marginLeft, chartY, imgWidth, imgHeight);
        chartY += imgHeight + 20;
      }
    }
  } catch (err) {
    console.error("[PDF] Chart capture failed", err);
    doc.setTextColor(255, 51, 102);
    doc.text("Error capturing visualization trends.", marginLeft, 40);
  }

  // --- Final Save ---
  doc.save(`NeuroInsight_Report_${session.id}.pdf`);
}
