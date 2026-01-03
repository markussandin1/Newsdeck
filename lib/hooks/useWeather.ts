import { useState, useEffect, useCallback, useRef } from 'react';
import type { WeatherData } from '@/types/weather';

interface UseWeatherReturn {
  weather: WeatherData[];
  loading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
}

const CACHE_KEY = 'newsdeck_weather_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms

interface WeatherCache {
  weather: WeatherData[];
  timestamp: number;
}

export function useWeather(): UseWeatherReturn {
  const [weather, setWeather] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Load cached weather from localStorage
  const loadCachedWeather = useCallback((): WeatherData[] | null => {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data: WeatherCache = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid (within 1 hour)
      if (now - data.timestamp < CACHE_DURATION) {
        return data.weather;
      }

      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (err) {
      console.error('Error loading cached weather:', err);
      return null;
    }
  }, []);

  // Save weather to localStorage
  const cacheWeather = useCallback((weatherData: WeatherData[]) => {
    if (typeof window === 'undefined') return;

    try {
      const cache: WeatherCache = {
        weather: weatherData,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (err) {
      console.error('Error caching weather:', err);
    }
  }, []);

  const fetchWeather = useCallback(async (silent = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/weather', { signal: controller.signal });

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const weatherData = data.weather || [];
      if (!isMountedRef.current) return;
      setWeather(weatherData);
      setLastUpdate(new Date());

      // Cache the fresh data
      cacheWeather(weatherData);
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('Weather fetch error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      if (!silent && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [cacheWeather]);

  useEffect(() => {
    isMountedRef.current = true;
    // Try to load cached weather first for instant display
    const cachedWeather = loadCachedWeather();

    if (cachedWeather) {
      // Show cached data immediately (instant load!)
      setWeather(cachedWeather);
      setLoading(false);

      // Fetch fresh data in background (silent update)
      fetchWeather(true);
    } else {
      // No cache, fetch normally
      fetchWeather(false);
    }

    // Set up hourly refresh (3600000ms = 1 hour)
    const interval = setInterval(() => {
      fetchWeather(true); // Silent background refresh
    }, 3600000);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
      clearInterval(interval);
    };
  }, [fetchWeather, loadCachedWeather]);

  return {
    weather,
    loading,
    error,
    lastUpdate
  };
}
