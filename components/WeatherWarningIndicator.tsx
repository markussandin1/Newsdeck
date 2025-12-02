'use client';

import type { WeatherWarning } from '@/types/weather';
import { SMHIWarningIcon, type SMHISeverity } from './SMHIWarningIcon';

interface WeatherWarningIndicatorProps {
  onClick: () => void;
  warningCount: number;
  warnings: WeatherWarning[];
}

// SMHI severity order: Extreme (Röd) > Severe (Orange) > Moderate (Gul)
const severityOrder = { Extreme: 3, Severe: 2, Moderate: 1 };

function getHighestSeverity(warnings: WeatherWarning[]): SMHISeverity {
  if (warnings.length === 0) return 'Moderate';

  return warnings.reduce((highest, warning) => {
    const currentLevel = severityOrder[warning.severity as keyof typeof severityOrder] || 0;
    const highestLevel = severityOrder[highest as keyof typeof severityOrder] || 0;
    return currentLevel > highestLevel ? warning.severity as SMHISeverity : highest;
  }, 'Moderate' as SMHISeverity);
}

// Text colors matching icon colors
const severityTextColor = {
  Moderate: 'text-yellow-600 dark:text-yellow-400',
  Severe: 'text-orange-600 dark:text-orange-400',
  Extreme: 'text-red-600 dark:text-red-400',
};

export function WeatherWarningIndicator({ onClick, warningCount, warnings }: WeatherWarningIndicatorProps) {
  const severity = getHighestSeverity(warnings);
  const textColor = severityTextColor[severity];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 mr-4 p-1 hover:opacity-80 transition-opacity animate-pulse-slow"
      title="Visa aktuella vädervarningar"
      aria-label="Visa aktuella vädervarningar"
    >
      <SMHIWarningIcon severity={severity} size={24} />
      <span className={`text-sm font-bold ${textColor}`}>{warningCount}</span>
    </button>
  );
}
