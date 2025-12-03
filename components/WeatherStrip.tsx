'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { useWeather } from '@/lib/hooks/useWeather';
import { useWeatherWarnings } from '@/lib/hooks/useWeatherWarnings';
import { WeatherWarningIndicator } from './WeatherWarningIndicator';
import { WeatherWarningModal } from './WeatherWarningModal';

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

function WeatherCityPill({ city, temperature, icon }: WeatherData) {
  const IconComponent = iconMap[icon] || Cloud;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 shrink-0">
      <IconComponent className="h-3.5 w-3.5 text-primary-light" />
      <span className="text-[13px] font-medium text-foreground whitespace-nowrap">
        {city}
      </span>
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">
        {temperature}°
      </span>
    </div>
  );
}

export function WeatherStrip({ className = '' }: { className?: string }) {
  const { weather, loading: isLoadingWeather } = useWeather();
  const { warnings, isLoading: isLoadingWarnings, error: warningsError } = useWeatherWarnings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(70); // Default 70s
  const contentRef = useRef<HTMLDivElement>(null);

  const hasWarnings = !warningsError && warnings.length > 0;

  // Rotate cities array to start from a random city
  const rotatedCities = React.useMemo(() => {
    if (weather.length === 0) return [];
    const startIndex = Math.floor(Math.random() * weather.length);
    return [...weather.slice(startIndex), ...weather.slice(0, startIndex)];
  }, [weather]);

  // Calculate animation duration based on content width
  useEffect(() => {
    if (!contentRef.current || rotatedCities.length === 0) return;

    // Measure the width of one set of cities (not all 3 repetitions)
    const children = Array.from(contentRef.current.children);
    const oneSetWidth = children.slice(0, rotatedCities.length).reduce((sum, child) => {
      return sum + (child as HTMLElement).offsetWidth;
    }, 0);

    // Calculate duration: want ~50 pixels per second for smooth, readable scroll
    // Since we move by 33.33% (one full set), we use oneSetWidth
    const pixelsPerSecond = 50;
    const duration = Math.max(oneSetWidth / pixelsPerSecond, 20); // Minimum 20s

    setAnimationDuration(duration);
  }, [rotatedCities]);

  if (isLoadingWeather) {
    return <div className={`h-8 ${className}`} />; // Placeholder for height
  }

  return (
    <>
      <div className={`flex items-center overflow-hidden ${className}`}>
        {!isLoadingWarnings && hasWarnings && (
          <WeatherWarningIndicator
            onClick={() => setIsModalOpen(true)}
            warningCount={warnings.length}
            warnings={warnings}
          />
        )}
        <div className="flex-grow overflow-hidden">
          <div
            ref={contentRef}
            className="flex weather-ticker-animate"
            style={{
              animationDuration: `${animationDuration}s`
            }}
          >
            {/* Render cities three times for seamless infinite loop */}
            {[...rotatedCities, ...rotatedCities, ...rotatedCities].map((cityData, i) => (
              <WeatherCityPill
                key={`${cityData.city}-${i}`}
                {...cityData}
              />
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <WeatherWarningModal 
          warnings={warnings} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
}
