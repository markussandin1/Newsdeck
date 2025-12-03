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

export function WeatherCycle({ cities, className = '' }: WeatherCycleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Simple timer: increment index every 5 seconds
  useEffect(() => {
    if (cities.length <= 1 || isPaused) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cities.length);
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentIndex, cities.length, isPaused]);

  const city = cities[currentIndex];
  if (!city) return null;

  const Icon = iconMap[city.icon] || Cloud;

  return (
    <div
      className={`flex items-center gap-2 transition-opacity duration-500 ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      tabIndex={0}
      role="status"
      aria-live="polite"
      aria-label={`Väder: ${city.city}, ${city.temperature} grader`}
    >
      <Icon className="h-5 w-5 text-primary-light shrink-0" />
      <span className="text-sm font-medium text-foreground whitespace-nowrap">
        {city.city}
      </span>
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {city.temperature}°
      </span>
    </div>
  );
}
