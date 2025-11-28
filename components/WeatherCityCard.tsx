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
  type LucideIcon
} from 'lucide-react';

interface WeatherCityCardProps {
  city: string;
  temperature: number;
  icon: string;
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
  CloudSnow
};

export function WeatherCityCard({ city, temperature, icon }: WeatherCityCardProps) {
  const IconComponent = iconMap[icon] || Cloud;

  return (
    <div className="flex items-center gap-2 px-3 py-1 shrink-0">
      <IconComponent className="h-4 w-4 text-primary-light" />
      <span className="text-sm font-medium text-foreground whitespace-nowrap">{city}</span>
      <span className="text-sm text-muted-foreground whitespace-nowrap">{temperature}°</span>
    </div>
  );
}
