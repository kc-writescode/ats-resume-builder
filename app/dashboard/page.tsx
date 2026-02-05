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
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-100 rounded-full"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent rounded-full animate-spin border-t-blue-600"></div>
            </div>
            <p className="mt-4 text-sm text-slate-500 animate-pulse">Loading content...</p>
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
    const [initialResumeText, setInitialResumeText] = useState('');

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

    // Load pending resume data from try-it-free flow
    useEffect(() => {
        const pendingData = localStorage.getItem('pendingResume');
        if (pendingData) {
            try {
                const { resumeText, jobDescription } = JSON.parse(pendingData);
                if (jobDescription) {
                    setJobDescriptionText(jobDescription);
                }
                if (resumeText) {
                    setInitialResumeText(resumeText);
                }
                // If we have a base resume already, go to generate tab
                const stored = storage.getBaseResume();
                if (stored) {
                    setActiveTab('generate');
                }
                // Clear the pending data
                localStorage.removeItem('pendingResume');
            } catch (err) {
                console.error('Failed to load pending resume data:', err);
                localStorage.removeItem('pendingResume');
            }
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
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 transition-smooth">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 group cursor-pointer">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:shadow-blue-600/40 transition-smooth group-hover:scale-105">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Resume Builder</h1>
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
                            {!isMaster && (
                                <>
                                    <div className="w-px h-4 bg-slate-200"></div>
                                    <a
                                        href="https://api.whatsapp.com/send/?phone=917993723103&text=Hi+ResumeAI+,+I%E2%80%99d+like+to+purchase+credits&type=phone_number&app_absent=0"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs font-medium text-green-600 hover:text-green-700 transition-fast"
                                    >
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                        </svg>
                                        Buy Credits
                                    </a>
                                </>
                            )}
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

                {/* Navigation Tabs with Progress Indicators */}
                <div className="flex justify-center mb-8">
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-0">
                        {[
                            { id: 'setup' as const, label: 'Base Resume', number: '1', completed: !!baseResume },
                            { id: 'generate' as const, label: 'Generate', number: '2', completed: !!generatedResume },
                            { id: 'review' as const, label: 'Review & Export', number: '3', completed: false }
                        ].map((tab, index, arr) => (
                            <div key={tab.id} className="flex items-center">
                                <button
                                    onClick={() => setActiveTab(tab.id)}
                                    disabled={(tab.id === 'generate' && !baseResume) || (tab.id === 'review' && !generatedResume)}
                                    className={`relative flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-sm transition-smooth ${
                                        activeTab === tab.id
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25'
                                            : tab.completed
                                                ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                                : (baseResume || tab.id === 'setup')
                                                    ? 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                                                    : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                                    }`}
                                >
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-smooth ${
                                        activeTab === tab.id
                                            ? 'bg-white/20'
                                            : tab.completed
                                                ? 'bg-green-500 text-white'
                                                : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {tab.completed && activeTab !== tab.id ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : tab.number}
                                    </span>
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    <span className="sm:hidden">{tab.number}</span>
                                </button>

                                {/* Connector line */}
                                {index < arr.length - 1 && (
                                    <div className={`hidden sm:block w-8 h-0.5 mx-1 transition-smooth ${
                                        tab.completed ? 'bg-green-400' : 'bg-slate-200'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 animate-slide-up shadow-sm">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="flex-1 font-medium">{error}</span>
                        <button
                            onClick={() => setError('')}
                            className="p-2 rounded-lg hover:bg-red-100 transition-fast text-red-500"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Tab Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in-up">
                    {activeTab === 'setup' && (
                        <SetupTab
                            baseResume={baseResume}
                            onSave={handleSaveBaseResume}
                            initialResumeText={initialResumeText}
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
                            baseResume={baseResume}
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
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-smooth cursor-default group animate-fade-in-up"
                        style={{ animationDelay: '0.1s' }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center group-hover:scale-110 transition-smooth shadow-sm">
                                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Resumes Generated</p>
                                <p className="text-3xl font-bold text-slate-900 group-hover:text-blue-600 transition-smooth">{storage.getGeneratedResumes().length}</p>
                            </div>
                        </div>
                    </div>

                    <div
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-smooth cursor-default group animate-fade-in-up"
                        style={{ animationDelay: '0.2s' }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center group-hover:scale-110 transition-smooth shadow-sm">
                                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Latest ATS Score</p>
                                <p className={`text-3xl font-bold transition-smooth ${generatedResume ? 'text-green-600 group-hover:text-green-700' : 'text-slate-400'}`}>
                                    {generatedResume ? `${generatedResume.atsScore}%` : '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-smooth cursor-default group animate-fade-in-up sm:col-span-2 lg:col-span-1"
                        style={{ animationDelay: '0.3s' }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center group-hover:scale-110 transition-smooth shadow-sm">
                                    <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-sm font-medium">Credits Remaining</p>
                                    <p className={`text-3xl font-bold transition-smooth ${isMaster ? 'text-amber-600' : 'text-slate-900'} group-hover:text-amber-600`}>
                                        {isMaster ? '∞' : (profile?.credits || 0)}
                                    </p>
                                </div>
                            </div>
                            {!isMaster && (
                                <a
                                    href="https://api.whatsapp.com/send/?phone=917993723103&text=Hi+ResumeAI+,+I%E2%80%99d+like+to+purchase+credits&type=phone_number&app_absent=0"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-medium text-sm shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-smooth"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                    Buy Credits
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

