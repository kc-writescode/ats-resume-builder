'use client';

import { KeywordInsight } from '@/types/resume';

interface KeywordInsightsProps {
    insights: KeywordInsight[];
}

export function KeywordInsights({ insights }: KeywordInsightsProps) {
    if (!insights || insights.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Keyword Optimization Insights</h3>
            </div>
            <div className="p-6">
                <p className="text-sm text-gray-600 mb-6">
                    The following keywords were strategically integrated into your resume to align with the job description and improve ATS ranking.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.map((insight, index) => (
                        <div key={index} className="flex flex-col p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-start mb-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {insight.keyword}
                                </span>
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {insight.section}
                                </span>
                            </div>
                            <p className="text-sm text-gray-700 italic border-l-2 border-slate-300 pl-3 py-1">
                                "{insight.context}"
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
