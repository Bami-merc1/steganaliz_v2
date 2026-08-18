import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { VerdictResult } from '../detectors/types';
import { formatBytes } from './formatBytes';

interface ReportData {
  fileName: string;
  fileSize: number;
  fileType: string;
  analysisTimestamp: string;
  verdict: VerdictResult;
  validationNotes: string[];
  hasEofPayload: boolean;
}

const ORANGE = rgb(0.91, 0.33, 0.165); // #E8542A
const BLACK  = rgb(0.1,  0.1,  0.1);
const GREY   = rgb(0.42, 0.42, 0.39);
const WHITE  = rgb(1,    1,    1);
const RED    = rgb(0.77, 0.33, 0.29);
const GREEN  = rgb(0.29, 0.49, 0.37);
const AMBER  = rgb(0.79, 0.63, 0.36);

const VERDICT_COLOR = {
  CLEAN: GREEN,
  SUSPICIOUS: AMBER,
  STEGO: RED,
};

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

export async function generateForensicPdf(report: ReportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const boldFont   = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const monoFont   = await pdf.embedFont(StandardFonts.Courier);

  const pageWidth  = 595; // A4
  const pageHeight = 842;
  const margin     = 48;
  const contentWidth = pageWidth - margin * 2;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // ── helpers ───────────────────────────────────────────────────────────────

  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) newPage();
  };

  const drawText = (
    text: string,
    opts: {
      x?: number;
      size?: number;
      font?: typeof boldFont;
      color?: ReturnType<typeof rgb>;
      indent?: number;
    } = {}
  ) => {
    const {
      x = margin,
      size = 9,
      font = regularFont,
      color = BLACK,
      indent = 0,
    } = opts;
    page.drawText(text, { x: x + indent, y, size, font, color });
    y -= size + 4;
  };

  const drawRule = (color = ORANGE, thickness = 0.5) => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness,
      color,
    });
    y -= 6;
  };

  const drawWrapped = (
    text: string,
    opts: {
      size?: number;
      font?: typeof boldFont;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      maxChars?: number;
    } = {}
  ) => {
    const { size = 9, font = regularFont, color = BLACK, indent = 0, maxChars = 90 } = opts;
    const lines = wrap(text, maxChars);
    for (const line of lines) {
      ensureSpace(size + 6);
      page.drawText(line, { x: margin + indent, y, size, font, color });
      y -= size + 4;
    }
  };

  // ── Cover header ──────────────────────────────────────────────────────────

  // Orange header bar
  page.drawRectangle({
    x: 0, y: pageHeight - 70,
    width: pageWidth, height: 70,
    color: rgb(0.05, 0.05, 0.05),
  });
  page.drawText('STEGANALIZ', {
    x: margin, y: pageHeight - 38,
    size: 20, font: boldFont, color: WHITE,
  });
  page.drawText('v1.0', {
    x: margin + 130, y: pageHeight - 38,
    size: 20, font: regularFont, color: ORANGE,
  });
  page.drawText('FORENSIC ANALYSIS REPORT', {
    x: margin, y: pageHeight - 56,
    size: 9, font: regularFont, color: rgb(0.6, 0.6, 0.6),
  });
  page.drawText(report.analysisTimestamp, {
    x: pageWidth - margin - 180, y: pageHeight - 56,
    size: 9, font: monoFont, color: rgb(0.6, 0.6, 0.6),
  });

  y = pageHeight - 90;

  // ── Section: Case information ─────────────────────────────────────────────

  ensureSpace(80);
  drawText('CASE INFORMATION', { size: 10, font: boldFont, color: ORANGE });
  drawRule();

  const caseRows = [
    ['File name',   report.fileName],
    ['File size',   `${formatBytes(report.fileSize)} (${report.fileSize} bytes)`],
    ['File type',   report.fileType],
    ['Processing',  'Client-side only - no data transmitted to any server'],
  ];
  for (const [label, value] of caseRows) {
    ensureSpace(16);
    page.drawText(`${label}:`, { x: margin, y, size: 9, font: boldFont, color: BLACK });
    page.drawText(value,        { x: margin + 90, y, size: 9, font: monoFont, color: BLACK });
    y -= 14;
  }
  y -= 6;

  // ── Section: Verdict ──────────────────────────────────────────────────────

  ensureSpace(80);
  drawText('OVERALL VERDICT', { size: 10, font: boldFont, color: ORANGE });
  drawRule();

  const verdictColor = VERDICT_COLOR[report.verdict.overallLabel];

  // Verdict badge
  page.drawRectangle({
    x: margin, y: y - 24,
    width: 140, height: 28,
    color: verdictColor,
    // borderRadius: 3,
  });
  page.drawText(report.verdict.overallLabel, {
    x: margin + 8, y: y - 16,
    size: 14, font: boldFont, color: WHITE,
  });
  page.drawText(`${report.verdict.overallScore}% confidence`, {
    x: margin + 155, y: y - 10,
    size: 11, font: regularFont, color: verdictColor,
  });
  page.drawText(`EOF-append payload: ${report.hasEofPayload ? 'DETECTED' : 'Not detected'}`, {
    x: margin + 155, y: y - 24,
    size: 9, font: regularFont, color: GREY,
  });
  y -= 40;

  // ── Section: Validation notes ─────────────────────────────────────────────

  if (report.validationNotes.length > 0) {
    ensureSpace(40);
    drawText('FILE VALIDATION NOTES', { size: 10, font: boldFont, color: ORANGE });
    drawRule();
    for (const note of report.validationNotes) {
      drawWrapped(`• ${note}`, { color: RED, indent: 4 });
    }
    y -= 4;
  }

  // ── Section: Detector results ─────────────────────────────────────────────

  ensureSpace(50);
  drawText('DETECTOR RESULTS', { size: 10, font: boldFont, color: ORANGE });
  drawRule();

  // Table header
  const col = { name: margin, label: margin + 240, score: margin + 310, detail: margin + 370 };
  page.drawRectangle({
    x: margin - 4, y: y - 4,
    width: contentWidth + 8, height: 18,
    color: rgb(0.94, 0.94, 0.92),
  });
  page.drawText('Detector',    { x: col.name,  y, size: 8, font: boldFont, color: GREY });
  page.drawText('Label',       { x: col.label, y, size: 8, font: boldFont, color: GREY });
  page.drawText('Score',       { x: col.score, y, size: 8, font: boldFont, color: GREY });
  page.drawText('Applicable',  { x: col.detail,y, size: 8, font: boldFont, color: GREY });
  y -= 20;

  for (const result of report.verdict.results) {
    ensureSpace(28);
    const rowColor = result.label === 'STEGO'
      ? RED
      : result.label === 'SUSPICIOUS'
        ? AMBER
        : GREEN;

    page.drawText(result.detectorName, {
      x: col.name, y, size: 8, font: regularFont, color: BLACK,
    });
    page.drawText(result.label, {
      x: col.label, y, size: 8, font: boldFont, color: rowColor,
    });
    page.drawText(`${result.score}%`, {
      x: col.score, y, size: 8, font: monoFont, color: BLACK,
    });
    page.drawText(result.applicable ? 'Yes' : 'N/A', {
      x: col.detail, y, size: 8, font: regularFont, color: GREY,
    });
    y -= 13;

    if (result.details) {
      const detailLines = wrap(result.details, 85);
      for (const line of detailLines) {
        ensureSpace(12);
        page.drawText(line, { x: col.name + 8, y, size: 7, font: monoFont, color: GREY });
        y -= 11;
      }
    }
    y -= 2;
  }

  // ── Section: Methodology ──────────────────────────────────────────────────

  ensureSpace(100);
  y -= 6;
  drawText('METHODOLOGY', { size: 10, font: boldFont, color: ORANGE });
  drawRule();

  const methodology = [
    'Steganalysis performed using a 10-detector weighted verdict engine. Detectors:',
    'Shannon entropy analysis, chi-square pairs-of-values attack, Regular-Singular',
    'analysis (single-mask), EOF-append marker scan, header/signature consistency',
    'check, LSB ratio test, histogram smoothness analysis, sample pair analysis,',
    'PNG metadata chunk inspector, and signature fingerprinting.',
  ];
  for (const line of methodology) {
    ensureSpace(14);
    drawText(line, { color: GREY });
  }
  y -= 4;

  // ── Section: Disclaimer ───────────────────────────────────────────────────

  ensureSpace(80);
  drawText('DISCLAIMER', { size: 10, font: boldFont, color: ORANGE });
  drawRule();

  drawWrapped(
    'This report is generated by automated statistical analysis and should not be ' +
    'treated as conclusive forensic evidence without independent expert verification. ' +
    'Statistical steganalysis has known false-positive rates, particularly on ' +
    'compressed or naturally high-entropy content. Absence of a STEGO verdict does ' +
    'not exclude sophisticated adaptive embedding (see Training → Week 14).',
    { color: GREY, maxChars: 95 }
  );

  // ── Footer on every page ──────────────────────────────────────────────────

  const pageCount = pdf.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const p = pdf.getPage(i);
    p.drawLine({
      start: { x: margin, y: margin - 6 },
      end: { x: pageWidth - margin, y: margin - 6 },
      thickness: 0.5,
      color: ORANGE,
    });
    p.drawText('Steganaliz v1.0  |  steganaliz.emerc.site  |  All processing client-side via Web Crypto API', {
      x: margin, y: margin - 18,
      size: 7, font: regularFont, color: GREY,
    });
    p.drawText(`Page ${i + 1} of ${pageCount}`, {
      x: pageWidth - margin - 50, y: margin - 18,
      size: 7, font: regularFont, color: GREY,
    });
  }

  return pdf.save();
}