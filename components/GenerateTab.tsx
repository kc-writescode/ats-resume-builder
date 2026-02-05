'use client';

import { resumeTemplates } from '@/lib/templates';

interface GenerateTabProps {
  jobDescription: string;
  onJobDescriptionChange: (text: string) => void;
  selectedTemplate: string;
  onTemplateChange: (id: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function GenerateTab({
  jobDescription,
  onJobDescriptionChange,
  selectedTemplate,
  onTemplateChange,
  onGenerate,
  isGenerating
}: GenerateTabProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Generate Tailored Resume</h2>
        <p className="text-slate-600">
          Paste the job description below to generate an ATS-optimized resume tailored to this specific role.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-lg font-semibold text-slate-900">
          Job Description
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          placeholder="Paste the complete job description here..."
          rows={12}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-800 placeholder:text-slate-400 hover:border-blue-300 shadow-sm resize-y"
        />
        <p className="text-sm text-slate-500">
          Include the full job posting for best results, including requirements, responsibilities, and qualifications.
        </p>
      </div>

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
