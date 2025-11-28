import { NextResponse } from 'next/server';
import type { CityCoordinates, SMHIForecastResponse, WeatherData } from '@/types/weather';
import { getWeatherIcon } from '@/lib/utils/weatherIcons';

const CITIES: CityCoordinates[] = [
  { name: 'Kiruna', lat: 67.8558, lon: 20.2253 },
  { name: 'Luleå', lat: 65.5848, lon: 22.1547 },
  { name: 'Umeå', lat: 63.8258, lon: 20.2630 },
  { name: 'Domsjö', lat: 63.3091, lon: 18.8397 },
  { name: 'Östersund', lat: 63.1792, lon: 14.6357 },
  { name: 'Sundsvall', lat: 62.3908, lon: 17.3069 },
  { name: 'Gävle', lat: 60.6749, lon: 17.1414 },
  { name: 'Falun', lat: 60.6036, lon: 15.6260 },
  { name: 'Stockholm', lat: 59.3293, lon: 18.0686 },
  { name: 'Uppsala', lat: 59.8586, lon: 17.6389 },
  { name: 'Västerås', lat: 59.6099, lon: 16.5448 },
  { name: 'Örebro', lat: 59.2753, lon: 15.2134 },
  { name: 'Norrköping', lat: 58.5877, lon: 16.1924 },
  { name: 'Linköping', lat: 58.4108, lon: 15.6214 },
  { name: 'Jönköping', lat: 57.7815, lon: 14.1562 },
  { name: 'Göteborg', lat: 57.7089, lon: 11.9746 },
  { name: 'Jönköping', lat: 57.7826, lon: 14.1618 },
  { name: 'Borås', lat: 57.7210, lon: 12.9404 },
  { name: 'Halmstad', lat: 56.6745, lon: 12.8566 },
  { name: 'Malmö', lat: 55.6050, lon: 13.0038 }
];

// Simple in-memory cache
let weatherCache: { data: { weather: WeatherData[]; cachedAt: string }; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms

async function fetchWeatherForCity(city: CityCoordinates): Promise<WeatherData | null> {
  try {
    const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${city.lon}/lat/${city.lat}/data.json`;

    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour in Next.js
    });

    if (!response.ok) {
      console.error(`SMHI API error for ${city.name}:`, response.status);
      return null;
    }

    const data: SMHIForecastResponse = await response.json();

    // Get the first (current/nearest) forecast
    const currentForecast = data.timeSeries[0];
    if (!currentForecast) {
      console.error(`No forecast data for ${city.name}`);
      return null;
    }

    // Extract temperature and weather symbol
    const tempParam = currentForecast.parameters.find(p => p.name === 't');
    const symbolParam = currentForecast.parameters.find(p => p.name === 'Wsymb2');

    const temperature = tempParam?.values[0] ?? 0;
    const weatherSymbol = symbolParam?.values[0] ?? 1;
    const weatherInfo = getWeatherIcon(weatherSymbol);

    return {
      city: city.name,
      temperature: Math.round(temperature),
      weatherSymbol,
      icon: weatherInfo.icon,
      timestamp: currentForecast.validTime
    };
  } catch (error) {
    console.error(`Error fetching weather for ${city.name}:`, error);
    return null;
  }
}

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if valid
    if (weatherCache && (now - weatherCache.timestamp) < CACHE_DURATION) {
      return NextResponse.json(weatherCache.data);
    }

    // Fetch weather data for all cities in parallel
    const weatherPromises = CITIES.map(city => fetchWeatherForCity(city));
    const weatherResults = await Promise.all(weatherPromises);

    // Filter out any null results (failed fetches)
    const validWeather = weatherResults.filter((w): w is WeatherData => w !== null);

    if (validWeather.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch weather data' },
        { status: 500 }
      );
    }

    const responseData = {
      weather: validWeather,
      cachedAt: new Date().toISOString()
    };

    // Update cache
    weatherCache = {
      data: responseData,
      timestamp: now
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
