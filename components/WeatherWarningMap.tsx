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
  onMarkerClick
}: WeatherWarningMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
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

      // Initialize map centered on Sweden
      const map = L.map(containerRef.current!, {
        center: [62, 15], // Center of Sweden
        zoom: 5,
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

  // Add markers for warnings
  useEffect(() => {
    if (!isReady || !mapInstanceRef.current) return;

    const addMarkers = async () => {
      const map = mapInstanceRef.current!;
      const L = (await import('leaflet')).default;

      // Clear existing markers
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      } else {
        markersLayerRef.current = L.layerGroup().addTo(map);
      }

      const layer = markersLayerRef.current;
      const bounds: [number, number][] = [];

      // Create severity-colored divIcons
      const createMarkerIcon = (severity: string, isSelected: boolean) => {
        const colors: Record<string, string> = {
          'Moderate': '#facc15',
          'Severe': '#f97316',
          'Extreme': '#ef4444'
        };
        const color = colors[severity] || '#facc15';
        const size = isSelected ? 16 : 12;
        const ringColor = isSelected ? '#3b82f6' : '#ffffff';

        return L.divIcon({
          className: 'weather-marker',
          html: `<div style="
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border: 2px solid ${ringColor};
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        });
      };

      // Add markers for each warning
      warnings.forEach(warning => {
        const location = getWarningLocation(warning);
        if (!location) return;

        const [lat, lng] = location;
        const isSelected = warning.id === selectedWarning?.id;

        const marker = L.marker([lat, lng], {
          icon: createMarkerIcon(warning.severity, isSelected)
        });

        // Tooltip on hover
        marker.bindTooltip(warning.headline, {
          direction: 'top',
          offset: [0, -8],
          opacity: 0.95
        });

        // Click handler
        if (onMarkerClick) {
          marker.on('click', () => {
            onMarkerClick(warning);
          });
        }

        marker.addTo(layer);
        bounds.push([lat, lng]);
      });

      // Fit map to show all markers
      if (bounds.length > 0) {
        const mapBounds = L.latLngBounds(bounds);
        map.fitBounds(mapBounds.pad(0.1), { maxZoom: 7 });
      }
    };

    addMarkers();
  }, [warnings, selectedWarning, isReady, onMarkerClick]);

  // Fly to selected warning
  useEffect(() => {
    if (!isReady || !mapInstanceRef.current || !selectedWarning) return;

    const flyToWarning = async () => {
      const map = mapInstanceRef.current!;
      const L = (await import('leaflet')).default;
      const location = getWarningLocation(selectedWarning);
      if (!location) return;

      map.flyTo(location, 8, {
        animate: true,
        duration: 1.5
      });
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
