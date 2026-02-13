'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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

const MAX_HISTORY = 20;

export function ReviewTab({ resume, onExport, onEdit }: ReviewTabProps) {
  const [editMode, setEditMode] = useState(false);
  const [showKeywordsDropdown, setShowKeywordsDropdown] = useState(false);
  const [showHumanScoreDropdown, setShowHumanScoreDropdown] = useState(false);

  // Undo history
  const [history, setHistory] = useState<BaseResume[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoing = useRef(false);

  // Scale resume to fit container
  const resumeContainerRef = useRef<HTMLDivElement>(null);
  const [resumeScale, setResumeScale] = useState(1);

  useEffect(() => {
    const container = resumeContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        const resumeWidth = 816; // 8.5in in px
        const scale = Math.min(1, containerWidth / resumeWidth);
        setResumeScale(scale);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const jobDescription = extractKeywordsFromJobDescription(resume.jobDescription);
  const atsScore = analyzeATSCompatibility(resume.content, jobDescription);

  const keywordAnalysis = useMemo(() => {
    return analyzeKeywords(resume.content, jobDescription);
  }, [resume.content, jobDescription]);

  const humanWritingScore = useMemo(() => {
    return analyzeHumanWritingPatterns(resume.content);
  }, [resume.content]);

  const TemplateComponent = getTemplateComponent(resume.template);

  // Push current state to history before a change
  const pushToHistory = useCallback(() => {
    if (isUndoing.current) return;
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(structuredClone(resume.content));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [resume.content, historyIndex]);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (history.length === 0 || historyIndex < 0) return;
    isUndoing.current = true;
    const snapshot = history[historyIndex];
    onEdit({ ...resume, content: snapshot });
    setHistoryIndex(prev => prev - 1);
    setTimeout(() => { isUndoing.current = false; }, 0);
  }, [history, historyIndex, resume, onEdit]);

  // Ctrl+Z keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Only intercept if we're in edit mode and have history
        if (editMode && history.length > 0 && historyIndex >= 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [editMode, history, historyIndex, handleUndo]);

  // Handle field changes from editable template
  const handleFieldChange = useCallback((path: string, value: string | string[]) => {
    pushToHistory();

    const pathParts = path.split('.');

    const updateNestedField = (obj: Record<string, unknown>, parts: string[], val: unknown): Record<string, unknown> => {
      if (parts.length === 1) {
        return { ...obj, [parts[0]]: val };
      }
      const [first, ...rest] = parts;
      const nextObj = obj[first];

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

    onEdit({ ...resume, content: updatedContent });
  }, [resume, onEdit, pushToHistory]);

  // Delete a bullet from experience or projects
  const handleDeleteBullet = useCallback((sectionPath: string, bulletIndex: number) => {
    pushToHistory();
    // sectionPath is like "experience.0.bullets"
    const parts = sectionPath.split('.');
    const sectionType = parts[0] as 'experience' | 'projects';
    const entryIndex = parseInt(parts[1]);

    const section = resume.content[sectionType];
    if (!section) return;
    const entry = section[entryIndex];
    if (!entry || entry.bullets.length <= 1) return;

    const newBullets = entry.bullets.filter((_, i) => i !== bulletIndex);
    const updatedEntry = { ...entry, bullets: newBullets };
    const updatedSection = [...section];
    updatedSection[entryIndex] = updatedEntry;

    onEdit({
      ...resume,
      content: { ...resume.content, [sectionType]: updatedSection }
    });
  }, [resume, onEdit, pushToHistory]);

  // Delete an experience or project entry
  const handleDeleteEntry = useCallback((sectionType: 'experience' | 'projects', entryIndex: number) => {
    pushToHistory();
    const section = resume.content[sectionType];
    if (!section || section.length <= 1) return;

    const updatedSection = section.filter((_, i) => i !== entryIndex);
    onEdit({
      ...resume,
      content: { ...resume.content, [sectionType]: updatedSection }
    });
  }, [resume, onEdit, pushToHistory]);

  const canUndo = historyIndex >= 0 && history.length > 0;

  const scoreColor = atsScore.overall >= 85 ? 'green' : atsScore.overall >= 70 ? 'amber' : 'red';
  const scoreColorClasses = {
    green: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  }[scoreColor];

  return (
    <div className="flex flex-col min-h-0">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Edit controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-3.5 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                editMode
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {editMode ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Editing
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </>
              )}
            </button>

            {editMode && (
              <>
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                    canUndo
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                  }`}
                  title="Undo (Ctrl+Z)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
                  </svg>
                  Undo
                </button>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Ctrl+B bold &middot; Ctrl+Z undo
                </span>
              </>
            )}
          </div>

          {/* Right: ATS badge + Export buttons */}
          <div className="flex items-center gap-3">
            {/* ATS Score Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${scoreColorClasses.bg}`}>
              <span className={`w-2 h-2 rounded-full ${scoreColorClasses.dot}`} />
              <span className={`text-sm font-semibold ${scoreColorClasses.text}`}>
                ATS {atsScore.overall}%
              </span>
            </div>

            {/* Export DOCX */}
            <button
              onClick={() => onExport('docx')}
              className="group px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium text-sm rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center gap-2"
            >
              <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              DOCX
            </button>

            {/* Export PDF */}
            <button
              onClick={() => onExport('pdf')}
              className="group px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium text-sm rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center gap-2"
            >
              <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="flex flex-col xl:flex-row gap-6 pt-6 px-1">
        {/* Left Column: Resume Editor */}
        <div className="xl:w-[65%] min-w-0" ref={resumeContainerRef}>
          {/* Bold Toolbar for Edit Mode */}
          <BoldToolbar enabled={editMode} />

          {/* Resume Preview — scaled to fit column */}
          <div style={{ overflow: 'hidden' }}>
            <div
              id="printable-resume"
              className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${
                editMode
                  ? 'border-blue-300 ring-2 ring-blue-100'
                  : 'border-gray-200'
              }`}
              style={{
                width: '8.5in',
                transformOrigin: 'top left',
                transform: resumeScale < 1 ? `scale(${resumeScale})` : undefined,
                marginBottom: resumeScale < 1 ? `calc((${resumeScale} - 1) * 100%)` : undefined,
              }}
            >
              <TemplateComponent
                resume={resume.content}
                editable={editMode}
                onFieldChange={handleFieldChange}
                onDeleteBullet={handleDeleteBullet}
                onDeleteEntry={handleDeleteEntry}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Analytics Sidebar */}
        <div className="xl:w-[35%] space-y-4">

          {/* ATS Score Dashboard */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">ATS Score</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Automated screening compatibility
                </p>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold ${
                  atsScore.overall >= 85 ? 'text-green-600' :
                  atsScore.overall >= 70 ? 'text-amber-500' :
                  'text-red-500'
                }`}>
                  {atsScore.overall}
                </div>
                <div className={`text-xs font-medium mt-0.5 px-2.5 py-0.5 rounded-full ${
                  atsScore.overall >= 85 ? 'bg-green-100 text-green-700' :
                  atsScore.overall >= 70 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {atsScore.overall >= 85 ? 'Excellent' :
                   atsScore.overall >= 70 ? 'Good' :
                   'Needs Work'}
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Keywords', value: atsScore.keywordMatch, weight: '45%' },
                { label: 'Content', value: atsScore.contentQuality, weight: '20%' },
                { label: 'Format', value: atsScore.formatCompatibility, weight: '20%' },
                { label: 'Sections', value: atsScore.sectionCompleteness, weight: '15%' },
              ].map((metric, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-600">{metric.label}</span>
                    <span className="text-xs text-gray-400">({metric.weight})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          metric.value >= 80 ? 'bg-green-500' :
                          metric.value >= 60 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold min-w-[2.5rem] text-right ${
                      metric.value >= 80 ? 'text-green-600' :
                      metric.value >= 60 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {metric.value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* AI Detection Resistance Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowHumanScoreDropdown(!showHumanScoreDropdown)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200 hover:from-violet-100 hover:to-purple-100 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 text-sm">AI Detection</h3>
                  <p className="text-xs text-slate-600">
                    <span className={`font-medium ${
                      humanWritingScore.overallHumanScore >= 70 ? 'text-green-600' :
                      humanWritingScore.overallHumanScore >= 50 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {humanWritingScore.overallHumanScore}% human-like
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  humanWritingScore.overallHumanScore >= 70 ? 'bg-green-100 text-green-700' :
                  humanWritingScore.overallHumanScore >= 50 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {humanWritingScore.overallHumanScore >= 70 ? 'Natural' :
                   humanWritingScore.overallHumanScore >= 50 ? 'Moderate' :
                   'Needs Work'}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${showHumanScoreDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {showHumanScoreDropdown && (
              <div className="p-4 animate-fade-in-up space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Structure', value: humanWritingScore.structureVariation, target: '60%+' },
                    { label: 'Length Variety', value: humanWritingScore.sentenceLengthVariation, target: '50%+' },
                    { label: 'Non-Formulaic', value: 100 - humanWritingScore.formulaicBulletPercentage, target: '40%+' },
                    { label: 'Clean Language', value: humanWritingScore.aiTellsFound.length === 0 ? 100 : Math.max(0, 100 - humanWritingScore.aiTellsFound.length * 20), target: '100%' },
                  ].map((metric, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-600">{metric.label}</span>
                        <span className="text-[10px] text-gray-400">({metric.target})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              metric.value >= 70 ? 'bg-green-500' :
                              metric.value >= 50 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${metric.value}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold min-w-[2.5rem] text-right ${
                          metric.value >= 70 ? 'text-green-600' :
                          metric.value >= 50 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {metric.value}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {humanWritingScore.aiTellsFound.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <p className="font-medium text-red-700 mb-1.5 text-xs flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      AI-Flagged Phrases
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {humanWritingScore.aiTellsFound.map((tell, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[11px] font-medium border border-red-200">
                          {tell}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {humanWritingScore.formulaicBulletPercentage > 70 && (
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <p className="text-xs text-amber-800">
                      <span className="font-medium">Tip:</span> {humanWritingScore.formulaicBulletPercentage}% of bullets follow the same pattern. Vary structure to sound more natural.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* JD Keywords Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowKeywordsDropdown(!showKeywordsDropdown)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200 hover:from-emerald-100 hover:to-teal-100 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 text-sm">JD Keywords</h3>
                  <p className="text-xs text-slate-600">
                    <span className="text-green-600 font-medium">{keywordAnalysis.matchedKeywords.length}</span>
                    {' keywords matched'}
                  </p>
                </div>
              </div>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${showKeywordsDropdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showKeywordsDropdown && (
              <div className="p-4 animate-fade-in-up">
                <h4 className="font-semibold text-green-700 mb-2 text-xs flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Found ({keywordAnalysis.matchedKeywords.length})
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-green-50 rounded-lg border border-green-100">
                  {keywordAnalysis.matchedKeywords.length > 0 ? (
                    keywordAnalysis.matchedKeywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-[11px] font-medium border border-green-200">
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No keywords matched</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Keyword Optimization Insights */}
          {resume.content.keywordInsights && resume.content.keywordInsights.length > 0 && (
            <KeywordInsights insights={resume.content.keywordInsights} />
          )}
        </div>
      </div>
    </div>
  );
}
