'use client';

interface GenerationProgressProps {
  isVisible: boolean;
  progress: {
    percentage: number;
    stage: string;
  } | null;
}

export function GenerationProgress({ isVisible, progress }: GenerationProgressProps) {
  if (!isVisible || !progress) return null;

  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDashoffset = circumference - (progress.percentage / 100) * circumference;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <div className="space-y-6">
          {/* Progress ring */}
          <div className="flex justify-center">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                {/* Background circle */}
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#2563eb"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">
                  {Math.round(progress.percentage)}%
                </span>
              </div>
            </div>
          </div>

          {/* Stage text */}
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-slate-900">{progress.stage}</p>
            <p className="text-sm text-slate-500">
              AI is crafting your tailored resume
            </p>
          </div>

          {/* Animated dots */}
          <div className="flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          {/* Progress bar (alternative visual) */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
