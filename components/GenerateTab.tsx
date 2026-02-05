'use client';

import { useState, useEffect } from 'react';
import { resumeTemplates } from '@/lib/templates';
import { BaseResume } from '@/types/resume';
import { extractKeywordsFromJobDescription } from '@/lib/ats-analyzer';

interface GenerateTabProps {
  jobDescription: string;
  onJobDescriptionChange: (text: string) => void;
  selectedTemplate: string;
  onTemplateChange: (id: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  baseResume?: BaseResume | null;
}

// Calculate ATS score preview using the SAME extraction logic as the actual generation
function calculatePreviewAtsScore(resume: BaseResume, jd: string) {
  const resumeText = [
    resume.summary || '',
    ...resume.skills,
    ...resume.experience.map(e => `${e.title} ${e.company} ${e.bullets.join(' ')}`),
    ...resume.education.map(e => `${e.degree} ${e.institution}`),
    ...(resume.certifications || []),
    ...(resume.coreCompetencies || []),
    // Include skill categories
    ...(resume.skillCategories?.flatMap(cat => cat.skills) || [])
  ].join(' ').toLowerCase();

  // Use the SAME extraction function as the actual generation process
  const jobDesc = extractKeywordsFromJobDescription(jd);
  const allKeywords = [...new Set([...jobDesc.requiredSkills, ...jobDesc.extractedKeywords])];

  const matched: string[] = [];
  const missing: string[] = [];

  // Check the top keywords (prioritize required skills)
  allKeywords.slice(0, 25).forEach(keyword => {
    const keywordLower = keyword.toLowerCase();
    if (resumeText.includes(keywordLower)) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  });

  // Calculate score using the same weighting as the full ATS analyzer
  const totalKeywords = matched.length + missing.length;
  const matchRatio = totalKeywords > 0 ? matched.length / totalKeywords : 0;

  // Weight required skills higher (first portion of keywords are required skills)
  const requiredSkillsCount = Math.min(jobDesc.requiredSkills.length, 15);
  const matchedRequired = matched.filter(m =>
    jobDesc.requiredSkills.slice(0, 15).map(s => s.toLowerCase()).includes(m.toLowerCase())
  ).length;
  const requiredMatchRatio = requiredSkillsCount > 0 ? matchedRequired / requiredSkillsCount : 0;

  // Score components (aligned with ats-analyzer.ts)
  const keywordScore = (matchRatio * 0.4 + requiredMatchRatio * 0.6) * 60; // Up to 60 points for keywords
  const contentScore = Math.min(20, resumeText.length / 150); // Up to 20 points for content
  const structureBonus = (resume.coreCompetencies?.length || 0) >= 5 ? 10 : 5; // Bonus for competencies
  const skillCatBonus = (resume.skillCategories?.length || 0) > 0 ? 5 : 0; // Bonus for categorized skills

  const finalScore = Math.min(100, Math.round(keywordScore + contentScore + structureBonus + skillCatBonus));

  return { score: finalScore, matchedKeywords: matched, missingKeywords: missing };
}

export function GenerateTab({
  jobDescription,
  onJobDescriptionChange,
  selectedTemplate,
  onTemplateChange,
  onGenerate,
  isGenerating,
  baseResume
}: GenerateTabProps) {
  const [previewScore, setPreviewScore] = useState<{ score: number; matchedKeywords: string[]; missingKeywords: string[] } | null>(null);

  // Calculate ATS score when JD changes
  useEffect(() => {
    if (baseResume && jobDescription.trim().length > 50) {
      const score = calculatePreviewAtsScore(baseResume, jobDescription);
      setPreviewScore(score);
    } else {
      setPreviewScore(null);
    }
  }, [baseResume, jobDescription]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Generate Tailored Resume</h2>
        <p className="text-slate-600">
          Paste the job description below to see your current ATS score and generate an optimized resume.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-lg font-semibold text-slate-900">
          Job Description
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          placeholder="Paste the complete job description here to see your ATS score..."
          rows={10}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-800 placeholder:text-slate-400 hover:border-blue-300 shadow-sm resize-y"
        />
        <p className="text-sm text-slate-500">
          {jobDescription.length > 0 && jobDescription.length < 50
            ? `${jobDescription.length} characters - add more to see ATS score`
            : 'Include the full job posting for best results'
          }
        </p>
      </div>

      {/* ATS Score Preview */}
      {previewScore && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Current ATS Score
            </h3>
            <div className={`text-2xl font-bold ${previewScore.score >= 70 ? 'text-green-600' : previewScore.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {previewScore.score}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-green-700 font-medium mb-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Keywords Found ({previewScore.matchedKeywords.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {previewScore.matchedKeywords.slice(0, 6).map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs">{kw}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-amber-700 font-medium mb-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Missing Keywords ({previewScore.missingKeywords.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {previewScore.missingKeywords.slice(0, 5).map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs">{kw}</span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            Generate your tailored resume to improve this score. Our AI will optimize your content for better ATS compatibility.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <label className="block text-lg font-semibold text-gray-900">
          Resume Template
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resumeTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onTemplateChange(template.id)}
              className={`group p-5 border-2 rounded-2xl text-left transition-smooth hover:-translate-y-1 ${selectedTemplate === template.id
                  ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg shadow-blue-100'
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-lg hover:bg-slate-50'
                }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className={`font-semibold transition-smooth ${selectedTemplate === template.id ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-600'}`}>
                  {template.name}
                </h3>
                {selectedTemplate === template.id && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center animate-scale-in">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-600 mb-2">{template.description}</p>
              <p className="text-xs text-slate-500">{template.preview}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-slate-100">
        <button
          onClick={onGenerate}
          disabled={!jobDescription.trim() || isGenerating}
          className={`group px-8 py-3.5 rounded-xl font-semibold transition-smooth shadow-lg flex items-center gap-2 ${isGenerating
              ? 'bg-slate-400 cursor-not-allowed shadow-none'
              : jobDescription.trim()
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.98] animate-pulse-glow'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating Resume...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 group-hover:rotate-12 transition-smooth" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Tailored Resume
            </>
          )}
        </button>
      </div>
    </div>
  );
}
