'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Cloud,
  CloudSun,
  Cloudy,
  CloudFog,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  type LucideIcon,
} from 'lucide-react';
import type { WeatherData, WeatherWarning } from '@/types/weather';
import { SMHIWarningIcon, type SMHISeverity } from './SMHIWarningIcon';

interface WeatherWidgetProps {
  cities: WeatherData[];
  warnings: WeatherWarning[];
  onWarningsClick: () => void;
  className?: string;
}

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Sun,
  Cloud,
  CloudSun,
  Cloudy,
  CloudFog,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
};

// Map warning severity to SMHI severity type
const mapSeverityToSMHI = (severity: string): SMHISeverity => {
  const s = severity.toLowerCase();
  if (s === 'extreme') return 'Extreme';
  if (s === 'severe') return 'Severe';
  return 'Moderate';
};

// Sort warnings by severity (Extreme > Severe > Moderate > Minor)
const sortWarningsBySeverity = (warnings: WeatherWarning[]): WeatherWarning[] => {
  const severityOrder: Record<string, number> = {
    Extreme: 4,
    Severe: 3,
    Moderate: 2,
    Minor: 1,
  };

  return [...warnings].sort((a, b) => {
    const orderA = severityOrder[a.severity] || 0;
    const orderB = severityOrder[b.severity] || 0;
    return orderB - orderA;
  });
};

export function WeatherWidget({
  cities,
  warnings,
  onWarningsClick,
  className = ''
}: WeatherWidgetProps) {
  // Start from random city on mount
  const [currentIndex, setCurrentIndex] = useState(() => Math.floor(Math.random() * 100));
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Announce warnings to screen readers
  const previousWarningCount = useRef(warnings.length);
  useEffect(() => {
    if (warnings.length > previousWarningCount.current) {
      // New warning arrived - trigger announcement
      const announcement = document.getElementById('weather-warning-announcement');
      if (announcement) {
        announcement.textContent = `Ny vädervarning: ${warnings[0]?.event || warnings[0]?.headline || 'Okänd'}`;
      }
    }
    previousWarningCount.current = warnings.length;
  }, [warnings.length, warnings]);

  // Cycling logic with animation coordination
  useEffect(() => {
    if (cities.length <= 1 || isPaused) return;

    const timer = setTimeout(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setIsAnimating(false);
      }, 200); // Fade duration
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentIndex, cities.length, isPaused]);

  // Loading state
  if (cities.length === 0) {
    return (
      <div className={`min-w-[180px] ${className}`}>
        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      </div>
    );
  }

  // Use modulo to wrap around city array
  const city = cities[currentIndex % cities.length];
  if (!city) return null;

  const hasWarnings = warnings.length > 0;
  const sortedWarnings = hasWarnings ? sortWarningsBySeverity(warnings) : [];
  const highestWarning = sortedWarnings[0];
  const Icon = iconMap[city.icon] || Cloud;

  return (
    <>
      {/* Screen reader announcement region */}
      <div id="weather-warning-announcement" role="status" aria-live="polite" className="sr-only" />

      <button
        type="button"
        onClick={hasWarnings ? onWarningsClick : undefined}
        disabled={!hasWarnings}
        className={`
          group relative
          flex flex-col gap-1
          min-w-[180px]
          transition-all duration-200
          ${hasWarnings
            ? 'cursor-pointer hover:opacity-80 active:scale-[0.98]'
            : 'cursor-default'}
          ${hasWarnings && 'focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2'}
          ${className}
        `}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        aria-label={`
          Väder: ${city.city}, ${city.temperature} grader.
          ${hasWarnings
            ? `${warnings.length} vädervarning${warnings.length > 1 ? 'ar' : ''} aktiv${warnings.length > 1 ? 'a' : ''}. Klicka för detaljer.`
            : 'Inga varningar.'}
        `}
      >
        {/* Top row: Weather Icon + Temperature + Location */}
        <div className={`flex items-baseline gap-2 transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <Icon
            className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0"
            aria-hidden="true"
          />
          <span className="text-base font-semibold text-foreground tabular-nums">
            {city.temperature}°
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
            {city.city}
          </span>
        </div>

        {/* Bottom row: Warning Badge (only if warnings exist) */}
        {hasWarnings && highestWarning && (
          <div className="flex items-center gap-1.5">
            {/* SMHI Warning Icon */}
            <SMHIWarningIcon
              severity={mapSeverityToSMHI(highestWarning.severity)}
              size={16}
              className="shrink-0"
            />

            {/* Warning Headline */}
            <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
              {highestWarning.headline || highestWarning.event || 'Vädervarning'}
            </span>

            {/* Count badge if multiple warnings */}
            {warnings.length > 1 && (
              <span className="text-[10px] font-semibold text-muted-foreground">
                +{warnings.length - 1}
              </span>
            )}
          </div>
        )}

      </button>
    </>
  );
}
