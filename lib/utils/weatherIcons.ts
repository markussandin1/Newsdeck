export const weatherSymbolMap: Record<number, { icon: string; label: string }> = {
  1: { icon: 'Sun', label: 'Clear sky' },
  2: { icon: 'CloudSun', label: 'Nearly clear' },
  3: { icon: 'Cloud', label: 'Variable cloudiness' },
  4: { icon: 'Cloud', label: 'Halfclear sky' },
  5: { icon: 'Cloudy', label: 'Cloudy sky' },
  6: { icon: 'Cloudy', label: 'Overcast' },
  7: { icon: 'CloudFog', label: 'Fog' },
  8: { icon: 'CloudRain', label: 'Light rain showers' },
  9: { icon: 'CloudRain', label: 'Moderate rain showers' },
  10: { icon: 'CloudRain', label: 'Heavy rain showers' },
  11: { icon: 'CloudDrizzle', label: 'Thunderstorm' },
  12: { icon: 'CloudDrizzle', label: 'Light sleet showers' },
  13: { icon: 'CloudDrizzle', label: 'Moderate sleet showers' },
  14: { icon: 'CloudSnow', label: 'Heavy sleet showers' },
  15: { icon: 'CloudSnow', label: 'Light snow showers' },
  16: { icon: 'CloudSnow', label: 'Moderate snow showers' },
  17: { icon: 'CloudSnow', label: 'Heavy snow showers' },
  18: { icon: 'CloudRain', label: 'Light rain' },
  19: { icon: 'CloudRain', label: 'Moderate rain' },
  20: { icon: 'CloudRain', label: 'Heavy rain' },
  21: { icon: 'CloudDrizzle', label: 'Thunder' },
  22: { icon: 'CloudDrizzle', label: 'Light sleet' },
  23: { icon: 'CloudDrizzle', label: 'Moderate sleet' },
  24: { icon: 'CloudDrizzle', label: 'Heavy sleet' },
  25: { icon: 'CloudSnow', label: 'Light snowfall' },
  26: { icon: 'CloudSnow', label: 'Moderate snowfall' },
  27: { icon: 'CloudSnow', label: 'Heavy snowfall' }
};

export function getWeatherIcon(symbolCode: number): { icon: string; label: string } {
  return weatherSymbolMap[symbolCode] || { icon: 'Cloud', label: 'Unknown' };
}
