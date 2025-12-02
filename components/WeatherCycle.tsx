'use client';

import { useState, useEffect } from 'react';
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
import type { WeatherData } from '@/types/weather';

interface WeatherCycleProps {
  cities: WeatherData[];
  displayDuration?: number;
  fadeDuration?: number;
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

export function WeatherCycle({
  cities,
  displayDuration = 5000,
  fadeDuration = 800,
  className = '',
}: WeatherCycleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const currentCity = cities[currentIndex] || cities[0];
  const nextCity = cities[nextIndex] || cities[0];

  useEffect(() => {
    if (cities.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);

      // After fade completes, update indices and reset
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setNextIndex((nextIndex + 1) % cities.length);
        setIsTransitioning(false);
      }, fadeDuration);
    }, displayDuration);

    return () => clearInterval(interval);
  }, [cities.length, displayDuration, fadeDuration, isPaused, nextIndex]);

  if (!currentCity) return null;

  const CurrentIcon = currentCity ? iconMap[currentCity.icon] || Cloud : Cloud;
  const NextIcon = nextCity ? iconMap[nextCity.icon] || Cloud : Cloud;

  return (
    <div
      className={`relative h-10 overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      tabIndex={0}
      role="status"
      aria-live="polite"
      aria-label={`Väder: ${currentCity.city}, ${currentCity.temperature} grader`}
    >
      {/* Current city - fades out */}
      <div
        className={`absolute inset-0 flex items-center gap-2 transition-opacity duration-[800ms] ease-in-out ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <CurrentIcon className="h-5 w-5 text-primary-light shrink-0" />
        <span className="text-sm font-medium text-foreground whitespace-nowrap">
          {currentCity.city}
        </span>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {currentCity.temperature}°
        </span>
      </div>

      {/* Next city - fades in */}
      <div
        className={`absolute inset-0 flex items-center gap-2 transition-opacity duration-[800ms] ease-in-out ${
          isTransitioning ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <NextIcon className="h-5 w-5 text-primary-light shrink-0" />
        <span className="text-sm font-medium text-foreground whitespace-nowrap">
          {nextCity.city}
        </span>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {nextCity.temperature}°
        </span>
      </div>
    </div>
  );
}
