'use client';

import { useState, useEffect, useRef } from 'react';
import type { WeatherWarning } from '@/types/weather';

interface WeatherWarningsResponse {
  warnings: WeatherWarning[];
  cachedAt: string;
}

export function useWeatherWarnings() {
  const [warnings, setWarnings] = useState<WeatherWarning[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const controllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const fetchWarnings = async (withLoading: boolean) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        if (withLoading) setIsLoading(true);
        const response = await fetch('/api/weather-warnings', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Failed to fetch weather warnings');
        }

        const data: WeatherWarningsResponse = await response.json();
        if (!isMountedRef.current) return;

        setWarnings(data.warnings || []);
        setError(null);

      } catch (e) {
        if (!isMountedRef.current) return;
        if (e instanceof DOMException && e.name === 'AbortError') {
          return;
        }
        setError(e instanceof Error ? e : new Error('An unknown error occurred'));
      } finally {
        if (withLoading && isMountedRef.current) setIsLoading(false);
      }
    };

    fetchWarnings(true);
    const interval = setInterval(() => fetchWarnings(false), REFRESH_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
      clearInterval(interval);
    };
  }, [REFRESH_INTERVAL_MS]);

  return { warnings, isLoading, error };
}
