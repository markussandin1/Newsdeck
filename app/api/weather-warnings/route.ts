import { NextResponse } from 'next/server';
import type { SMHIWarning, SMHIWarningAreaDetail, WeatherWarning } from '@/types/weather';

// Simple in-memory cache for weather warnings
let warningsCache: { data: { warnings: WeatherWarning[]; cachedAt: string }; timestamp: number } | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in ms
const API_URL = 'https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json';

const LEVEL_MAP: Record<
  string,
  { severity: WeatherWarning['severity']; label: string; description: string }
> = {
  YELLOW: {
    severity: 'Moderate',
    label: 'Gul varning',
    description:
      'Vädret kan medföra konsekvenser för samhället, som störningar i kollektivtrafiken eller risk för skador på egendom.',
  },
  ORANGE: {
    severity: 'Severe',
    label: 'Orange varning',
    description:
      'Vädret förväntas få allvarliga konsekvenser för samhället och innebär en fara för allmänheten.',
  },
  RED: {
    severity: 'Extreme',
    label: 'Röd varning',
    description:
      'Vädret är en stor fara för allmänheten och kan orsaka mycket allvarliga skador på egendom och miljö.',
  },
};

function mapLevel(code?: string) {
  if (!code) return LEVEL_MAP.YELLOW;
  return LEVEL_MAP[code] ?? LEVEL_MAP.YELLOW;
}

function normalizeWarningArea(raw: SMHIWarning, area: SMHIWarningAreaDetail): WeatherWarning | null {
  const headlineBase = raw.event?.sv || raw.event?.en || 'Vädervarning';
  const areaName = area.areaName?.sv || area.areaName?.en;

  const primaryDescription =
    area.eventDescription?.sv ||
    area.eventDescription?.en ||
    raw.event?.sv ||
    raw.event?.en ||
    '';

  const extraDescriptions = (area.descriptions || [])
    .map((d) => d.text?.sv || d.text?.en)
    .filter(Boolean);

  const description = [primaryDescription, ...extraDescriptions].filter(Boolean).join('\n\n') || 'Ingen beskrivning tillgänglig.';

  const instructionEntry = (area.descriptions || []).find(
    (d) => d.title?.code === 'AFFECT' || (d.title?.sv || '').toLowerCase().includes('tänk') || (d.title?.en || '').toLowerCase().includes('think')
  );

  const instruction = instructionEntry?.text?.sv || instructionEntry?.text?.en;

  const areas = [
    areaName,
    ...(area.affectedAreas || []).map((a) => a.sv || a.en).filter(Boolean),
  ].filter(Boolean);

  const level = mapLevel(area.warningLevel?.code);

  return {
    id: `${raw.id}-${area.id}`,
    headline: areaName ? `${headlineBase} – ${areaName}` : headlineBase,
    description,
    severity: level.severity,
    severityLabel: level.label,
    severityDescription: level.description,
    areas,
    language: 'sv',
    web: undefined,
    instruction,
    approximateStart: area.approximateStart,
    approximateEnd: area.approximateEnd,
    event: raw.event?.sv || raw.event?.en,
    geometry: area.area?.geometry,
  };
}

async function fetchWarnings(): Promise<WeatherWarning[] | null> {
  try {
    // Using a User-Agent is good practice
    const response = await fetch(API_URL, {
      headers: {
        'User-Agent': 'Newsdeck/1.0 (weather@newsdeck.se)',
      },
      next: { revalidate: 900 } // Cache for 15 minutes in Next.js
    });

    if (!response.ok) {
      console.error(`SMHI Warning API error:`, response.status, response.statusText);
      return null;
    }

    const data: SMHIWarning[] = await response.json();

    const normalized = (Array.isArray(data) ? data : [])
      .flatMap((warning) =>
        (warning.warningAreas || []).map((area) => normalizeWarningArea(warning, area)).filter((w): w is WeatherWarning => Boolean(w))
      );

    return normalized;

  } catch (error) {
    console.error('Error fetching weather warnings:', error);
    return null;
  }
}

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if valid
    if (warningsCache && (now - warningsCache.timestamp) < CACHE_DURATION) {
      return NextResponse.json(warningsCache.data);
    }

    const warnings = await fetchWarnings();

    if (warnings === null) {
      return NextResponse.json(
        { error: 'Failed to fetch weather warnings' },
        { status: 500 }
      );
    }

    const responseData = {
      warnings: warnings,
      cachedAt: new Date().toISOString()
    };

    // Update cache
    warningsCache = {
      data: responseData,
      timestamp: now
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Weather Warnings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
