/**
 * coachReportService.js
 * Generates the 8-dimension coach score from speech + facial + Gemini metrics.
 * Also handles PDF report generation via jsPDF.
 */
import jsPDF from 'jspdf';

/**
 * Compute the 8 final coach scores from raw analytics data.
 * @param {Object} geminiEval - Result from /api/gemini/evaluate or /evaluate-coach
 * @param {Object} speechMetrics - From voiceService.getSpeechMetrics()
 * @param {Object} facialAnalytics - From facialAnalysisService.getAnalyticsSummary()
 * @returns {Object} coachMetrics with 8 scores + summary
 */
export function computeCoachMetrics(geminiEval, speechMetrics, facialAnalytics) {
  const gm = geminiEval?.metrics || {};
  const overall = geminiEval?.score || 70;

  // 1. Technical Knowledge — directly from Gemini evaluation
  const technicalKnowledge = clamp(gm.technicalAccuracy || overall * 0.9);

  // 2. Communication — Gemini communication + clarity
  const communication = clamp(
    ((gm.communication || overall) + (gm.clarity || overall)) / 2
  );

  // 3. Confidence — Facial confidence + Gemini confidence
  const facialConfidence = facialAnalytics?.confidenceScore || 72;
  const confidence = clamp((facialConfidence + (gm.confidence || overall)) / 2);

  // 4. Facial Expressions — From facial analysis
  const expressionBreakdown = facialAnalytics?.expressionBreakdown || {};
  const positiveExpressions = (expressionBreakdown.calm || 0) + (expressionBreakdown.focused || 0) + (expressionBreakdown.happy || 0);
  const facialExpressions = clamp(50 + positiveExpressions * 0.5);

  // 5. Eye Contact — directly from facial analytics
  const eyeContact = clamp(facialAnalytics?.eyeContactPercent || 70);

  // 6. Speech Fluency — from voiceService fluency + WPM check
  const wpm = speechMetrics?.wordsPerMinute || 130;
  const fillerPenalty = Math.min(30, (speechMetrics?.fillerWordCount || 0) * 3);
  const wpmBonus = wpm >= 100 && wpm <= 170 ? 10 : 0;
  const speechFluency = clamp((gm.clarity || 70) - fillerPenalty + wpmBonus);

  // 7. Professionalism — combination of all
  const professionalism = clamp(
    (communication * 0.4 + confidence * 0.3 + eyeContact * 0.3)
  );

  // 8. Overall Performance — weighted average
  const overallPerformance = clamp(
    technicalKnowledge * 0.25 +
    communication * 0.20 +
    confidence * 0.15 +
    speechFluency * 0.15 +
    eyeContact * 0.10 +
    facialExpressions * 0.08 +
    professionalism * 0.07
  );

  return {
    technicalKnowledge: Math.round(technicalKnowledge),
    communication: Math.round(communication),
    confidence: Math.round(confidence),
    facialExpressions: Math.round(facialExpressions),
    eyeContact: Math.round(eyeContact),
    speechFluency: Math.round(speechFluency),
    professionalism: Math.round(professionalism),
    overallPerformance: Math.round(overallPerformance)
  };
}

function clamp(val) {
  return Math.min(100, Math.max(0, val || 0));
}

/**
 * Generate and download a PDF interview report.
 * @param {Object} reportData - All interview data including coachMetrics
 */
export async function downloadPDFReport(reportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Helpers
  const addText = (text, size, color, bold = false) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    if (bold) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');
    doc.text(String(text), margin, y);
    y += size * 0.45;
  };

  const addHr = (color = [200, 200, 200]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  const addBar = (label, value, color) => {
    const barW = contentW - 40;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(label, margin, y);
    doc.setFillColor(230, 230, 240);
    doc.roundedRect(margin + 42, y - 4, barW, 5, 2, 2, 'F');
    const scoreColor = value >= 80 ? [34, 197, 94] : value >= 60 ? [251, 191, 36] : [239, 68, 68];
    doc.setFillColor(...(color || scoreColor));
    doc.roundedRect(margin + 42, y - 4, (barW * value) / 100, 5, 2, 2, 'F');
    doc.setTextColor(50, 50, 50);
    doc.text(`${value}%`, pageW - margin - 5, y, { align: 'right' });
    y += 8;
  };

  const checkPage = (needed = 20) => {
    if (y + needed > 280) {
      doc.addPage();
      y = margin;
    }
  };

  // ─── Header ───────────────────────────────────
  doc.setFillColor(30, 30, 60);
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('InterviewGPT AI', margin, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('AI Interview Coach Report', margin, 27);
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 220);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageW - margin, 27, { align: 'right' });
  y = 50;

  // ─── Interview Info ───────────────────────────
  addText(`Interview Type: ${reportData.type || 'General'}`, 11, [60, 60, 80], true);
  y += 2;
  addHr();

  // ─── Overall Score ────────────────────────────
  const overall = reportData.coachMetrics?.overallPerformance || reportData.score || 0;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 60);
  doc.text('Overall Performance', margin, y);
  y += 8;

  const scoreColor = overall >= 80 ? [34, 197, 94] : overall >= 60 ? [251, 191, 36] : [239, 68, 68];
  doc.setFillColor(...scoreColor);
  doc.circle(margin + 12, y + 4, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${overall}`, margin + 9, y + 6);
  doc.setTextColor(60, 60, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('out of 100', margin + 26, y + 5);
  y += 20;
  addHr();

  // ─── 8-Dimension Scores ───────────────────────
  checkPage(80);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 60);
  doc.text('Detailed Performance Metrics', margin, y);
  y += 8;

  const metrics = reportData.coachMetrics || {};
  const metricsList = [
    { label: 'Technical Knowledge', key: 'technicalKnowledge', color: [59, 130, 246] },
    { label: 'Communication',       key: 'communication',      color: [139, 92, 246] },
    { label: 'Confidence',          key: 'confidence',         color: [16, 185, 129] },
    { label: 'Facial Expressions',  key: 'facialExpressions',  color: [245, 158, 11] },
    { label: 'Eye Contact',         key: 'eyeContact',         color: [236, 72, 153] },
    { label: 'Speech Fluency',      key: 'speechFluency',      color: [14, 165, 233] },
    { label: 'Professionalism',     key: 'professionalism',    color: [168, 85, 247] },
    { label: 'Overall Performance', key: 'overallPerformance', color: [34, 197, 94]  }
  ];

  metricsList.forEach(({ label, key, color }) => {
    checkPage(10);
    addBar(label, metrics[key] || 0, color);
  });

  y += 4;
  addHr();

  // ─── Speech Analytics ─────────────────────────
  if (reportData.speechAnalytics) {
    checkPage(40);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 60);
    doc.text('Speech Analytics', margin, y);
    y += 8;

    const sa = reportData.speechAnalytics;
    const speechItems = [
      `Words per Minute: ${sa.wordsPerMinute || 0} WPM`,
      `Total Words Spoken: ${sa.totalWords || 0}`,
      `Filler Words Detected: ${sa.fillerWordCount || 0}`,
      `Filler Words Used: ${(sa.fillerWords || []).join(', ') || 'None'}`
    ];
    speechItems.forEach(item => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 90);
      doc.text(`• ${item}`, margin + 4, y);
      y += 6;
    });
    y += 2;
    addHr();
  }

  // ─── Facial Analytics ─────────────────────────
  if (reportData.facialAnalytics) {
    checkPage(40);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 60);
    doc.text('Facial & Eye Contact Analysis', margin, y);
    y += 8;

    const fa = reportData.facialAnalytics;
    const facialItems = [
      `Eye Contact: ${fa.eyeContactPercent || 0}% of interview`,
      `Dominant Expression: ${fa.dominantExpression || 'calm'}`,
    ];
    Object.entries(fa.expressionBreakdown || {}).forEach(([expr, pct]) => {
      facialItems.push(`  ${expr.charAt(0).toUpperCase() + expr.slice(1)}: ${pct}%`);
    });
    facialItems.forEach(item => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 90);
      doc.text(`• ${item}`, margin + 4, y);
      y += 6;
    });
    y += 2;
    addHr();
  }

  // ─── Strengths & Weaknesses ───────────────────
  checkPage(60);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 60);
  doc.text('Strengths', margin, y);
  y += 7;
  (reportData.strengths || []).forEach(s => {
    checkPage(8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(34, 120, 80);
    doc.text(`✓  ${s}`, margin + 4, y);
    y += 6;
  });

  y += 4;
  checkPage(40);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 60);
  doc.text('Areas to Improve', margin, y);
  y += 7;
  (reportData.weaknesses || []).forEach(w => {
    checkPage(8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 60, 60);
    doc.text(`!  ${w}`, margin + 4, y);
    y += 6;
  });

  y += 4;
  checkPage(50);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 60);
  doc.text('Recommendations', margin, y);
  y += 7;
  (reportData.suggestions || []).forEach(s => {
    checkPage(8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 150);
    doc.text(`→  ${s}`, margin + 4, y);
    y += 6;
  });

  // ─── Footer ───────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 180);
    doc.text(
      `InterviewGPT AI Coach Report  |  Page ${i} of ${totalPages}`,
      pageW / 2, 290, { align: 'center' }
    );
  }

  doc.save(`InterviewGPT_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
