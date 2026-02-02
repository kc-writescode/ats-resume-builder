'use client';

import { useState, useCallback } from 'react';
import { GeneratedResume, BaseResume } from '@/types/resume';
import { analyzeATSCompatibility, extractKeywordsFromJobDescription } from '@/lib/ats-analyzer';
import { getTemplateComponent } from './templates';
import { BoldToolbar } from './BoldToolbar';

interface ReviewTabProps {
  resume: GeneratedResume;
  onExport: (format: 'pdf' | 'docx') => void;
  onEdit: (updated: GeneratedResume) => void;
}

export function ReviewTab({ resume, onExport, onEdit }: ReviewTabProps) {
  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const jobDescription = extractKeywordsFromJobDescription(resume.jobDescription);
  const atsScore = analyzeATSCompatibility(resume.content, jobDescription);

  // Get the template component
  const TemplateComponent = getTemplateComponent(resume.template);

  // Handle field changes from editable template
  const handleFieldChange = useCallback((path: string, value: string | string[]) => {
    const pathParts = path.split('.');

    const updateNestedField = (obj: Record<string, unknown>, parts: string[], val: unknown): Record<string, unknown> => {
      if (parts.length === 1) {
        return { ...obj, [parts[0]]: val };
      }
      const [first, ...rest] = parts;
      const nextObj = obj[first];

      // Handle array indices
      if (Array.isArray(obj[first])) {
        const arr = [...(obj[first] as unknown[])];
        const index = parseInt(rest[0]);
        if (rest.length === 1) {
          arr[index] = val;
        } else {
          arr[index] = updateNestedField(arr[index] as Record<string, unknown>, rest.slice(1), val);
        }
        return { ...obj, [first]: arr };
      }

      return {
        ...obj,
        [first]: updateNestedField(nextObj as Record<string, unknown>, rest, val)
      };
    };

    const updatedContent = updateNestedField(resume.content as unknown as Record<string, unknown>, pathParts, value) as unknown as BaseResume;

    onEdit({
      ...resume,
      content: updatedContent
    });
    setHasChanges(true);
  }, [resume, onEdit]);

  return (
    <div className="space-y-8">
      {/* Header with Edit Toggle */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Resume Preview</h2>
          <p className="text-gray-600">
            {resume.jobTitle} at {resume.companyName}
          </p>
          {editMode && (
            <p className="text-sm text-blue-600 mt-1">
              Click any text to edit. Select text and press <strong>Ctrl+B</strong> to bold. Changes are saved automatically.
            </p>
          )}
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
            editMode
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {editMode ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Editing Enabled
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Enable Editing
            </>
          )}
        </button>
      </div>

      {/* ATS Score Dashboard */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">ATS Compatibility Score</h3>
          <div className={`text-4xl font-bold ${
            atsScore.overall >= 85 ? 'text-green-600' :
            atsScore.overall >= 70 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {atsScore.overall}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Keyword Match</p>
            <p className="text-xl font-semibold">{atsScore.keywordMatch}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Format</p>
            <p className="text-xl font-semibold">{atsScore.formatCompatibility}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Completeness</p>
            <p className="text-xl font-semibold">{atsScore.sectionCompleteness}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Quality</p>
            <p className="text-xl font-semibold">{atsScore.contentQuality}%</p>
          </div>
        </div>

        {atsScore.suggestions.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-2">Suggestions:</p>
            <ul className="space-y-1">
              {atsScore.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-blue-600">-</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Bold Toolbar for Edit Mode */}
      <BoldToolbar enabled={editMode} />

      {/* Resume Preview with Template */}
      <div
        id="printable-resume"
        className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
        style={{ width: '100%', maxWidth: '8.5in', margin: '0 auto' }}
      >
        <TemplateComponent
          resume={resume.content}
          editable={editMode}
          onFieldChange={handleFieldChange}
        />
      </div>

      {/* Export Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div>
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Unsaved changes will be included in exports
            </span>
          )}
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => onExport('docx')}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download DOCX
          </button>
          <button
            onClick={() => onExport('pdf')}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
