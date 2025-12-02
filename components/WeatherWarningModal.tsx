'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WeatherWarning } from '@/types/weather';
import { ExternalLink, X } from 'lucide-react';
import { SMHIWarningIcon, type SMHISeverity } from './SMHIWarningIcon';

interface WeatherWarningModalProps {
  warnings: WeatherWarning[];
  onClose: () => void;
}

export function WeatherWarningModal({ warnings, onClose }: WeatherWarningModalProps) {
  const [isMounted, setIsMounted] = useState(false);

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
        className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg"
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

        <div className="mt-4 space-y-6">
          {warnings.map((warning) => (
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
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
