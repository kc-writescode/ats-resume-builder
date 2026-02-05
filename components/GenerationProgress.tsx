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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-modal-scale-in">
        <div className="space-y-6">
          {/* Progress ring */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                {/* Background circle */}
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#e2e8f0"
                  strokeWidth="6"
                  fill="none"
                />
                {/* Progress circle with gradient */}
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="url(#progressGradient)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 ease-out"
                  style={{
                    filter: progress.percentage > 50 ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))' : 'none'
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  {Math.round(progress.percentage)}%
                </span>
              </div>
            </div>
          </div>

          {/* Stage text with animation */}
          <div className="text-center space-y-2">
            <p key={progress.stage} className="text-lg font-semibold text-slate-900 animate-slide-up">
              {progress.stage}
            </p>
            <p className="text-sm text-slate-500">
              AI is crafting your tailored resume
            </p>
          </div>

          {/* Animated dots */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          {/* Progress bar with gradient */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
