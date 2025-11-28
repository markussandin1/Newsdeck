export interface WeatherData {
  city: string;
  temperature: number;
  weatherSymbol: number;
  icon: string;
  timestamp: string;
}

export interface SMHIForecastResponse {
  approvedTime: string;
  referenceTime: string;
  geometry: {
    type: string;
    coordinates: [number, number, number];
  };
  timeSeries: SMHITimeSeries[];
}

export interface SMHITimeSeries {
  validTime: string;
  parameters: SMHIForecastParameter[];
}

export interface SMHIForecastParameter {
  name: string;
  levelType: string;
  level: number;
  unit: string;
  values: number[];
}

export interface CityCoordinates {
  name: string;
  lat: number;
  lon: number;
}
