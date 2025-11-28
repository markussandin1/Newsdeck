import React from 'react';
import { WeatherCityCard } from './WeatherCityCard';
import type { WeatherData } from '@/types/weather';

interface WeatherTickerProps {
  cities: WeatherData[];
  className?: string;
}

export function WeatherTicker({ cities, className = '' }: WeatherTickerProps) {
  if (cities.length === 0) {
    return null;
  }

  return (
    <div className={`flex weather-ticker-animate ${className}`}>
      {/* Render cities three times for seamless infinite loop */}
      {[...cities, ...cities, ...cities].map((city, i) => (
        <WeatherCityCard
          key={`${city.city}-${i}`}
          city={city.city}
          temperature={city.temperature}
          icon={city.icon}
        />
      ))}
    </div>
  );
}
