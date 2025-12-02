'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    let isMounted = true;
    const fetchWarnings = async (withLoading: boolean) => {
      try {
        if (withLoading) setIsLoading(true);
        const response = await fetch('/api/weather-warnings');

        if (!response.ok) {
          throw new Error('Failed to fetch weather warnings');
        }

        const data: WeatherWarningsResponse = await response.json();
        if (!isMounted) return;

        setWarnings(data.warnings || []);
        setError(null);

      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e : new Error('An unknown error occurred'));
      } finally {
        if (withLoading) setIsLoading(false);
      }
    };

    fetchWarnings(true);
    const interval = setInterval(() => fetchWarnings(false), REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [REFRESH_INTERVAL_MS]);

  return { warnings, isLoading, error };
}
