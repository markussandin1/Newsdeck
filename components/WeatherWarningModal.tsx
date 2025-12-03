'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WeatherWarning } from '@/types/weather';
import { ExternalLink, X } from 'lucide-react';
import { SMHIWarningIcon, type SMHISeverity } from './SMHIWarningIcon';
import { cn } from '@/lib/utils';

interface WeatherWarningModalProps {
  warnings: WeatherWarning[];
  onClose: () => void;
}

interface DayTab {
  date: string; // YYYY-MM-DD
  label: string; // "Idag", "Imorgon", "Onsdag"
  warningIcons: SMHISeverity[]; // Unique severities on this day
  warningCount: number;
}

function getTodayDateStr(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayLabel(date: Date, offset: number): string {
  if (offset === 0) return 'Idag';
  if (offset === 1) return 'Imorgon';
  const weekdays = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  return weekdays[date.getDay()];
}

function orderSeverities(severities: string[]): SMHISeverity[] {
  const order: Record<string, number> = { 'Extreme': 0, 'Severe': 1, 'Moderate': 2, 'Minor': 3 };
  return severities
    .filter(s => ['Extreme', 'Severe', 'Moderate', 'Minor'].includes(s))
    .sort((a, b) => order[a] - order[b])
    .slice(0, 3) as SMHISeverity[];
}

function generateDayTabs(warnings: WeatherWarning[]): DayTab[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: DayTab[] = [];

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const year = dayStart.getFullYear();
    const month = String(dayStart.getMonth() + 1).padStart(2, '0');
    const day = String(dayStart.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Get warnings active on this day
    const dayWarnings = warnings.filter(w => {
      if (!w.approximateStart && !w.approximateEnd) {
        return true;
      }

      const startDate = w.approximateStart ? new Date(w.approximateStart) : new Date(0);
      const endDate = w.approximateEnd ? new Date(w.approximateEnd) : new Date(8640000000000000);

      return startDate <= dayEnd && endDate >= dayStart;
    });

    // Extract unique severities
    const severitySet = new Set(dayWarnings.map(w => w.severity));
    const severities = Array.from(severitySet);
    const ordered = orderSeverities(severities);

    days.push({
      date: dateStr,
      label: getDayLabel(dayStart, i),
      warningIcons: ordered,
      warningCount: dayWarnings.length
    });
  }

  return days;
}

function filterWarningsByDay(warnings: WeatherWarning[], selectedDay: string): WeatherWarning[] {
  const selectedDayStart = new Date(selectedDay);
  selectedDayStart.setHours(0, 0, 0, 0);

  const selectedDayEnd = new Date(selectedDay);
  selectedDayEnd.setHours(23, 59, 59, 999);

  return warnings.filter(w => {
    if (!w.approximateStart && !w.approximateEnd) {
      // If no dates, show on all days
      return true;
    }

    const startDate = w.approximateStart ? new Date(w.approximateStart) : new Date(0);
    const endDate = w.approximateEnd ? new Date(w.approximateEnd) : new Date(8640000000000000);

    // Warning is active on selected day if its period overlaps with that day
    return startDate <= selectedDayEnd && endDate >= selectedDayStart;
  });
}

const severityLevels = [
  {
    value: 'Moderate',
    severity: 'Moderate' as SMHISeverity,
    label: 'Gul',
    bgActive: 'bg-yellow-50',
    borderActive: 'border-yellow-400',
    textActive: 'text-yellow-700'
  },
  {
    value: 'Severe',
    severity: 'Severe' as SMHISeverity,
    label: 'Orange',
    bgActive: 'bg-orange-50',
    borderActive: 'border-orange-500',
    textActive: 'text-orange-700'
  },
  {
    value: 'Extreme',
    severity: 'Extreme' as SMHISeverity,
    label: 'Röd',
    bgActive: 'bg-red-50',
    borderActive: 'border-red-500',
    textActive: 'text-red-700'
  }
];

export function WeatherWarningModal({ warnings, onClose }: WeatherWarningModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>(getTodayDateStr());
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<string>('all');

  const toggleSeverity = (severity: string) => {
    setSelectedSeverities(prev => {
      const next = new Set(prev);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return next;
    });
  };

  const uniqueWarningTypes = useMemo(() => {
    const types = warnings
      .map(w => w.event)
      .filter(Boolean) as string[];
    return Array.from(new Set(types)).sort();
  }, [warnings]);

  const typeWarningCounts = useMemo(() => {
    return uniqueWarningTypes.reduce((acc, type) => {
      acc[type] = warnings.filter(w => w.event === type).length;
      return acc;
    }, {} as Record<string, number>);
  }, [warnings, uniqueWarningTypes]);

  const dayTabs = useMemo(() => generateDayTabs(warnings), [warnings]);
  const filteredWarnings = useMemo(() => {
    return filterWarningsByDay(warnings, selectedDay).filter(w => {
      // If no severities selected, show all. If some selected, filter by them.
      const matchesSeverity = selectedSeverities.size === 0 || selectedSeverities.has(w.severity);
      const matchesType = selectedType === 'all' || w.event === selectedType;
      return matchesSeverity && matchesType;
    });
  }, [warnings, selectedDay, selectedSeverities, selectedType]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || warnings.length === 0) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Aktuella vädervarningar"
    >
      <div
        className="relative w-full max-w-6xl max-h-[80vh] rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h2 className="text-xl font-semibold font-display">Aktuella vädervarningar</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Stäng varningar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Filter Section */}
        <div className="mt-4 space-y-3">
          {/* Severity Filter Chips */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground shrink-0">
              Varningsnivå:
            </span>
            <div className="flex flex-wrap gap-2">
              {severityLevels.map(level => (
                <button
                  key={level.value}
                  onClick={() => toggleSeverity(level.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2 flex items-center gap-2",
                    selectedSeverities.has(level.value)
                      ? `${level.bgActive} ${level.borderActive} ${level.textActive}`
                      : "bg-white border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <SMHIWarningIcon severity={level.severity} size={16} />
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Warning Type Dropdown - only show if multiple types exist */}
          {uniqueWarningTypes.length > 1 && (
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="warning-type-select" className="text-sm font-medium text-muted-foreground shrink-0">
                Varningstyp:
              </label>
              <select
                id="warning-type-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className={cn(
                  "px-3 py-2 rounded-lg border-2 border-border bg-white",
                  "text-sm font-medium text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary-light",
                  "hover:bg-muted/30 transition-colors",
                  "min-w-[200px]"
                )}
              >
                <option value="all">Alla varningar</option>
                {uniqueWarningTypes.map(type => (
                  <option key={type} value={type}>
                    {type} ({typeWarningCounts[type]})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Day Timeline Filter */}
        <div className="mt-4 border-b border-border pb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-thin">
            {dayTabs.map((day) => (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day.date)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                  selectedDay === day.date
                    ? "bg-primary-light/10 text-primary-light border-2 border-primary-light"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="text-center">
                  <div className="font-semibold">{day.label}</div>
                  {day.warningIcons.length > 0 && (
                    <div className="flex gap-1 mt-1 justify-center">
                      {day.warningIcons.map((severity, i) => (
                        <SMHIWarningIcon key={i} severity={severity} size={16} />
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_400px] gap-6">
          {/* Left column: Warnings list */}
          <div className="overflow-y-auto max-h-[calc(80vh-280px)]">
            {filteredWarnings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  Inga varningar för valda filter
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Prova att ändra varningsnivå eller dag
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredWarnings.map((warning) => (
              <div key={warning.id} className="border-b border-border pb-4 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground pr-4 font-display">
                      {warning.headline}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {warning.areas.join(', ') || 'Hela landet'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <SMHIWarningIcon severity={warning.severity as SMHISeverity} size={32} />
                  </div>
                </div>
                <p className="mt-3 text-foreground whitespace-pre-wrap">
                  {warning.description}
                </p>
                {warning.web && (
                  <a
                    href={warning.web}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-sm text-primary-light hover:text-primary smooth-transition"
                  >
                    Läs mer <ExternalLink size={14} />
                  </a>
                )}
              </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column: Map placeholder */}
          <div className="hidden md:block sticky top-0 h-[calc(80vh-280px)]">
            <div className="h-full rounded-lg border-2 border-dashed border-border bg-muted/10 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Karta kommer här</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
