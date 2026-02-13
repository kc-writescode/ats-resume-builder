'use client';

import { useState } from 'react';
import { KeywordInsight } from '@/types/resume';

interface KeywordInsightsProps {
    insights: KeywordInsight[];
}

export function KeywordInsights({ insights }: KeywordInsightsProps) {
    const [expanded, setExpanded] = useState(false);

    if (!insights || insights.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 hover:from-blue-100 hover:to-indigo-100 transition-all"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-slate-900 text-sm">Keyword Placement</h3>
                        <p className="text-xs text-slate-600">
                            <span className="text-blue-600 font-medium">{insights.length}</span>
                            {' keywords strategically placed'}
                        </p>
                    </div>
                </div>
                <svg
                    className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {expanded && (
                <div className="p-4 animate-fade-in-up space-y-2 max-h-80 overflow-y-auto">
                    {insights.map((insight, index) => (
                        <div key={index} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center justify-between mb-1">
                                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-medium">
                                    {insight.keyword}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                    {insight.section}
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 italic border-l-2 border-slate-300 pl-2 py-0.5 leading-relaxed">
                                &ldquo;{insight.context}&rdquo;
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
