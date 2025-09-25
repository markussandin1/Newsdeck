'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMapInstance, Marker as LeafletMarker } from 'leaflet'

interface LeafletMapProps {
  lat: number
  lng: number
  height?: number
  zoom?: number
  onClick?: () => void
}

export default function LeafletMap({ lat, lng, height = 80, zoom = 15, onClick }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const isInitializedRef = useRef(false)

  // Initialize map only once
  useEffect(() => {
    const container = mapRef.current
    if (!container || isInitializedRef.current) return

    const initMap = async () => {
      // Load Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        document.head.appendChild(link)
      }

      // Dynamically import Leaflet to avoid SSR issues
      const { default: L } = await import('leaflet')

      // Fix for missing marker icons in webpack/Next.js
      const defaultIconPrototype = L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string }
      delete defaultIconPrototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
      })

      // Initialize map
      const map = L.map(container).setView([lat, lng], zoom)

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      // Add marker
      const marker = L.marker([lat, lng]).addTo(map)
      markerRef.current = marker

      // Disable map interactions for compact view
      map.dragging.disable()
      map.touchZoom.disable()
      map.doubleClickZoom.disable()
      map.scrollWheelZoom.disable()
      map.boxZoom.disable()
      map.keyboard.disable()

      mapInstanceRef.current = map
      isInitializedRef.current = true

      // Add click handler if provided
      if (onClick) {
        container.style.cursor = 'pointer'
        container.addEventListener('click', onClick)
      }
    }

    initMap()

    return () => {
      if (onClick && container) {
        container.removeEventListener('click', onClick)
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
        isInitializedRef.current = false
      }
    }
  }, [lat, lng, onClick, zoom])

  // Update map view and marker when coordinates change (without re-initializing)
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && isInitializedRef.current) {
      // Update map view
      mapInstanceRef.current.setView([lat, lng], zoom)

      // Update marker position
      markerRef.current.setLatLng([lat, lng])
    }
  }, [lat, lng, zoom])

  return (
    <div
      ref={mapRef}
      style={{ height: `${height}px`, width: '100%' }}
      className="rounded border border-slate-200"
    />
  )
}
