'use client';

import type { WeatherWarning } from '@/types/weather';
import { SMHIWarningIcon, type SMHISeverity } from './SMHIWarningIcon';
import { Clock } from 'lucide-react';

interface WeatherWarningBannerProps {
  warnings: WeatherWarning[];
  onClick: () => void;
  className?: string;
}

// SMHI severity order: Extreme (Röd) > Severe (Orange) > Moderate (Gul)
const severityOrder = { Extreme: 3, Severe: 2, Moderate: 1, Minor: 0 };

function getHighestSeverityWarning(warnings: WeatherWarning[]): WeatherWarning | null {
  if (warnings.length === 0) return null;

  return warnings.reduce((highest, warning) => {
    const currentLevel = severityOrder[warning.severity as keyof typeof severityOrder] || 0;
    const highestLevel = severityOrder[highest.severity as keyof typeof severityOrder] || 0;
    return currentLevel > highestLevel ? warning : highest;
  });
}

function formatTimeRange(start?: string, end?: string): string {
  if (!start && !end) return '';

  const locale = 'sv-SE';

  if (!start && end) {
    const endDate = new Date(end);
    return `Till ${endDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (start && !end) {
    const startDate = new Date(start);
    return `Från ${startDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
  }

  const startDate = new Date(start!);
  const endDate = new Date(end!);

  const isSameDay = startDate.toDateString() === endDate.toDateString();

  if (isSameDay) {
    const startTime = startDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const endTime = endDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return `${startTime} - ${endTime}`;
  }

  return `${startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;
}

export function WeatherWarningBanner({ warnings, onClick, className = '' }: WeatherWarningBannerProps) {
  const topWarning = getHighestSeverityWarning(warnings);

  if (!topWarning) return null;

  const severity = topWarning.severity as SMHISeverity;
  const timeRange = formatTimeRange(topWarning.approximateStart, topWarning.approximateEnd);
  const warningCount = warnings.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full flex items-center gap-3 px-4 py-2.5 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors ${className}`}
      title="Klicka för fullständiga varningsdetaljer"
      aria-label={`Vädervarning: ${topWarning.headline}. Klicka för detaljer.`}
    >
      {/* Warning icon */}
      <div className="flex-shrink-0">
        <SMHIWarningIcon severity={severity} size={28} />
      </div>

      {/* Warning content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="font-bold text-sm text-foreground leading-tight truncate">
            {topWarning.headline}
          </h3>
          {warningCount > 1 && (
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              (+{warningCount - 1} till)
            </span>
          )}
        </div>

        {timeRange && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">{timeRange}</span>
          </div>
        )}
      </div>

      {/* Subtle indicator that it's clickable */}
      <div className="flex-shrink-0 text-xs font-medium text-primary-light group-hover:underline">
        Visa mer
      </div>
    </button>
  );
}
