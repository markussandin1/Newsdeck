import React from 'react';
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

interface WeatherStripProps {
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

export function WeatherStrip({ cities, className = '' }: WeatherStripProps) {
  if (cities.length === 0) {
    return null;
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex weather-ticker-animate">
        {/* Render cities three times for seamless infinite loop */}
        {[...cities, ...cities, ...cities].map((cityData, i) => (
          <WeatherCityPill
            key={`${cityData.city}-${i}`}
            {...cityData}
          />
        ))}
      </div>
    </div>
  );
}
