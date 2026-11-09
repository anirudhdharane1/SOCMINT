import React from 'react';

interface RiskBarProps {
  score: number | string;
  showNumber?: boolean;
}

export function RiskBar({ score, showNumber = true }: RiskBarProps) {
  const numericScore = typeof score === 'string' ? parseFloat(score) || 0 : score;
  const clampedScore = Math.max(0, Math.min(100, numericScore));

  let barColor = 'bg-[#22ff88]';
  let textColor = 'text-[#22ff88]';

  if (clampedScore >= 80) {
    barColor = 'bg-red-500';
    textColor = 'text-red-400';
  } else if (clampedScore >= 40) {
    barColor = 'bg-amber-400';
    textColor = 'text-amber-400';
  } else {
    barColor = 'bg-sky-400';
    textColor = 'text-sky-400';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
      {showNumber && (
        <span className={`font-mono text-xs font-semibold ${textColor}`}>
          {clampedScore.toFixed(1)}
        </span>
      )}
    </div>
  );
}

