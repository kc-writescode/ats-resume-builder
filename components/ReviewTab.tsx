'use client';

import { useState, useCallback, useMemo } from 'react';
import { GeneratedResume, BaseResume } from '@/types/resume';
import { analyzeATSCompatibility, extractKeywordsFromJobDescription, analyzeKeywords, analyzeHumanWritingPatterns } from '@/lib/ats-analyzer';
import { getTemplateComponent } from './templates';
import { BoldToolbar } from './BoldToolbar';
import { KeywordInsights } from './KeywordInsights';

interface ReviewTabProps {
  resume: GeneratedResume;
  onExport: (format: 'pdf' | 'docx') => void;
  onEdit: (updated: GeneratedResume) => void;
}

export function ReviewTab({ resume, onExport, onEdit }: ReviewTabProps) {
  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showKeywordsDropdown, setShowKeywordsDropdown] = useState(false);
  const [showHumanScoreDropdown, setShowHumanScoreDropdown] = useState(false);

  const jobDescription = extractKeywordsFromJobDescription(resume.jobDescription);
  const atsScore = analyzeATSCompatibility(resume.content, jobDescription);

  // Analyze which JD keywords are in the resume
  const keywordAnalysis = useMemo(() => {
    return analyzeKeywords(resume.content, jobDescription);
  }, [resume.content, jobDescription]);

  // Analyze human writing patterns for AI detection resistance
  const humanWritingScore = useMemo(() => {
    return analyzeHumanWritingPatterns(resume.content);
  }, [resume.content]);

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
          className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${editMode
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">ATS Compatibility Score</h3>
            <p className="text-sm text-gray-600 mt-1">
              Higher scores increase your chances of passing automated screening
            </p>
          </div>
          <div className="text-center">
            <div className={`text-5xl font-bold ${atsScore.overall >= 85 ? 'text-green-600' :
                atsScore.overall >= 70 ? 'text-amber-500' :
                  'text-red-500'
              }`}>
              {atsScore.overall}
            </div>
            <div className={`text-xs font-medium mt-1 px-3 py-1 rounded-full ${atsScore.overall >= 85 ? 'bg-green-100 text-green-700' :
                atsScore.overall >= 70 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
              }`}>
              {atsScore.overall >= 85 ? 'Excellent' :
                atsScore.overall >= 70 ? 'Good' :
                  'Needs Improvement'}
            </div>
          </div>
        </div>

        {/* Score Breakdown with Progress Bars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Keyword Match', value: atsScore.keywordMatch, icon: '🎯', weight: '45%' },
            { label: 'Content Quality', value: atsScore.contentQuality, icon: '📝', weight: '20%' },
            { label: 'Format', value: atsScore.formatCompatibility, icon: '✅', weight: '20%' },
            { label: 'Completeness', value: atsScore.sectionCompleteness, icon: '📋', weight: '15%' },
          ].map((metric, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-smooth hover:-translate-y-1 animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <span>{metric.icon}</span>
                  {metric.label}
                </span>
                <span className="text-xs text-gray-400">({metric.weight})</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${metric.value >= 80 ? 'bg-green-500' :
                        metric.value >= 60 ? 'bg-amber-500' :
                          'bg-red-500'
                      }`}
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
                <span className={`text-lg font-bold min-w-[3rem] text-right ${metric.value >= 80 ? 'text-green-600' :
                    metric.value >= 60 ? 'text-amber-600' :
                      'text-red-600'
                  }`}>
                  {metric.value}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {atsScore.suggestions.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Quick Wins to Improve Your Score:
            </p>
            <ul className="space-y-2">
              {atsScore.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2 bg-slate-50 rounded-lg p-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* AI Detection Resistance Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowHumanScoreDropdown(!showHumanScoreDropdown)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200 hover:from-violet-100 hover:to-purple-100 transition-smooth"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">AI Detection Resistance</h3>
              <p className="text-sm text-slate-600">
                <span className={`font-medium ${
                  humanWritingScore.overallHumanScore >= 70 ? 'text-green-600' :
                  humanWritingScore.overallHumanScore >= 50 ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {humanWritingScore.overallHumanScore}% human-like
                </span>
                {' - how natural your resume reads to recruiters'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              humanWritingScore.overallHumanScore >= 70 ? 'bg-green-100 text-green-700' :
              humanWritingScore.overallHumanScore >= 50 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {humanWritingScore.overallHumanScore >= 70 ? 'Natural' :
               humanWritingScore.overallHumanScore >= 50 ? 'Moderate' :
               'Needs Work'}
            </span>
            <svg
              className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${showHumanScoreDropdown ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {showHumanScoreDropdown && (
          <div className="p-6 animate-fade-in-up space-y-4">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Structure Variety',
                  value: humanWritingScore.structureVariation,
                  target: '60%+',
                  description: 'Bullet opening patterns vary'
                },
                {
                  label: 'Length Variety',
                  value: humanWritingScore.sentenceLengthVariation,
                  target: '50%+',
                  description: 'Mix of short and long bullets'
                },
                {
                  label: 'Non-Formulaic',
                  value: 100 - humanWritingScore.formulaicBulletPercentage,
                  target: '40%+',
                  description: 'Bullets that break the [Verb]+[Result] pattern'
                },
                {
                  label: 'Clean Language',
                  value: humanWritingScore.aiTellsFound.length === 0 ? 100
                    : Math.max(0, 100 - humanWritingScore.aiTellsFound.length * 20),
                  target: '100%',
                  description: 'No AI-flagged phrases'
                },
              ].map((metric, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-lg transition-smooth hover:-translate-y-1"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">{metric.label}</span>
                    <span className="text-xs text-gray-400">({metric.target})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          metric.value >= 70 ? 'bg-green-500' :
                          metric.value >= 50 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                    <span className={`text-lg font-bold min-w-[3rem] text-right ${
                      metric.value >= 70 ? 'text-green-600' :
                      metric.value >= 50 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {metric.value}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{metric.description}</p>
                </div>
              ))}
            </div>

            {/* AI Tells Found */}
            {humanWritingScore.aiTellsFound.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="font-medium text-red-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  AI-Flagged Phrases Found
                </p>
                <p className="text-sm text-red-600 mb-3">These phrases are commonly flagged by recruiters as AI-generated. Replace them with natural alternatives.</p>
                <div className="flex flex-wrap gap-2">
                  {humanWritingScore.aiTellsFound.map((tell, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-medium border border-red-200"
                    >
                      {tell}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {humanWritingScore.formulaicBulletPercentage > 70 && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Tip:</span> {humanWritingScore.formulaicBulletPercentage}% of your bullets follow the same &quot;[Verb] ... resulting in [metric]&quot; pattern.
                  Try varying structure - lead with context, results, or use compound achievements to sound more natural.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* JD Keywords Analysis Dropdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowKeywordsDropdown(!showKeywordsDropdown)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200 hover:from-emerald-100 hover:to-teal-100 transition-smooth"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">JD Keywords Integrated</h3>
              <p className="text-sm text-slate-600">
                <span className="text-green-600 font-medium">{keywordAnalysis.matchedKeywords.length} keywords</span>
                {' from the job description found in your resume'}
              </p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${showKeywordsDropdown ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showKeywordsDropdown && (
          <div className="p-6 animate-fade-in-up">
            {/* Keywords Found in Resume */}
            <div>
              <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Keywords Found in Resume ({keywordAnalysis.matchedKeywords.length})
              </h4>
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-3 bg-green-50 rounded-xl border border-green-100">
                {keywordAnalysis.matchedKeywords.length > 0 ? (
                  keywordAnalysis.matchedKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-medium border border-green-200 hover:bg-green-200 transition-smooth cursor-default"
                    >
                      {kw}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">No keywords matched</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyword Optimization Insights */}
      {resume.content.keywordInsights && resume.content.keywordInsights.length > 0 && (
        <KeywordInsights insights={resume.content.keywordInsights} />
      )}

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
            className="group px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-smooth shadow-lg shadow-green-600/25 hover:shadow-green-600/40 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
          >
            <svg className="w-5 h-5 group-hover:translate-y-0.5 transition-smooth" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download DOCX
          </button>
          <button
            onClick={() => onExport('pdf')}
            className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-smooth shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
          >
            <svg className="w-5 h-5 group-hover:translate-y-0.5 transition-smooth" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
