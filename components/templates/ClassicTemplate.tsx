'use client';

import { BaseResume } from '@/types/resume';
import { getTemplate } from '@/lib/templates';

interface TemplateProps {
  resume: BaseResume;
  editable?: boolean;
  onFieldChange?: (path: string, value: string | string[]) => void;
  templateId?: string;
}

export function ClassicTemplate({ resume, editable, onFieldChange, templateId = 'classic' }: TemplateProps) {
  const template = getTemplate(templateId);

  const handleChange = (path: string, value: string) => {
    if (editable && onFieldChange) {
      onFieldChange(path, value);
    }
  };

  // For rich text fields (bullets, summary) that may contain HTML
  const editableHtmlProps = (path: string) =>
    editable ? {
      contentEditable: true,
      suppressContentEditableWarning: true,
      onBlur: (e: React.FocusEvent<HTMLElement>) => handleChange(path, e.currentTarget.innerHTML || ''),
    } : {};

  // For plain text fields
  const editableProps = (path: string) =>
    editable ? {
      contentEditable: true,
      suppressContentEditableWarning: true,
      onBlur: (e: React.FocusEvent<HTMLElement>) => handleChange(path, e.currentTarget.textContent || ''),
    } : {};

  const editableStyle = editable ? { outline: 'none', cursor: 'text' } : {};

  // Section header style - full width underline
  const sectionHeaderStyle = {
    fontFamily: template.fonts.heading,
    fontSize: '10pt',
    fontWeight: 'bold' as const,
    color: template.colors.primary,
    textTransform: 'uppercase' as const,
    borderBottom: `1px solid ${template.colors.primary}`,
    paddingBottom: '6pt',
    marginBottom: '3pt',
  };

  // Use skill categories if available, otherwise use flat skills
  const skillCategories = resume.skillCategories && resume.skillCategories.length > 0
    ? resume.skillCategories
    : null;

  return (
    <div
      id="resume-content"
      style={{
        fontFamily: template.fonts.body,
        fontSize: '10pt',
        lineHeight: '1.15',
        color: template.colors.secondary,
        backgroundColor: '#ffffff',
        padding: `${template.margins.top * 72}pt ${template.margins.right * 72}pt ${template.margins.bottom * 72}pt ${template.margins.left * 72}pt`,
        width: '8.5in',
        boxSizing: 'border-box',
      }}
    >
      {/* Header - Centered */}
      <div style={{ textAlign: 'center', marginBottom: '4pt' }}>
        <h1
          style={{
            fontFamily: template.fonts.heading,
            fontSize: '14pt',
            fontWeight: 'bold',
            color: template.colors.primary,
            marginBottom: '2pt',
            ...editableStyle,
          }}
          {...editableProps('personal.name')}
        >
          {resume.personal.name}
        </h1>
        <p style={{ fontSize: '9pt', color: template.colors.secondary }}>
          <span style={editableStyle} {...editableProps('personal.location')}>{resume.personal.location}</span>
          {' | '}
          <span style={editableStyle} {...editableProps('personal.phone')}>{resume.personal.phone}</span>
          {' | '}
          <span style={editableStyle} {...editableProps('personal.email')}>{resume.personal.email}</span>
          {resume.personal.linkedin && (
            <>
              {' | '}
              <span style={editableStyle} {...editableProps('personal.linkedin')}>{resume.personal.linkedin}</span>
            </>
          )}
        </p>
      </div>

      <hr style={{ border: 'none', borderTop: `1px solid ${template.colors.primary}`, margin: '8pt 0' }} />

      {/* Professional Summary */}
      {resume.summary && (
        <div style={{ marginBottom: '6pt' }}>
          <h2 style={sectionHeaderStyle}>Professional Summary</h2>
          <p
            style={{ textAlign: 'justify', ...editableStyle }}
            {...editableHtmlProps('summary')}
            dangerouslySetInnerHTML={{ __html: resume.summary }}
          />
        </div>
      )}

      {/* Core Competencies - single line pipe-separated */}
      {resume.coreCompetencies && (Array.isArray(resume.coreCompetencies) ? resume.coreCompetencies.length > 0 : resume.coreCompetencies) && (
        <div style={{ marginBottom: '6pt' }}>
          <h2 style={sectionHeaderStyle}>Core Competencies</h2>
          <p
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: resume.coreCompetencies && Array.isArray(resume.coreCompetencies) && resume.coreCompetencies.length > 8 ? '9pt' : '10pt',
              ...editableStyle
            }}
            {...editableProps('coreCompetencies')}
          >
            {Array.isArray(resume.coreCompetencies)
              ? resume.coreCompetencies.join(' | ')
              : resume.coreCompetencies}
          </p>
        </div>
      )}

      {/* Technical Skills - ATS optimized categorized format */}
      <div style={{ marginBottom: '6pt' }}>
        <h2 style={sectionHeaderStyle}>Technical Skills</h2>
        {skillCategories ? (
          <div>
            {skillCategories.map((cat, idx) => (
              <p key={idx} style={{ marginBottom: '1pt', textAlign: 'justify' }}>
                <strong
                  style={editableStyle}
                  {...editableProps(`skillCategories.${idx}.category`)}
                >
                  {cat.category}:
                </strong>{' '}
                <span
                  style={editableStyle}
                  {...editableProps(`skillCategories.${idx}.skills`)}
                >
                  {cat.skills.join(', ')}
                </span>
              </p>
            ))}
          </div>
        ) : (
          <p
            style={{ textAlign: 'justify', ...editableStyle }}
            {...editableProps('skills')}
          >
            {resume.skills.join(', ')}
          </p>
        )}
      </div>

      {/* Professional Experience */}
      <div style={{ marginBottom: '6pt' }}>
        <h2 style={sectionHeaderStyle}>Professional Experience</h2>
        {resume.experience.map((exp, expIndex) => (
          <div key={exp.id} style={{ marginBottom: '6pt' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span
                  style={{ fontWeight: 'bold', color: template.colors.primary, ...editableStyle }}
                  {...editableProps(`experience.${expIndex}.title`)}
                >
                  {exp.title}
                </span>
                <span> | </span>
                <span
                  style={editableStyle}
                  {...editableProps(`experience.${expIndex}.company`)}
                >
                  {exp.company}
                </span>
              </div>
              <div style={{ fontSize: '9pt', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                <span style={editableStyle} {...editableProps(`experience.${expIndex}.startDate`)}>
                  {exp.startDate}
                </span>
                {' - '}
                <span style={editableStyle} {...editableProps(`experience.${expIndex}.endDate`)}>
                  {exp.endDate}
                </span>
              </div>
            </div>
            {(exp.location || editable) && (
              <p
                style={{ fontSize: '9pt', fontStyle: 'italic', marginBottom: '2pt', color: exp.location ? undefined : '#999', ...editableStyle }}
                {...editableProps(`experience.${expIndex}.location`)}
              >
                {exp.location || (editable ? 'Add location' : '')}
              </p>
            )}
            <ul style={{ marginLeft: '14pt', marginTop: '1pt', paddingLeft: '0', listStyleType: 'disc' }}>
              {exp.bullets.map((bullet, bulletIndex) => (
                <li
                  key={bulletIndex}
                  style={{ marginBottom: '1pt', textAlign: 'justify', ...editableStyle }}
                  {...editableHtmlProps(`experience.${expIndex}.bullets.${bulletIndex}`)}
                  dangerouslySetInnerHTML={{ __html: bullet }}
                />
              ))}
            </ul>
            {editable && (
              <button
                onClick={() => onFieldChange?.(`experience.${expIndex}.bullets`, [...exp.bullets, 'New achievement...'])}
                style={{ color: '#2563eb', fontSize: '9pt', marginTop: '2pt', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                + Add bullet
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Education */}
      <div style={{ marginBottom: '6pt' }}>
        <h2 style={sectionHeaderStyle}>Education</h2>
        {resume.education.map((edu, eduIndex) => (
          <div key={edu.id} style={{ marginBottom: '4pt' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3pt' }}>
              <span
                style={{ fontWeight: 'bold', color: template.colors.primary, ...editableStyle }}
                {...editableProps(`education.${eduIndex}.degree`)}
              >
                {edu.degree}
              </span>
              {(edu.graduationDate || editable) && (
                <span
                  style={{ fontSize: '9pt', fontWeight: 'bold', color: edu.graduationDate ? undefined : '#999', ...editableStyle }}
                  {...editableProps(`education.${eduIndex}.graduationDate`)}
                >
                  {edu.graduationDate || (editable ? 'Add year' : '')}
                </span>
              )}
            </div>
            <p>
              <span style={editableStyle} {...editableProps(`education.${eduIndex}.institution`)}>
                {edu.institution}
              </span>
              {edu.gpa && (
                <>
                  {' | GPA: '}
                  <span style={editableStyle} {...editableProps(`education.${eduIndex}.gpa`)}>
                    {edu.gpa}
                  </span>
                </>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Certifications */}
      {resume.certifications.length > 0 && (
        <div>
          <h2 style={sectionHeaderStyle}>Certifications</h2>
          <ul style={{ marginLeft: '14pt', listStyleType: 'disc' }}>
            {resume.certifications.map((cert, index) => (
              <li
                key={index}
                style={{ marginBottom: '1pt', ...editableStyle }}
                {...editableProps(`certifications.${index}`)}
              >
                {cert}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
