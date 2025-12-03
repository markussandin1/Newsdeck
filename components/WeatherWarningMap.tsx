'use client';

import { useEffect, useRef, useState } from 'react';
import type { WeatherWarning } from '@/types/weather';
import type { Map as LeafletMapInstance, LayerGroup } from 'leaflet';
import type { SMHISeverity } from './SMHIWarningIcon';

interface WeatherWarningMapProps {
  warnings: WeatherWarning[];
  selectedWarning?: WeatherWarning | null;
  height?: string;
  onMarkerClick?: (warning: WeatherWarning) => void;
  resetToSweden?: boolean; // When true, reset map to default Sweden view
}

// Approximate coordinates for Swedish regions/cities
const locationLookup: Record<string, [number, number]> = {
  'Stockholm': [59.33, 18.06],
  'Göteborg': [57.70, 11.97],
  'Malmö': [55.60, 13.00],
  'Uppsala': [59.85, 17.63],
  'Västerås': [59.61, 16.55],
  'Örebro': [59.27, 15.21],
  'Linköping': [58.41, 15.62],
  'Helsingborg': [56.04, 12.69],
  'Jönköping': [57.78, 14.15],
  'Norrköping': [58.59, 16.19],
  'Lund': [55.70, 13.19],
  'Umeå': [63.82, 20.25],
  'Gävle': [60.67, 17.14],
  'Borås': [57.72, 12.93],
  'Eskilstuna': [59.36, 16.50],
  'Karlstad': [59.37, 13.50],
  'Växjö': [56.87, 14.80],
  'Halmstad': [56.67, 12.85],
  // Regions
  'Norrland': [64, 18],
  'Norrbotten': [67, 20],
  'Svealand': [60, 16],
  'Götaland': [58, 14],
  'Västra Götaland': [58, 13],
  'Skåne': [56, 13.5],
  'Halland': [57, 12.5],
  'Blekinge': [56.16, 15.05],
  'Dalarna': [61, 14.5],
  'Gävleborg': [61.5, 16],
  'Jämtland': [63, 14.5],
  'Västerbotten': [65, 17],
  'Västernorrland': [63, 17.5],
};

function getWarningLocation(warning: WeatherWarning): [number, number] | null {
  // Try to match area names against lookup table
  for (const area of warning.areas) {
    for (const [name, coords] of Object.entries(locationLookup)) {
      if (area.toLowerCase().includes(name.toLowerCase())) {
        return coords;
      }
    }
  }
  // Default to center of Sweden if no match
  return [62, 15];
}

export function WeatherWarningMap({
  warnings,
  selectedWarning,
  height = '100%',
  onMarkerClick,
  resetToSweden = false
}: WeatherWarningMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const polygonsLayerRef = useRef<LayerGroup | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    const init = async () => {
      // Load Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }

      const { default: L } = await import('leaflet');

      // Fix default icons
      const defaultIconPrototype = L.Icon.Default.prototype as any;
      delete defaultIconPrototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
      });

      // Check if container already has leaflet initialized (defensive check)
      const container = containerRef.current!;
      if ((container as any)._leaflet_id) {
        return;
      }

      // Initialize map centered on Sweden
      const map = L.map(container, {
        center: [62, 15], // Center of Sweden
        zoom: 4,
        minZoom: 4,
        maxZoom: 12,
        zoomControl: true
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
      setIsReady(true);
    };

    init();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Add polygons for warning areas
  useEffect(() => {
    if (!isReady || !mapInstanceRef.current) return;

    const addPolygons = async () => {
      const map = mapInstanceRef.current!;
      const L = (await import('leaflet')).default;

      // Clear existing polygons
      if (polygonsLayerRef.current) {
        polygonsLayerRef.current.clearLayers();
      } else {
        polygonsLayerRef.current = L.layerGroup().addTo(map);
      }

      const layer = polygonsLayerRef.current;

      // Color mapping for severities
      const colors: Record<string, string> = {
        'Moderate': '#facc15',
        'Severe': '#f97316',
        'Extreme': '#ef4444'
      };

      // Add polygon for each warning
      warnings.forEach(warning => {
        if (!warning.geometry) return;

        const color = colors[warning.severity] || '#facc15';
        const isSelected = warning.id === selectedWarning?.id;

        try {
          // GeoJSON uses [lng, lat] but Leaflet uses [lat, lng]
          const swapCoordinates = (coords: any): any => {
            if (typeof coords[0] === 'number') {
              return [coords[1], coords[0]];
            }
            return coords.map(swapCoordinates);
          };

          const leafletCoords = swapCoordinates(warning.geometry.coordinates);

          const polygon = L.polygon(leafletCoords, {
            color: isSelected ? '#3b82f6' : color,
            fillColor: color,
            fillOpacity: isSelected ? 0.3 : 0.2,
            weight: isSelected ? 3 : 2,
            opacity: 0.8
          });

          polygon.bindTooltip(warning.headline, {
            sticky: true,
            opacity: 0.95
          });

          if (onMarkerClick) {
            polygon.on('click', () => {
              onMarkerClick(warning);
            });
          }

          polygon.addTo(layer);
        } catch (error) {
          console.error('Error rendering polygon for warning:', warning.id, error);
        }
      });
    };

    addPolygons();
  }, [warnings, selectedWarning, isReady, onMarkerClick]);


  // Reset to Sweden view when requested
  useEffect(() => {
    if (!isReady || !mapInstanceRef.current || !resetToSweden) return;

    const map = mapInstanceRef.current;
    map.flyTo([62, 15], 4, {
      animate: true,
      duration: 1.5
    });
  }, [resetToSweden, isReady]);

  // Fly to selected warning
  useEffect(() => {
    if (!isReady || !mapInstanceRef.current || !selectedWarning) return;

    const flyToWarning = async () => {
      const map = mapInstanceRef.current!;
      const L = (await import('leaflet')).default;

      // If warning has geometry, fit bounds to polygon
      if (selectedWarning.geometry) {
        try {
          const swapCoordinates = (coords: any): any => {
            if (typeof coords[0] === 'number') {
              return [coords[1], coords[0]];
            }
            return coords.map(swapCoordinates);
          };

          const leafletCoords = swapCoordinates(selectedWarning.geometry.coordinates);
          const polygon = L.polygon(leafletCoords);
          const bounds = polygon.getBounds();

          map.flyToBounds(bounds, {
            animate: true,
            duration: 1.5,
            padding: [50, 50]
          });
        } catch (error) {
          console.error('Error flying to polygon bounds:', error);
        }
      } else {
        // Fallback to center point
        const location = getWarningLocation(selectedWarning);
        if (location) {
          map.flyTo(location, 8, {
            animate: true,
            duration: 1.5
          });
        }
      }
    };

    flyToWarning();
  }, [selectedWarning, isReady]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-lg border border-border"
      style={{ height }}
    />
  );
}
