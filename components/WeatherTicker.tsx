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
    <div className={`overflow-hidden ${className}`}>
      <div className="flex gap-2 weather-ticker-animate">
        {/* Render cities twice for seamless infinite loop */}
        {cities.map((city, i) => (
          <WeatherCityCard
            key={`${city.city}-1-${i}`}
            city={city.city}
            temperature={city.temperature}
            icon={city.icon}
          />
        ))}
        {cities.map((city, i) => (
          <WeatherCityCard
            key={`${city.city}-2-${i}`}
            city={city.city}
            temperature={city.temperature}
            icon={city.icon}
          />
        ))}
      </div>
    </div>
  );
}
