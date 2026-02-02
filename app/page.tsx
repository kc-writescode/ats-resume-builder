'use client';

import { useState, useEffect } from 'react';
import { BaseResume, GeneratedResume } from '@/types/resume';
import { storage } from '@/lib/storage';
import { generateTailoredResume } from '@/lib/ai-service';
import { analyzeATSCompatibility, extractKeywordsFromJobDescription, analyzeKeywords } from '@/lib/ats-analyzer';
import { generateTextBasedPDF } from '@/lib/text-pdf-generator';
import { generateDOCX } from '@/lib/docx-generator';
// Note: keyword highlighting is disabled by default - users can manually bold text using Ctrl+B in edit mode
import { SetupTab } from '@/components/SetupTab';
import { GenerateTab } from '@/components/GenerateTab';
import { ReviewTab } from '@/components/ReviewTab';

export default function Home() {
  const [baseResume, setBaseResume] = useState<BaseResume | null>(null);
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'generate' | 'review'>('setup');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = storage.getBaseResume();
    if (stored) {
      setBaseResume(stored);
      setActiveTab('generate');
    }
  }, []);

  const handleSaveBaseResume = (resume: BaseResume) => {
    storage.setBaseResume(resume);
    setBaseResume(resume);
    setActiveTab('generate');
  };

  const handleGenerate = async () => {
    if (!baseResume || !jobDescriptionText) {
      setError('Please ensure base resume is set and job description is provided');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // Extract job details
      const jobDescription = extractKeywordsFromJobDescription(jobDescriptionText);

      // Generate tailored resume using AI
      const tailoredContent = await generateTailoredResume(
        baseResume,
        jobDescription
      );

      // Analyze keywords and add core competencies
      const keywordAnalysis = analyzeKeywords(tailoredContent, jobDescription);
      const contentWithKeywords: BaseResume = {
        ...tailoredContent,
        coreCompetencies: keywordAnalysis.suggestedCompetencies
      };

      // Note: Auto-bolding disabled - users can manually bold text using Ctrl+B in edit mode

      // Analyze ATS score
      const atsScore = analyzeATSCompatibility(contentWithKeywords, jobDescription);

      // Create generated resume object
      const generated: GeneratedResume = {
        id: `resume-${Date.now()}`,
        jobTitle: jobDescription.jobTitle,
        companyName: jobDescription.companyName,
        jobDescription: jobDescriptionText,
        generatedAt: Date.now(),
        atsScore: atsScore.overall,
        content: contentWithKeywords,
        template: selectedTemplate
      };

      storage.addGeneratedResume(generated);
      setGeneratedResume(generated);
      setActiveTab('review');
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate resume');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!generatedResume) return;

    const fileName = `${generatedResume.content.personal.name.replace(/\s+/g, '_')}_${generatedResume.companyName.replace(/\s+/g, '_')}`;

    try {
      let blob: Blob;

      if (format === 'pdf') {
        blob = await generateTextBasedPDF(generatedResume.content, generatedResume.template, fileName);
      } else {
        blob = await generateDOCX(generatedResume.content, generatedResume.template, fileName);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setError(`Failed to export ${format.toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            ATS Resume Builder
          </h1>
          <p className="text-gray-600 text-lg">
            AI-powered resume tailoring for maximum ATS compatibility
          </p>
        </header>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${activeTab === 'setup'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              1. Base Resume
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              disabled={!baseResume}
              className={`px-6 py-2 rounded-md font-medium transition-all ${activeTab === 'generate'
                  ? 'bg-blue-600 text-white shadow-md'
                  : baseResume
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
            >
              2. Generate
            </button>
            <button
              onClick={() => setActiveTab('review')}
              disabled={!generatedResume}
              className={`px-6 py-2 rounded-md font-medium transition-all ${activeTab === 'review'
                  ? 'bg-blue-600 text-white shadow-md'
                  : generatedResume
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
            >
              3. Review & Export
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {activeTab === 'setup' && (
            <SetupTab
              baseResume={baseResume}
              onSave={handleSaveBaseResume}
            />
          )}

          {activeTab === 'generate' && (
            <GenerateTab
              jobDescription={jobDescriptionText}
              onJobDescriptionChange={setJobDescriptionText}
              selectedTemplate={selectedTemplate}
              onTemplateChange={setSelectedTemplate}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          )}

          {activeTab === 'review' && generatedResume && (
            <ReviewTab
              resume={generatedResume}
              onExport={handleExport}
              onEdit={(updated) => {
                setGeneratedResume(updated);
                storage.updateGeneratedResume(updated.id, updated);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
