'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMapInstance, Marker as LeafletMarker } from 'leaflet'

interface StaticMapThumbProps {
  lat: number
  lng: number
  zoom?: number
  markerColor?: string
  placeLabel?: string
}

export default function StaticMapThumb({
  lat,
  lng,
  zoom = 11,
  markerColor = '#dc2626',
  placeLabel,
}: StaticMapThumbProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const initRef = useRef(false)

  useEffect(() => {
    const container = mapRef.current
    if (!container || initRef.current) return

    const init = async () => {
      initRef.current = true

      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        document.head.appendChild(link)
      }

      const { default: L } = await import('leaflet')

      const map = L.map(container, {
        center: [lat, lng],
        zoom,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      const icon = L.divIcon({
        className: 'static-map-marker',
        html: `<span style="
          display:block;width:22px;height:22px;border-radius:50%;
          background:${markerColor};border:3px solid #0b0d10;
          box-shadow:0 0 0 0 ${markerColor}99;
          animation:nd-marker-pulse 2s infinite;
        "></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })

      markerRef.current = L.marker([lat, lng], { icon, interactive: false }).addTo(map)
      mapInstanceRef.current = map
    }

    init()

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
      markerRef.current = null
      initRef.current = false
    }
  }, [lat, lng, zoom, markerColor])

  return (
    <div className="nd-gv-hero-map">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {placeLabel && <div className="nd-gv-hero-loc">{placeLabel}</div>}
    </div>
  )
}
