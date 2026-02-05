'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { BaseResume, GeneratedResume } from '@/types/resume';
import { storage } from '@/lib/storage';
import { StreamProgress } from '@/lib/stream-helpers';
import { analyzeATSCompatibility, extractKeywordsFromJobDescription, analyzeKeywords } from '@/lib/ats-analyzer';
import { deductCreditAsync, validateCredits } from '@/lib/credit-service';

// Dynamic imports for code splitting - these are loaded only when needed
const SetupTab = dynamic(() => import('@/components/SetupTab').then(mod => ({ default: mod.SetupTab })), {
    loading: () => <TabLoadingSpinner />
});

const GenerateTab = dynamic(() => import('@/components/GenerateTab').then(mod => ({ default: mod.GenerateTab })), {
    loading: () => <TabLoadingSpinner />
});

const ReviewTab = dynamic(() => import('@/components/ReviewTab').then(mod => ({ default: mod.ReviewTab })), {
    loading: () => <TabLoadingSpinner />
});

const GenerationProgress = dynamic(() => import('@/components/GenerationProgress').then(mod => ({ default: mod.GenerationProgress })), {
    ssr: false
});

// Loading spinner for tabs
function TabLoadingSpinner() {
    return (
        <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
        </div>
    );
}

export default function Dashboard() {
    const { user, profile, loading, signOut, isMaster, refreshProfile } = useAuth();
    const router = useRouter();

    const [baseResume, setBaseResume] = useState<BaseResume | null>(null);
    const [jobDescriptionText, setJobDescriptionText] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('classic');
    const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState<StreamProgress | null>(null);
    const [activeTab, setActiveTab] = useState<'setup' | 'generate' | 'review'>('setup');
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    // Handle hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

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

        // Quick credit validation (non-blocking check)
        const creditCheck = validateCredits(isMaster, profile?.credits || 0);
        if (!creditCheck.valid) {
            setError(creditCheck.message || 'Insufficient credits');
            return;
        }

        setIsGenerating(true);
        setGenerationProgress({ percentage: 0, stage: 'Starting...' });
        setError('');

        try {
            const jobDescription = extractKeywordsFromJobDescription(jobDescriptionText);

            console.log('Generating resume with base skills:', baseResume.skills);
            console.log('Base resume skill categories:', baseResume.skillCategories);

            // Dynamically import AI service for code splitting
            const { generateTailoredResumeStreaming } = await import('@/lib/ai-service');

            // Use streaming version with progress callback
            const tailoredContent = await generateTailoredResumeStreaming(
                baseResume,
                jobDescription,
                setGenerationProgress
            );

            setGenerationProgress({ percentage: 96, stage: 'Analyzing keywords...' });

            // Run keyword analysis and ATS scoring in parallel
            const [keywordAnalysis, preliminaryAtsScore] = await Promise.all([
                Promise.resolve(analyzeKeywords(tailoredContent, jobDescription)),
                Promise.resolve(analyzeATSCompatibility(tailoredContent, jobDescription))
            ]);

            const contentWithKeywords: BaseResume = {
                ...tailoredContent,
                coreCompetencies: keywordAnalysis.suggestedCompetencies
            };

            // Final ATS score with competencies included
            const atsScore = analyzeATSCompatibility(contentWithKeywords, jobDescription);

            setGenerationProgress({ percentage: 98, stage: 'Saving resume...' });

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

            // Fire-and-forget credit deduction (non-blocking)
            if (!isMaster && profile && user) {
                deductCreditAsync(user.id, profile.credits || 0, () => {
                    // Refresh profile in background to sync UI
                    refreshProfile?.();
                });
            }

            storage.addGeneratedResume(generated);
            setGeneratedResume(generated);
            setGenerationProgress({ percentage: 100, stage: 'Complete!' });

            // Small delay to show 100% before transitioning
            setTimeout(() => {
                setActiveTab('review');
            }, 300);
        } catch (err) {
            console.error('Generation error:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate resume');
        } finally {
            setIsGenerating(false);
            setGenerationProgress(null);
        }
    };

    const handleExport = async (format: 'pdf' | 'docx') => {
        if (!generatedResume) return;

        const fileName = `${generatedResume.content.personal.name.replace(/\s+/g, '_')}_${generatedResume.companyName.replace(/\s+/g, '_')}`;

        try {
            let blob: Blob;

            // Dynamically import heavy export libraries only when needed
            if (format === 'pdf') {
                const { generateTextBasedPDF } = await import('@/lib/text-pdf-generator');
                blob = await generateTextBasedPDF(generatedResume.content, generatedResume.template, fileName);
            } else {
                const { generateDOCX } = await import('@/lib/docx-generator');
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

    // Show loading during SSR/hydration to prevent mismatch
    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
                    <span className="text-slate-600">Loading...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }


    return (
        <div className="min-h-screen bg-slate-50">
            {/* Generation Progress Overlay */}
            <GenerationProgress
                isVisible={isGenerating}
                progress={generationProgress}
            />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-slate-900">Resume Builder</h1>
                            <p className="text-sm text-slate-500">Welcome, {profile?.full_name || user.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Credits/Plan Badge */}
                        <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Plan:</span>
                                <span className={`text-sm font-medium ${isMaster ? 'text-blue-600' :
                                    profile?.plan === 'enterprise' ? 'text-indigo-600' :
                                        profile?.plan === 'pro' ? 'text-blue-600' : 'text-slate-600'
                                    }`}>
                                    {isMaster ? 'Admin' : (profile?.plan?.charAt(0).toUpperCase() + (profile?.plan?.slice(1) || 'ree'))}
                                </span>
                            </div>
                            <div className="w-px h-4 bg-slate-200"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Credits:</span>
                                <span className={`text-sm font-medium ${isMaster ? 'text-amber-600' : 'text-green-600'}`}>
                                    {isMaster ? '∞' : (profile?.credits || 0)}
                                </span>
                            </div>
                        </div>

                        {isMaster && (
                            <button
                                onClick={() => router.push('/master')}
                                className="px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors text-sm font-medium"
                            >
                                Admin
                            </button>
                        )}
                        <button
                            onClick={() => router.push('/')}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                        >
                            Home
                        </button>
                        <button
                            onClick={() => signOut()}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Feature Access Check */}
                {profile && !profile.feature_access?.resume_tailor_enabled && !isMaster && (
                    <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                        <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <h3 className="font-semibold text-amber-800">Feature Access Required</h3>
                            <p className="text-amber-700 text-sm mt-1">
                                Your account doesn't have access to this feature. Please contact an administrator for access.
                            </p>
                        </div>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex rounded-lg bg-white border border-slate-200 p-1 shadow-sm">
                        <button
                            onClick={() => setActiveTab('setup')}
                            className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all ${activeTab === 'setup'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            1. Base Resume
                        </button>
                        <button
                            onClick={() => setActiveTab('generate')}
                            disabled={!baseResume}
                            className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all ${activeTab === 'generate'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : baseResume
                                    ? 'text-slate-600 hover:text-slate-900'
                                    : 'text-slate-300 cursor-not-allowed'
                                }`}
                        >
                            2. Generate
                        </button>
                        <button
                            onClick={() => setActiveTab('review')}
                            disabled={!generatedResume}
                            className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all ${activeTab === 'review'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : generatedResume
                                    ? 'text-slate-600 hover:text-slate-900'
                                    : 'text-slate-300 cursor-not-allowed'
                                }`}
                        >
                            3. Review & Export
                        </button>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
                            ✕
                        </button>
                    </div>
                )}

                {/* Tab Content */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
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

                {/* Quick Stats */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm">Resumes Generated</p>
                                <p className="text-2xl font-bold text-slate-900">{storage.getGeneratedResumes().length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm">Latest ATS Score</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {generatedResume ? `${generatedResume.atsScore}%` : '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm">Credits Remaining</p>
                                <p className="text-2xl font-bold text-slate-900">{isMaster ? '∞' : (profile?.credits || 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

