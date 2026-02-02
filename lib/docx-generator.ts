// lib/docx-generator.ts

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  LevelFormat,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import { BaseResume } from '@/types/resume';
import { getTemplate } from './templates';

// Default styles for DOCX generation
const defaultStyles = {
  fonts: {
    name: { size: 24, bold: true, font: 'Arial' },
    sectionHeader: { size: 14, bold: true, font: 'Arial' },
    jobTitle: { size: 12, bold: true, font: 'Arial' },
    body: { size: 11, font: 'Arial' }
  },
  spacing: {
    beforeSection: 240,
    afterSection: 120,
    beforeParagraph: 60,
    afterParagraph: 60
  }
};

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
    .replace(/[\u2022\u2023\u2043]/g, '-')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove non-printable ASCII characters except common ones
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    .trim();
}

// Sanitize phone number for ATS - use consistent format
function sanitizePhone(phone: string): string {
  if (!phone) return '';

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

// Parse HTML text and create TextRuns with bold formatting
function parseHtmlToTextRuns(html: string, styles: typeof defaultStyles): TextRun[] {
  const runs: TextRun[] = [];

  // Split by <strong> tags while keeping track of bold state
  const parts = html.split(/(<\/?strong>)/gi);
  let isBold = false;

  for (const part of parts) {
    if (part.toLowerCase() === '<strong>') {
      isBold = true;
    } else if (part.toLowerCase() === '</strong>') {
      isBold = false;
    } else if (part.trim() || part === ' ') {
      runs.push(new TextRun({
        text: part,
        size: styles.fonts.body.size * 2,
        font: styles.fonts.body.font,
        bold: isBold
      }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({
    text: html.replace(/<[^>]*>/g, ''),
    size: styles.fonts.body.size * 2,
    font: styles.fonts.body.font
  })];
}

export async function generateDOCX(
  resume: BaseResume,
  templateId: string,
  _fileName: string
): Promise<Blob> {
  const template = getTemplate(templateId);
  const styles = defaultStyles;

  // Convert inches to DXA (1 inch = 1440 DXA)
  const margins = {
    top: template.margins.top * 1440,
    right: template.margins.right * 1440,
    bottom: template.margins.bottom * 1440,
    left: template.margins.left * 1440
  };

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: 12240,  // US Letter: 8.5 inches
            height: 15840  // US Letter: 11 inches
          },
          margin: margins
        }
      },
      children: [
        // Header with name and contact info
        ...createHeader(resume, styles),

        // Professional Summary
        ...createSummarySection(resume, styles),

        // Experience
        ...createExperienceSection(resume, styles),

        // Education
        ...createEducationSection(resume, styles),

        // Skills
        ...createSkillsSection(resume, styles),

        // Projects
        ...createProjectsSection(resume, styles),

        // Certifications (if any)
        ...createCertificationsSection(resume, styles)
      ]
    }],

    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: 720, hanging: 360 }
            }
          }
        }]
      }]
    }
  });

  const buffer = await Packer.toBuffer(doc);
  return new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

function createHeader(resume: BaseResume, styles: any): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Name
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: sanitizeForATS(resume.personal.name),
          size: styles.fonts.name.size * 2, // Convert to half-points
          bold: true,
          font: styles.fonts.name.font
        })
      ]
    })
  );

  // Contact info
  const contactParts = [
    sanitizeForATS(resume.personal.location),
    sanitizePhone(resume.personal.phone),
    sanitizeForATS(resume.personal.email)
  ];

  if (resume.personal.linkedin) {
    contactParts.push(sanitizeForATS(resume.personal.linkedin));
  }

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: contactParts.join(' | '),
          size: styles.fonts.body.size * 2,
          font: styles.fonts.body.font
        })
      ]
    })
  );

  return paragraphs;
}

function createSummarySection(resume: BaseResume, styles: typeof defaultStyles): Paragraph[] {
  if (!resume.summary) return [];

  return [
    new Paragraph({
      spacing: { before: styles.spacing.beforeSection, after: 120 },
      children: [
        new TextRun({
          text: 'PROFESSIONAL SUMMARY',
          size: styles.fonts.sectionHeader.size * 2,
          bold: true,
          font: styles.fonts.sectionHeader.font
        })
      ]
    }),
    new Paragraph({
      spacing: { after: styles.spacing.afterSection },
      children: parseHtmlToTextRuns(sanitizeForATS(resume.summary), styles)
    })
  ];
}

function createExperienceSection(resume: BaseResume, styles: any): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { before: styles.spacing.beforeSection, after: 120 },
      children: [
        new TextRun({
          text: 'PROFESSIONAL EXPERIENCE',
          size: styles.fonts.sectionHeader.size * 2,
          bold: true,
          font: styles.fonts.sectionHeader.font
        })
      ]
    })
  );

  resume.experience.forEach((exp, index) => {
    // Job title and company
    paragraphs.push(
      new Paragraph({
        spacing: {
          before: index > 0 ? 160 : 0,
          after: 40
        },
        children: [
          new TextRun({
            text: sanitizeForATS(exp.title),
            size: styles.fonts.jobTitle.size * 2,
            bold: true,
            font: styles.fonts.jobTitle.font
          }),
          new TextRun({
            text: ' | ' + sanitizeForATS(exp.company),
            size: styles.fonts.jobTitle.size * 2,
            font: styles.fonts.jobTitle.font
          })
        ]
      })
    );

    // Location and dates
    const dateRange = sanitizeForATS(exp.current
      ? `${exp.startDate} - Present`
      : `${exp.startDate} - ${exp.endDate}`);

    const locationDateChildren: TextRun[] = [];
    if (exp.location && exp.location.trim()) {
      locationDateChildren.push(
        new TextRun({
          text: `${sanitizeForATS(exp.location)} | `,
          size: styles.fonts.body.size * 2,
          font: styles.fonts.body.font,
          italics: true
        })
      );
    }
    locationDateChildren.push(
      new TextRun({
        text: dateRange,
        size: styles.fonts.body.size * 2,
        font: styles.fonts.body.font,
        bold: true
      })
    );

    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        children: locationDateChildren
      })
    );

    // Bullet points
    exp.bullets.forEach(bullet => {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { after: 40 },
          children: parseHtmlToTextRuns(sanitizeForATS(bullet), styles)
        })
      );
    });
  });

  return paragraphs;
}

function createEducationSection(resume: BaseResume, styles: any): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { before: styles.spacing.beforeSection, after: 120 },
      children: [
        new TextRun({
          text: 'EDUCATION',
          size: styles.fonts.sectionHeader.size * 2,
          bold: true,
          font: styles.fonts.sectionHeader.font
        })
      ]
    })
  );

  resume.education.forEach((edu, index) => {
    paragraphs.push(
      new Paragraph({
        spacing: {
          before: index > 0 ? 120 : 0,
          after: 40
        },
        children: [
          new TextRun({
            text: sanitizeForATS(edu.degree),
            size: styles.fonts.jobTitle.size * 2,
            bold: true,
            font: styles.fonts.jobTitle.font
          })
        ]
      })
    );

    const eduDetails = [sanitizeForATS(edu.institution)];
    if (edu.location) eduDetails.push(sanitizeForATS(edu.location));
    if (edu.graduationDate) eduDetails.push(sanitizeForATS(edu.graduationDate));
    if (edu.gpa) eduDetails.push(`GPA: ${sanitizeForATS(edu.gpa)}`);

    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: eduDetails.join(' | '),
            size: styles.fonts.body.size * 2,
            font: styles.fonts.body.font
          })
        ]
      })
    );
  });

  return paragraphs;
}

function createSkillsSection(resume: BaseResume, styles: any): (Paragraph | Table)[] {
  if (resume.skills.length === 0 && (!resume.skillCategories || resume.skillCategories.length === 0)) return [];

  const paragraphs: (Paragraph | Table)[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { before: styles.spacing.beforeSection, after: 120 },
      children: [
        new TextRun({
          text: 'TECHNICAL SKILLS',
          size: styles.fonts.sectionHeader.size * 2,
          bold: true,
          font: styles.fonts.sectionHeader.font
        })
      ]
    })
  );

  // Use categorized skills if available
  if (resume.skillCategories && resume.skillCategories.length > 0) {
    paragraphs.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: resume.skillCategories.map(cat => (
          new TableRow({
            children: [
              new TableCell({
                width: { size: 2800, type: WidthType.DXA }, // Approx 1.94 inches (matches 140pt)
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${sanitizeForATS(cat.category)}:`,
                        size: styles.fonts.body.size * 2,
                        font: styles.fonts.body.font,
                        bold: true
                      })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 7200, type: WidthType.DXA }, // Remaining width
                children: [
                  new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    children: [
                      new TextRun({
                        text: sanitizeForATS(cat.skills.join(', ')),
                        size: styles.fonts.body.size * 2,
                        font: styles.fonts.body.font
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ))
      })
    );
    return paragraphs;
  }

  // Fallback to flat skills list
  paragraphs.push(
    new Paragraph({
      spacing: { after: styles.spacing.afterSection },
      children: [
        new TextRun({
          text: sanitizeForATS(resume.skills.join(', ')),
          size: styles.fonts.body.size * 2,
          font: styles.fonts.body.font
        })
      ]
    })
  );

  return paragraphs;
}

function createCertificationsSection(resume: BaseResume, styles: any): Paragraph[] {
  if (resume.certifications.length === 0) return [];

  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { before: styles.spacing.beforeSection, after: 120 },
      children: [
        new TextRun({
          text: 'CERTIFICATIONS',
          size: styles.fonts.sectionHeader.size * 2,
          bold: true,
          font: styles.fonts.sectionHeader.font
        })
      ]
    })
  );

  resume.certifications.forEach(cert => {
    paragraphs.push(
      new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: sanitizeForATS(cert),
            size: styles.fonts.body.size * 2,
            font: styles.fonts.body.font
          })
        ]
      })
    );
  });

  return paragraphs;
}
function createProjectsSection(resume: BaseResume, styles: any): Paragraph[] {
  if (!resume.projects || resume.projects.length === 0) return [];

  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { before: styles.spacing.beforeSection, after: 120 },
      children: [
        new TextRun({
          text: 'PROJECTS',
          size: styles.fonts.sectionHeader.size * 2,
          bold: true,
          font: styles.fonts.sectionHeader.font
        })
      ]
    })
  );

  resume.projects.forEach((proj, index) => {
    // Project name and link
    const nameLinkRuns: TextRun[] = [
      new TextRun({
        text: sanitizeForATS(proj.name),
        size: styles.fonts.jobTitle.size * 2,
        bold: true,
        font: styles.fonts.jobTitle.font
      })
    ];

    if (proj.link) {
      nameLinkRuns.push(
        new TextRun({
          text: ' | ' + sanitizeForATS(proj.link),
          size: styles.fonts.body.size * 2,
          font: styles.fonts.body.font
        })
      );
    }

    paragraphs.push(
      new Paragraph({
        spacing: {
          before: index > 0 ? 160 : 0,
          after: 40
        },
        children: nameLinkRuns
      })
    );

    // Dates and description
    if (proj.startDate || proj.endDate || proj.description) {
      const detailsRuns: TextRun[] = [];

      if (proj.startDate || proj.endDate) {
        detailsRuns.push(
          new TextRun({
            text: sanitizeForATS(proj.startDate && proj.endDate ? `${proj.startDate} - ${proj.endDate}` : (proj.startDate || proj.endDate || '')),
            size: styles.fonts.body.size * 2,
            font: styles.fonts.body.font,
            bold: true
          })
        );
      }

      if (proj.description) {
        if (detailsRuns.length > 0) detailsRuns.push(new TextRun({ text: ' | ' }));
        detailsRuns.push(
          new TextRun({
            text: sanitizeForATS(proj.description),
            size: styles.fonts.body.size * 2,
            font: styles.fonts.body.font,
            italics: true
          })
        );
      }

      paragraphs.push(
        new Paragraph({
          spacing: { after: 60 },
          children: detailsRuns
        })
      );
    }

    // Bullet points
    proj.bullets.forEach(bullet => {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { after: 40 },
          children: parseHtmlToTextRuns(sanitizeForATS(bullet), styles)
        })
      );
    });
  });

  return paragraphs;
}
