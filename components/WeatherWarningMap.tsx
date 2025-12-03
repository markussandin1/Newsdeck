'use client';

import { useEffect, useRef, useState } from 'react';
import type { WeatherWarning } from '@/types/weather';
import type { Map as LeafletMapInstance } from 'leaflet';

interface WeatherWarningMapProps {
  warnings: WeatherWarning[];
  selectedWarning?: WeatherWarning | null;
  height?: string;
}

export function WeatherWarningMap({
  warnings,
  selectedWarning,
  height = '100%'
}: WeatherWarningMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
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

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-lg border border-border"
      style={{ height }}
    />
  );
}
