// lib/text-pdf-generator.ts
// Text-based PDF generator for ATS compatibility

import type { jsPDF } from 'jspdf';
import { BaseResume } from '@/types/resume';
import { getTemplate } from './templates';

interface PDFContext {
  doc: jsPDF;
  y: number;
  pageWidth: number;
  pageHeight: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  contentWidth: number;
  fontFamily: string;
  colors: {
    primary: string;
    secondary: string;
  };
}

// Map template fonts to jsPDF built-in fonts
function getJsPDFFont(templateFont: string): string {
  const fontLower = templateFont.toLowerCase();
  if (fontLower.includes('times') || fontLower.includes('georgia') || fontLower.includes('serif')) {
    return 'times';
  }
  return 'helvetica';
}

// Sanitize text for ATS compatibility - remove problematic characters
function sanitizeForATS(text: string): string {
  if (!text) return '';

  return text
    // Remove zero-width characters and invisible unicode
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    // Replace em dashes and en dashes with hyphens
    .replace(/[—–]/g, '-')
    // Replace curly quotes with straight quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Replace ellipsis character with periods
    .replace(/…/g, '...')
    // Remove other problematic unicode characters
    .replace(/[\u2022\u2023\u2043]/g, '-') // Various bullet characters
    // Normalize whitespace - replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Remove non-printable ASCII characters except common ones
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    .trim();
}

// Sanitize phone number for ATS - use consistent format
function sanitizePhone(phone: string): string {
  if (!phone) return '';

  // Extract just the digits
  const digits = phone.replace(/\D/g, '');

  // Format as XXX-XXX-XXXX for US numbers (10 digits)
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // Format as X-XXX-XXX-XXXX for US numbers with country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // For other formats, just remove parentheses and normalize
  return phone
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

// Parse HTML to find bold segments
function parseBoldSegments(html: string): Array<{ text: string; bold: boolean }> {
  const segments: Array<{ text: string; bold: boolean }> = [];
  const parts = html.split(/(<\/?strong>)/gi);
  let isBold = false;

  for (const part of parts) {
    if (part.toLowerCase() === '<strong>') {
      isBold = true;
    } else if (part.toLowerCase() === '</strong>') {
      isBold = false;
    } else if (part) {
      segments.push({ text: part, bold: isBold });
    }
  }

  return segments.length > 0 ? segments : [{ text: html.replace(/<[^>]*>/g, ''), bold: false }];
}

// Write text with mixed bold formatting
function writeFormattedText(
  ctx: PDFContext,
  html: string,
  fontSize: number,
  x: number,
  maxWidth: number
): number {
  const segments = parseBoldSegments(html);
  const lineHeight = fontSize * 0.4;

  ctx.doc.setFontSize(fontSize);
  ctx.doc.setTextColor(ctx.colors.secondary);

  const lines: Array<Array<{ text: string; bold: boolean }>> = [];
  let currentLine: Array<{ text: string; bold: boolean }> = [];
  let currentLineWidth = 0;

  for (const segment of segments) {
    const words = segment.text.split(/\s+/).filter(w => w.length > 0);
    ctx.doc.setFont(ctx.fontFamily, segment.bold ? 'bold' : 'normal');

    for (const word of words) {
      const wordWidth = ctx.doc.getTextWidth(word);
      const spaceWidth = ctx.doc.getTextWidth(' ');
      const needsSpace = currentLine.length > 0;
      const totalWidth = needsSpace ? wordWidth + spaceWidth : wordWidth;

      if (currentLineWidth + totalWidth > maxWidth && currentLine.length > 0) {
        lines.push([...currentLine]);
        currentLine = [];
        currentLineWidth = 0;
      }

      if (currentLine.length > 0) {
        currentLine.push({ text: ' ', bold: false });
        currentLineWidth += spaceWidth;
      }

      currentLine.push({ text: word, bold: segment.bold });
      currentLineWidth += wordWidth;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  const startY = ctx.y;
  for (const line of lines) {
    let lineX = x;

    for (const seg of line) {
      ctx.doc.setFont(ctx.fontFamily, seg.bold ? 'bold' : 'normal');
      ctx.doc.text(seg.text, lineX, ctx.y);
      lineX += ctx.doc.getTextWidth(seg.text);
    }
    ctx.y += lineHeight;
  }

  return ctx.y - startY;
}

// Write plain text
function writeText(
  ctx: PDFContext,
  text: string,
  fontSize: number,
  options: {
    bold?: boolean;
    italic?: boolean;
    align?: 'left' | 'center' | 'right';
    color?: 'primary' | 'secondary';
    x?: number;
    maxWidth?: number;
  } = {}
): number {
  const {
    bold = false,
    italic = false,
    align = 'left',
    color = 'secondary',
    x = ctx.marginLeft,
    maxWidth = ctx.contentWidth
  } = options;

  ctx.doc.setFontSize(fontSize);
  ctx.doc.setFont(ctx.fontFamily, bold ? (italic ? 'bolditalic' : 'bold') : (italic ? 'italic' : 'normal'));
  ctx.doc.setTextColor(color === 'primary' ? ctx.colors.primary : ctx.colors.secondary);

  const lineHeight = fontSize * 0.4;
  const lines = ctx.doc.splitTextToSize(text, maxWidth);

  for (const line of lines) {
    let textX = x;
    if (align === 'center') {
      textX = ctx.pageWidth / 2;
    } else if (align === 'right') {
      textX = ctx.pageWidth - ctx.marginRight;
    }

    ctx.doc.text(line, textX, ctx.y, { align });
    ctx.y += lineHeight;
  }

  return lines.length * lineHeight;
}

// Draw a horizontal line
function drawLine(ctx: PDFContext, y?: number): void {
  const lineY = y ?? ctx.y;
  ctx.doc.setDrawColor(ctx.colors.primary);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(ctx.marginLeft, lineY, ctx.pageWidth - ctx.marginRight, lineY);
}

// Add section header with underline BELOW the text (fixed positioning)
function writeSectionHeader(ctx: PDFContext, title: string): void {
  ctx.y += 2;
  ctx.doc.setFontSize(10);
  ctx.doc.setFont(ctx.fontFamily, 'bold');
  ctx.doc.setTextColor(ctx.colors.primary);
  ctx.doc.text(title.toUpperCase(), ctx.marginLeft, ctx.y);
  ctx.y += 1.5; // Space AFTER text, BEFORE line (moved line closer to header)
  drawLine(ctx, ctx.y);
  ctx.y += 3.5; // More space AFTER line before content
}

export async function generateTextBasedPDF(
  resume: BaseResume,
  templateId: string,
  filename: string
): Promise<Blob> {
  const template = getTemplate(templateId);
  const fontFamily = getJsPDFFont(template.fonts.body);

  // Convert inches to mm (1 inch = 25.4mm)
  const pageWidth = 215.9;
  const marginLeft = template.margins.left * 25.4;
  const marginRight = template.margins.right * 25.4;
  const marginTop = template.margins.top * 25.4;
  const marginBottom = template.margins.bottom * 25.4;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const module = await import('jspdf');
  const jsPDF = module.default || module.jsPDF;

  // First pass: calculate content height with a temp doc
  const tempDoc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, 500] // Tall page to measure
  });

  const tempCtx: PDFContext = {
    doc: tempDoc,
    y: marginTop,
    pageWidth,
    pageHeight: 500,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    contentWidth,
    fontFamily,
    colors: {
      primary: template.colors.primary,
      secondary: template.colors.secondary
    }
  };

  // Render to temp to calculate height
  renderResume(tempCtx, resume);
  const contentHeight = tempCtx.y + marginBottom;

  // Calculate page height - minimum 279.4mm (letter), expand if needed
  const pageHeight = Math.max(279.4, contentHeight + 5);

  // Create final document with calculated height
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, pageHeight]
  });

  const ctx: PDFContext = {
    doc,
    y: marginTop,
    pageWidth,
    pageHeight,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    contentWidth,
    fontFamily,
    colors: {
      primary: template.colors.primary,
      secondary: template.colors.secondary
    }
  };

  // Render final PDF
  renderResume(ctx, resume);

  return doc.output('blob');
}

function renderResume(ctx: PDFContext, resume: BaseResume): void {
  // === HEADER ===
  writeText(ctx, sanitizeForATS(resume.personal.name), 14, { bold: true, align: 'center', color: 'primary' });
  ctx.y += 0.5;

  // Contact info with clickable links
  ctx.doc.setFontSize(9);
  ctx.doc.setFont(ctx.fontFamily, 'normal');
  ctx.doc.setTextColor(ctx.colors.secondary);

  const contactParts: Array<{ text: string; link?: string }> = [
    { text: sanitizeForATS(resume.personal.location) },
    { text: sanitizePhone(resume.personal.phone) },
    { text: sanitizeForATS(resume.personal.email), link: `mailto:${resume.personal.email}` }
  ];

  if (resume.personal.linkedin) {
    const linkedinUrl = resume.personal.linkedin.startsWith('http')
      ? resume.personal.linkedin
      : `https://${resume.personal.linkedin}`;
    contactParts.push({ text: sanitizeForATS(resume.personal.linkedin), link: linkedinUrl });
  }

  let totalContactWidth = 0;
  const separator = ' | ';
  for (let i = 0; i < contactParts.length; i++) {
    totalContactWidth += ctx.doc.getTextWidth(contactParts[i].text);
    if (i < contactParts.length - 1) {
      totalContactWidth += ctx.doc.getTextWidth(separator);
    }
  }

  let contactX = (ctx.pageWidth - totalContactWidth) / 2;
  for (let i = 0; i < contactParts.length; i++) {
    const part = contactParts[i];
    if (part.link) {
      ctx.doc.setTextColor(ctx.colors.secondary);
      ctx.doc.textWithLink(part.text, contactX, ctx.y, { url: part.link });
    } else {
      ctx.doc.text(part.text, contactX, ctx.y);
    }
    contactX += ctx.doc.getTextWidth(part.text);

    if (i < contactParts.length - 1) {
      ctx.doc.text(separator, contactX, ctx.y);
      contactX += ctx.doc.getTextWidth(separator);
    }
  }
  ctx.y += 3.5;

  drawLine(ctx);
  ctx.y += 2;

  // === PROFESSIONAL SUMMARY ===
  if (resume.summary) {
    writeSectionHeader(ctx, 'Professional Summary');
    writeFormattedText(ctx, sanitizeForATS(resume.summary), 10, ctx.marginLeft, ctx.contentWidth);
    ctx.y += 1;
  }

  // === CORE COMPETENCIES ===
  const coreCompetencies = resume.coreCompetencies;
  const hasCompetencies = coreCompetencies && (
    Array.isArray(coreCompetencies) ? coreCompetencies.length > 0 : coreCompetencies
  );

  if (hasCompetencies) {
    writeSectionHeader(ctx, 'Core Competencies');
    const competenciesText = sanitizeForATS(
      Array.isArray(coreCompetencies)
        ? coreCompetencies.join(' | ')
        : String(coreCompetencies)
    );

    // Render on single line - use smaller font if needed to fit
    ctx.doc.setFontSize(10);
    ctx.doc.setFont(ctx.fontFamily, 'normal');
    ctx.doc.setTextColor(ctx.colors.secondary);

    let fontSize = 10;
    let textWidth = ctx.doc.getTextWidth(competenciesText);

    // Reduce font size if text doesn't fit on one line
    while (textWidth > ctx.contentWidth && fontSize > 8) {
      fontSize -= 0.5;
      ctx.doc.setFontSize(fontSize);
      textWidth = ctx.doc.getTextWidth(competenciesText);
    }

    ctx.doc.text(competenciesText, ctx.marginLeft, ctx.y);
    ctx.y += 4;
  }

  // === SKILLS (ATS-optimized format) ===
  const skillCategories = resume.skillCategories && resume.skillCategories.length > 0
    ? resume.skillCategories
    : null;

  writeSectionHeader(ctx, 'Technical Skills');

  if (skillCategories) {
    for (const cat of skillCategories) {
      ctx.doc.setFontSize(10);
      ctx.doc.setFont(ctx.fontFamily, 'bold');
      ctx.doc.setTextColor(ctx.colors.secondary);
      const categoryLabel = `${sanitizeForATS(cat.category)}: `;
      ctx.doc.text(categoryLabel, ctx.marginLeft, ctx.y);
      const labelWidth = ctx.doc.getTextWidth(categoryLabel);

      ctx.doc.setFont(ctx.fontFamily, 'normal');
      const skillsText = sanitizeForATS(cat.skills.join(', '));

      // Calculate available width for skills
      const availableWidth = ctx.contentWidth - labelWidth;
      const skillLines = ctx.doc.splitTextToSize(skillsText, availableWidth);

      // First line after category label
      ctx.doc.text(skillLines[0], ctx.marginLeft + labelWidth, ctx.y);
      ctx.y += 3.8;

      // Continuation lines (indented to align with first skill)
      for (let i = 1; i < skillLines.length; i++) {
        ctx.doc.text(skillLines[i], ctx.marginLeft + labelWidth, ctx.y);
        ctx.y += 3.8;
      }
    }
  } else {
    // Flat skills list - ATS friendly comma-separated format
    ctx.doc.setFontSize(10);
    ctx.doc.setFont(ctx.fontFamily, 'normal');
    ctx.doc.setTextColor(ctx.colors.secondary);
    const skillsText = sanitizeForATS(resume.skills.join(', '));
    const skillLines = ctx.doc.splitTextToSize(skillsText, ctx.contentWidth);
    for (const line of skillLines) {
      ctx.doc.text(line, ctx.marginLeft, ctx.y);
      ctx.y += 3.8;
    }
  }
  ctx.y += 1;

  // === PROFESSIONAL EXPERIENCE ===
  writeSectionHeader(ctx, 'Professional Experience');

  for (const exp of resume.experience) {
    const dateText = sanitizeForATS(exp.current ? `${exp.startDate} - Present` : `${exp.startDate} - ${exp.endDate}`);
    const title = sanitizeForATS(exp.title);
    const company = sanitizeForATS(exp.company);

    ctx.doc.setFontSize(10);
    ctx.doc.setFont(ctx.fontFamily, 'bold');
    ctx.doc.setTextColor(ctx.colors.primary);
    ctx.doc.text(title, ctx.marginLeft, ctx.y);
    const titleWidth = ctx.doc.getTextWidth(title);

    ctx.doc.setFont(ctx.fontFamily, 'normal');
    ctx.doc.setTextColor(ctx.colors.secondary);
    ctx.doc.text(` | ${company}`, ctx.marginLeft + titleWidth, ctx.y);

    ctx.doc.setFontSize(9);
    ctx.doc.setFont(ctx.fontFamily, 'bold');
    ctx.doc.text(dateText, ctx.pageWidth - ctx.marginRight, ctx.y, { align: 'right' });
    ctx.doc.setFont(ctx.fontFamily, 'normal');
    ctx.y += 3.5;

    // Only render location if provided
    if (exp.location && exp.location.trim()) {
      ctx.doc.setFontSize(9);
      ctx.doc.setFont(ctx.fontFamily, 'italic');
      ctx.doc.text(sanitizeForATS(exp.location), ctx.marginLeft, ctx.y);
      ctx.y += 4; // More padding below location before bullets
    } else {
      ctx.y += 1.5; // Small padding if no location
    }

    ctx.doc.setFontSize(10);
    ctx.doc.setTextColor(ctx.colors.secondary);

    for (const bullet of exp.bullets) {
      const bulletIndent = ctx.marginLeft + 4;
      const bulletWidth = ctx.contentWidth - 4;
      const lineHeight = 3.5;

      const segments = parseBoldSegments(sanitizeForATS(bullet));
      const lines: Array<Array<{ text: string; bold: boolean }>> = [];
      let currentLine: Array<{ text: string; bold: boolean }> = [];
      let currentLineWidth = 0;

      for (const seg of segments) {
        const words = seg.text.split(/\s+/).filter(w => w.length > 0);
        ctx.doc.setFont(ctx.fontFamily, seg.bold ? 'bold' : 'normal');

        for (const word of words) {
          const wordWidth = ctx.doc.getTextWidth(word);
          const spaceWidth = ctx.doc.getTextWidth(' ');
          const needsSpace = currentLine.length > 0;
          const totalWidth = needsSpace ? wordWidth + spaceWidth : wordWidth;

          if (currentLineWidth + totalWidth > bulletWidth && currentLine.length > 0) {
            lines.push([...currentLine]);
            currentLine = [];
            currentLineWidth = 0;
          }

          if (currentLine.length > 0) {
            currentLine.push({ text: ' ', bold: false });
            currentLineWidth += spaceWidth;
          }

          currentLine.push({ text: word, bold: seg.bold });
          currentLineWidth += wordWidth;
        }
      }

      if (currentLine.length > 0) {
        lines.push(currentLine);
      }

      // Draw bullet point - vertically centered with first line of text
      ctx.doc.setFont(ctx.fontFamily, 'normal');
      ctx.doc.text('•', ctx.marginLeft + 0.5, ctx.y);

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const isLastLine = lineIndex === lines.length - 1;

        // Calculate total text width for this line (excluding spaces)
        let totalTextWidth = 0;
        let spaceCount = 0;
        for (const seg of line) {
          ctx.doc.setFont(ctx.fontFamily, seg.bold ? 'bold' : 'normal');
          if (seg.text === ' ') {
            spaceCount++;
          } else {
            totalTextWidth += ctx.doc.getTextWidth(seg.text);
          }
        }

        // Calculate justified space width (only for non-last lines with multiple words)
        const baseSpaceWidth = ctx.doc.getTextWidth(' ');
        let justifiedSpaceWidth = baseSpaceWidth;

        if (!isLastLine && spaceCount > 0) {
          const remainingSpace = bulletWidth - totalTextWidth;
          justifiedSpaceWidth = remainingSpace / spaceCount;
          // Cap the space to avoid overly stretched text
          justifiedSpaceWidth = Math.min(justifiedSpaceWidth, baseSpaceWidth * 2.5);
        }

        let lineX = bulletIndent;
        for (const seg of line) {
          ctx.doc.setFont(ctx.fontFamily, seg.bold ? 'bold' : 'normal');
          if (seg.text === ' ') {
            lineX += justifiedSpaceWidth;
          } else {
            ctx.doc.text(seg.text, lineX, ctx.y);
            lineX += ctx.doc.getTextWidth(seg.text);
          }
        }

        ctx.y += lineHeight;
      }

      ctx.y += 0.3;
    }
    ctx.y += 1;
  }

  // === EDUCATION ===
  writeSectionHeader(ctx, 'Education');

  for (const edu of resume.education) {
    ctx.doc.setFontSize(10);
    ctx.doc.setFont(ctx.fontFamily, 'bold');
    ctx.doc.setTextColor(ctx.colors.primary);
    ctx.doc.text(sanitizeForATS(edu.degree), ctx.marginLeft, ctx.y);

    // Only render graduation date if provided
    if (edu.graduationDate) {
      ctx.doc.setFontSize(9);
      ctx.doc.setFont(ctx.fontFamily, 'bold');
      ctx.doc.setTextColor(ctx.colors.secondary);
      ctx.doc.text(sanitizeForATS(edu.graduationDate), ctx.pageWidth - ctx.marginRight, ctx.y, { align: 'right' });
    }
    ctx.y += 4.5; // More padding between degree and institution

    let eduDetails = sanitizeForATS(edu.institution);
    if (edu.gpa) {
      eduDetails += ` | GPA: ${sanitizeForATS(edu.gpa)}`;
    }
    ctx.doc.setFontSize(10);
    ctx.doc.text(eduDetails, ctx.marginLeft, ctx.y);
    ctx.y += 5; // More spacing between education entries
  }

  // === CERTIFICATIONS ===
  if (resume.certifications.length > 0) {
    writeSectionHeader(ctx, 'Certifications');

    for (const cert of resume.certifications) {
      ctx.doc.setFontSize(10);
      ctx.doc.setFont(ctx.fontFamily, 'normal');
      ctx.doc.setTextColor(ctx.colors.secondary);
      ctx.doc.text('•', ctx.marginLeft + 0.5, ctx.y);
      ctx.doc.text(sanitizeForATS(cert), ctx.marginLeft + 4, ctx.y);
      ctx.y += 3.5;
    }
  }
}
