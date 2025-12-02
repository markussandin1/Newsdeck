'use client';

import type { WeatherWarning } from '@/types/weather';
import { SMHIWarningIcon, type SMHISeverity } from './SMHIWarningIcon';

interface WeatherWarningBadgeProps {
  warnings: WeatherWarning[];
  onClick: () => void;
}

// SMHI severity order: Extreme (Röd) > Severe (Orange) > Moderate (Gul)
const severityOrder = { Extreme: 3, Severe: 2, Moderate: 1 };

function getHighestSeverity(warnings: WeatherWarning[]): SMHISeverity {
  if (warnings.length === 0) return 'Moderate';

  return warnings.reduce((highest, warning) => {
    const currentLevel = severityOrder[warning.severity as keyof typeof severityOrder] || 0;
    const highestLevel = severityOrder[highest as keyof typeof severityOrder] || 0;
    return currentLevel > highestLevel ? (warning.severity as SMHISeverity) : highest;
  }, 'Moderate' as SMHISeverity);
}

export function WeatherWarningBadge({ warnings, onClick }: WeatherWarningBadgeProps) {
  if (warnings.length === 0) return null;

  const severity = getHighestSeverity(warnings);
  const warningCount = warnings.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center hover:opacity-80 transition-opacity"
      title={`${warningCount} vädervarning${warningCount > 1 ? 'ar' : ''} - klicka för detaljer`}
      aria-label={`${warningCount} vädervarning${warningCount > 1 ? 'ar' : ''}`}
    >
      <div className="relative">
        <SMHIWarningIcon severity={severity} size={20} />
        {warningCount > 1 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {warningCount}
          </span>
        )}
      </div>
    </button>
  );
}
