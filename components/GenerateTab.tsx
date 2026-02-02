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
              className={`p-4 border-2 rounded-lg text-left transition-all ${selectedTemplate === template.id
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300'
                }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                {selectedTemplate === template.id && (
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{template.description}</p>
              <p className="text-xs text-gray-500">{template.preview}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <button
          onClick={onGenerate}
          disabled={!jobDescription.trim() || isGenerating}
          className={`px-8 py-3 rounded-lg font-medium transition-all shadow-md ${isGenerating
              ? 'bg-gray-400 cursor-not-allowed'
              : jobDescription.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating Resume...
            </span>
          ) : (
            'Generate Tailored Resume'
          )}
        </button>
      </div>
    </div>
  );
}
