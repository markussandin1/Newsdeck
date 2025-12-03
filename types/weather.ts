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

// Types for SMHI Weather Warnings (new JSON structure at https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json)

export interface SMHIWarning {
  id: number;
  normalProbability: boolean;
  event: {
    sv?: string;
    en?: string;
    code?: string;
    mhoClassification?: {
      sv?: string;
      en?: string;
      code?: string;
    };
  };
  descriptions: SMHIWarningDescription[];
  warningAreas: SMHIWarningAreaDetail[];
}

export interface SMHIWarningDescription {
  title?: SMHIWarningText;
  text?: SMHIWarningText;
}

export interface SMHIWarningText {
  sv?: string;
  en?: string;
  code?: string;
}

export interface SMHIWarningAreaDetail {
  id: number;
  approximateStart?: string;
  approximateEnd?: string;
  published?: string;
  normalProbability: boolean;
  pushNotice: boolean;
  areaName?: SMHIWarningText;
  warningLevel?: {
    sv?: string;
    en?: string;
    code?: 'YELLOW' | 'ORANGE' | 'RED' | string;
  };
  eventDescription?: SMHIWarningText;
  affectedAreas?: {
    id: number;
    sv?: string;
    en?: string;
  }[];
  descriptions: SMHIWarningDescription[];
  area?: {
    type: string;
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: number[][][] | number[][][][];
    };
  };
  created?: string;
}

// Normalized warning shape used by the UI
export interface WeatherWarning {
  id: string;
  headline: string;
  description: string;
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Extreme' | string;
  severityLabel?: string; // e.g., Gul, Orange, Röd
  severityDescription?: string; // Swedish description of the level
  areas: string[];
  language: string;
  web?: string;
  instruction?: string;
  approximateStart?: string; // ISO 8601 timestamp
  approximateEnd?: string; // ISO 8601 timestamp
  event?: string; // Warning type (e.g., "Plötslig ishalka", "Kuling")
  geometry?: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}
