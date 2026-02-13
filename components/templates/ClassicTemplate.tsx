'use client';

import { BaseResume } from '@/types/resume';
import { getTemplate } from '@/lib/templates';

interface TemplateProps {
  resume: BaseResume;
  editable?: boolean;
  onFieldChange?: (path: string, value: string | string[]) => void;
  templateId?: string;
  onDeleteBullet?: (sectionPath: string, bulletIndex: number) => void;
  onDeleteEntry?: (sectionType: 'experience' | 'projects', entryIndex: number) => void;
}

export function ClassicTemplate({ resume, editable, onFieldChange, templateId = 'classic', onDeleteBullet, onDeleteEntry }: TemplateProps) {
  const template = getTemplate(templateId);

  // Use skill categories if available, otherwise use flat skills
  const skillCategories = resume.skillCategories && resume.skillCategories.length > 0
    ? resume.skillCategories.filter(cat => cat.skills && cat.skills.length > 0)
    : null;

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
  const ec = editable ? 'editable-field' : '';

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
      <div style={{ textAlign: 'center', marginBottom: '8pt' }}>
        <h1
          className={ec}
          style={{
            fontFamily: template.fonts.heading,
            fontSize: '16pt',
            fontWeight: 'bold',
            color: template.colors.primary,
            marginBottom: '4pt',
            textTransform: 'uppercase',
            letterSpacing: '1pt',
            ...editableStyle,
          }}
          {...editableProps('personal.name')}
        >
          {resume.personal.name}
        </h1>
        <div style={{
          fontSize: '9pt',
          color: template.colors.secondary,
          display: 'flex',
          justifyContent: 'center',
          gap: '12pt',
          flexWrap: 'wrap'
        }}>
          <span className={ec} style={editableStyle} {...editableProps('personal.location')}>{resume.personal.location}</span>
          <span style={{ color: template.colors.primary }}>•</span>
          <span className={ec} style={editableStyle} {...editableProps('personal.phone')}>{resume.personal.phone}</span>
          <span style={{ color: template.colors.primary }}>•</span>
          <span className={ec} style={editableStyle} {...editableProps('personal.email')}>{resume.personal.email}</span>
          {resume.personal.linkedin && (
            <>
              <span style={{ color: template.colors.primary }}>•</span>
              <span className={ec} style={editableStyle} {...editableProps('personal.linkedin')}>{resume.personal.linkedin}</span>
            </>
          )}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: `1px solid ${template.colors.primary}`, margin: '4pt 0 8pt 0' }} />

      {/* Professional Summary */}
      {resume.summary && (
        <div style={{ marginBottom: '8pt' }}>
          <h2 style={sectionHeaderStyle}>Professional Summary</h2>
          <div
            className={ec}
            style={{
              textAlign: 'justify',
              lineHeight: '1.3',
              ...editableStyle
            }}
            {...editableHtmlProps('summary')}
            dangerouslySetInnerHTML={{ __html: resume.summary }}
          />
        </div>
      )}

      {/* Core Competencies - single line pipe-separated */}
      {resume.coreCompetencies && (Array.isArray(resume.coreCompetencies) ? resume.coreCompetencies.length > 0 : resume.coreCompetencies) && (
        <div style={{ marginBottom: '8pt' }}>
          <h2 style={sectionHeaderStyle}>Core Competencies</h2>
          <p
            className={ec}
            style={{
              fontSize: '10pt',
              fontWeight: '500',
              textAlign: 'center',
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
      <div style={{ marginBottom: '8pt' }}>
        <h2 style={sectionHeaderStyle}>Technical Skills</h2>
        {skillCategories && skillCategories.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <tbody>
              {skillCategories.map((cat, idx) => (
                <tr key={idx} style={{ verticalAlign: 'baseline' }}>
                  <td style={{ width: '140pt', padding: '1pt 0' }}>
                    <strong
                      className={ec}
                      style={{
                        fontFamily: template.fonts.heading,
                        fontSize: '9pt',
                        display: 'block',
                        ...editableStyle
                      }}
                      {...editableProps(`skillCategories.${idx}.category`)}
                    >
                      {cat.category}:
                    </strong>
                  </td>
                  <td style={{ padding: '1pt 0 1pt 8pt' }}>
                    <span
                      className={ec}
                      style={{
                        fontSize: '9pt',
                        display: 'block',
                        textAlign: 'justify',
                        ...editableStyle
                      }}
                      {...editableProps(`skillCategories.${idx}.skills`)}
                    >
                      {cat.skills.join(', ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p
            className={ec}
            style={{ textAlign: 'justify', fontSize: '9pt', ...editableStyle }}
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
          <div key={exp.id} className={editable ? 'group/entry relative' : ''} style={{ marginBottom: '6pt' }}>
            {/* Delete entry button */}
            {editable && resume.experience.length > 1 && (
              <button
                onClick={() => onDeleteEntry?.('experience', expIndex)}
                className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover/entry:opacity-100 transition-fast z-10 border border-red-200 hover:border-red-500"
                style={{ fontSize: '10px', lineHeight: 1 }}
                title="Delete this entry"
              >
                &#10005;
              </button>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span
                  className={ec}
                  style={{ fontWeight: 'bold', color: template.colors.primary, ...editableStyle }}
                  {...editableProps(`experience.${expIndex}.title`)}
                >
                  {exp.title}
                </span>
                <span> | </span>
                <span
                  className={ec}
                  style={editableStyle}
                  {...editableProps(`experience.${expIndex}.company`)}
                >
                  {exp.company}
                </span>
              </div>
              <div style={{ fontSize: '9pt', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                <span className={ec} style={editableStyle} {...editableProps(`experience.${expIndex}.startDate`)}>
                  {exp.startDate}
                </span>
                {' - '}
                <span className={ec} style={editableStyle} {...editableProps(`experience.${expIndex}.endDate`)}>
                  {exp.endDate}
                </span>
              </div>
            </div>
            {(exp.location || editable) && (
              <p
                className={ec}
                style={{ fontSize: '9pt', fontStyle: 'italic', marginBottom: '2pt', color: exp.location ? undefined : '#999', ...editableStyle }}
                {...editableProps(`experience.${expIndex}.location`)}
              >
                {exp.location || (editable ? 'Add location' : '')}
              </p>
            )}
            <ul style={{ marginLeft: editable ? '0' : '14pt', marginTop: '1pt', paddingLeft: editable ? '0' : '0', listStyleType: editable ? 'none' : 'disc' }}>
              {exp.bullets.map((bullet, bulletIndex) => (
                <li
                  key={`${exp.id}-bullet-${bulletIndex}`}
                  className={editable ? 'group/bullet' : ''}
                  style={{ marginBottom: '1pt', textAlign: 'justify', listStyleType: editable ? 'none' : undefined }}
                >
                  {editable ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                      <span style={{ userSelect: 'none', flexShrink: 0, marginTop: '1px', marginLeft: '14pt' }}>&#8226;</span>
                      <div
                        className={ec}
                        style={{ flex: 1, ...editableStyle }}
                        {...editableHtmlProps(`experience.${expIndex}.bullets.${bulletIndex}`)}
                        dangerouslySetInnerHTML={{ __html: bullet }}
                      />
                      {exp.bullets.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBullet?.(`experience.${expIndex}.bullets`, bulletIndex);
                          }}
                          className="flex-shrink-0 w-4 h-4 rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover/bullet:opacity-100 transition-fast"
                          style={{ fontSize: '9px', lineHeight: 1, marginTop: '2px' }}
                          title="Delete bullet"
                        >
                          &#10005;
                        </button>
                      )}
                    </div>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: bullet }} />
                  )}
                </li>
              ))}
            </ul>
            {editable && (
              <button
                onClick={() => onFieldChange?.(`experience.${expIndex}.bullets`, [...exp.bullets, 'New achievement...'])}
                style={{ color: '#2563eb', fontSize: '9pt', marginTop: '2pt', marginLeft: '14pt', background: 'none', border: 'none', cursor: 'pointer' }}
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
                className={ec}
                style={{ fontWeight: 'bold', color: template.colors.primary, ...editableStyle }}
                {...editableProps(`education.${eduIndex}.degree`)}
              >
                {edu.degree}
              </span>
              {(edu.graduationDate || editable) && (
                <span
                  className={ec}
                  style={{ fontSize: '9pt', fontWeight: 'bold', color: edu.graduationDate ? undefined : '#999', ...editableStyle }}
                  {...editableProps(`education.${eduIndex}.graduationDate`)}
                >
                  {edu.graduationDate || (editable ? 'Add year' : '')}
                </span>
              )}
            </div>
            <p>
              <span className={ec} style={editableStyle} {...editableProps(`education.${eduIndex}.institution`)}>
                {edu.institution}
              </span>
              {edu.gpa && (
                <>
                  {' | GPA: '}
                  <span className={ec} style={editableStyle} {...editableProps(`education.${eduIndex}.gpa`)}>
                    {edu.gpa}
                  </span>
                </>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Projects */}
      {resume.projects && resume.projects.length > 0 && (
        <div style={{ marginBottom: '6pt' }}>
          <h2 style={sectionHeaderStyle}>Projects</h2>
          {resume.projects.map((proj, projIndex) => (
            <div key={proj.id} className={editable ? 'group/entry relative' : ''} style={{ marginBottom: '6pt' }}>
              {/* Delete entry button */}
              {editable && resume.projects!.length > 1 && (
                <button
                  onClick={() => onDeleteEntry?.('projects', projIndex)}
                  className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover/entry:opacity-100 transition-fast z-10 border border-red-200 hover:border-red-500"
                  style={{ fontSize: '10px', lineHeight: 1 }}
                  title="Delete this entry"
                >
                  &#10005;
                </button>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span
                    className={ec}
                    style={{ fontWeight: 'bold', color: template.colors.primary, ...editableStyle }}
                    {...editableProps(`projects.${projIndex}.name`)}
                  >
                    {proj.name}
                  </span>
                  {proj.link && (
                    <>
                      <span> | </span>
                      <span
                        className={ec}
                        style={{ fontSize: '9pt', ...editableStyle }}
                        {...editableProps(`projects.${projIndex}.link`)}
                      >
                        {proj.link}
                      </span>
                    </>
                  )}
                </div>
                {(proj.startDate || proj.endDate) && (
                  <div style={{ fontSize: '9pt', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    <span className={ec} style={editableStyle} {...editableProps(`projects.${projIndex}.startDate`)}>
                      {proj.startDate}
                    </span>
                    {proj.startDate && proj.endDate && ' - '}
                    <span className={ec} style={editableStyle} {...editableProps(`projects.${projIndex}.endDate`)}>
                      {proj.endDate}
                    </span>
                  </div>
                )}
              </div>
              <p
                className={ec}
                style={{ fontSize: '9pt', fontStyle: 'italic', marginBottom: '2pt', ...editableStyle }}
                {...editableProps(`projects.${projIndex}.description`)}
              >
                {proj.description}
              </p>
              <ul style={{ marginLeft: editable ? '0' : '14pt', marginTop: '1pt', paddingLeft: editable ? '0' : '0', listStyleType: editable ? 'none' : 'disc' }}>
                {proj.bullets.map((bullet, bulletIndex) => (
                  <li
                    key={`${proj.id}-bullet-${bulletIndex}`}
                    className={editable ? 'group/bullet' : ''}
                    style={{ marginBottom: '1pt', textAlign: 'justify', listStyleType: editable ? 'none' : undefined }}
                  >
                    {editable ? (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                        <span style={{ userSelect: 'none', flexShrink: 0, marginTop: '1px', marginLeft: '14pt' }}>&#8226;</span>
                        <div
                          className={ec}
                          style={{ flex: 1, ...editableStyle }}
                          {...editableHtmlProps(`projects.${projIndex}.bullets.${bulletIndex}`)}
                          dangerouslySetInnerHTML={{ __html: bullet }}
                        />
                        {proj.bullets.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteBullet?.(`projects.${projIndex}.bullets`, bulletIndex);
                            }}
                            className="flex-shrink-0 w-4 h-4 rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover/bullet:opacity-100 transition-fast"
                            style={{ fontSize: '9px', lineHeight: 1, marginTop: '2px' }}
                            title="Delete bullet"
                          >
                            &#10005;
                          </button>
                        )}
                      </div>
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: bullet }} />
                    )}
                  </li>
                ))}
              </ul>
              {editable && (
                <button
                  onClick={() => onFieldChange?.(`projects.${projIndex}.bullets`, [...proj.bullets, 'New project highlight...'])}
                  style={{ color: '#2563eb', fontSize: '9pt', marginTop: '2pt', marginLeft: '14pt', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  + Add bullet
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {resume.certifications.length > 0 && (
        <div>
          <h2 style={sectionHeaderStyle}>Certifications</h2>
          <ul style={{ marginLeft: '14pt', listStyleType: 'disc' }}>
            {resume.certifications.map((cert, index) => (
              <li
                key={index}
                className={ec}
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
