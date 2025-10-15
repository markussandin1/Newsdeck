'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as LeafletMapInstance, LayerGroup, Marker as LeafletMarker } from 'leaflet'
import type { NewsItem } from '@/lib/types'

interface ColumnMapViewProps {
  items: NewsItem[]
  selectedItemId?: string | null
  onSelectItem: (item: NewsItem) => void
  emptyState?: React.ReactNode
}

const DEFAULT_CENTER: [number, number] = [62, 16]

function getNewsValueColor(newsValue: number) {
  if (newsValue >= 5) return '#DC2626'
  if (newsValue >= 4) return '#EA580C'
  if (newsValue >= 3) return '#F59E0B'
  return '#6B7280'
}

function getCategorySymbol(category?: string) {
  if (!category) return '📍'
  const value = category.toLowerCase()
  if (value.includes('brand') || value.includes('fire')) return '🔥'
  if (value.includes('oly') || value.includes('accident') || value.includes('trafik') || value.includes('traffic')) return '🚗'
  if (value.includes('crime') || value.includes('polis') || value.includes('brott')) return '🚔'
  if (value.includes('weather') || value.includes('väder') || value.includes('storm')) return '🌧️'
  if (value.includes('rescue') || value.includes('rädd')) return '🆘'
  return '📍'
}

export default function ColumnMapView({ items, selectedItemId, onSelectItem, emptyState }: ColumnMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null)
  const markersLayerRef = useRef<LayerGroup | null>(null)
  const leafletRef = useRef<typeof import('leaflet') | null>(null)
  const markersRef = useRef<Map<string, { marker: LeafletMarker; item: NewsItem }>>(new Map())
  const [isReady, setIsReady] = useState(false)

  // Initialize map only once
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return

    let isCancelled = false
    let mapInstance: LeafletMapInstance | null = null

    const init = async () => {
      const container = containerRef.current
      if (!container) return

      // Load Leaflet styles on demand
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        document.head.appendChild(link)
      }

      const { default: L } = await import('leaflet')

      // Check if cancelled after async operation
      if (isCancelled) return

      leafletRef.current = L

      const defaultIconPrototype = L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string }
      delete defaultIconPrototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
      })

      // Check again before DOM manipulation
      if (isCancelled || !containerRef.current) return

      mapInstance = L.map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 5,
        minZoom: 4,
        maxZoom: 15
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance)

      markersLayerRef.current = L.layerGroup().addTo(mapInstance)
      mapInstanceRef.current = mapInstance

      mapInstance.attributionControl.setPrefix('')
      setIsReady(true)
    }

    init()

    // Capture current values for cleanup
    const markerStore = markersRef.current
    const layerStore = markersLayerRef.current

    return () => {
      isCancelled = true

      // Clean up map instance created in this effect
      if (mapInstance) {
        mapInstance.remove()
      }
      // Also clean up ref in case it was set
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      markerStore.clear()
      if (layerStore) {
        layerStore.clearLayers()
      }
      markersLayerRef.current = null
      leafletRef.current = null
    }
  }, [])

  const createMarkerIcon = useMemo(() => {
    return (item: NewsItem, isSelected: boolean) => {
      const L = leafletRef.current
      if (!L) return undefined
      const color = getNewsValueColor(item.newsValue)
      const symbol = getCategorySymbol(item.category)
      const ringColor = isSelected ? '#1D4ED8' : '#FFFFFF'

      const html = `
        <div style="
          display:flex;
          align-items:center;
          justify-content:center;
          width:32px;
          height:32px;
          border-radius:9999px;
          border:2px solid ${ringColor};
          background:${color};
          color:#fff;
          box-shadow:0 4px 12px rgba(0,0,0,0.25);
          font-size:18px;
          line-height:1;
        ">
          <span style="transform:translateY(-1px);">${symbol}</span>
        </div>
      `

      return L.divIcon({
        className: 'newsdeck-map-pin',
        html,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      })
    }
  }, [])

  // Recreate markers when items change
  useEffect(() => {
    if (!isReady) return

    const map = mapInstanceRef.current
    const layer = markersLayerRef.current
    const L = leafletRef.current
    if (!map || !layer || !L) return

    layer.clearLayers()
    markersRef.current.clear()

    const bounds: [number, number][] = []

    items.forEach((item) => {
      if (!item.location?.coordinates || item.location.coordinates.length < 2) return
      const [lat, lng] = item.location.coordinates
      if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) return

      const marker = L.marker([lat, lng], {
        icon: createMarkerIcon(item, item.dbId === selectedItemId)
      })

      marker.on('click', () => onSelectItem(item))

      const timeValue = new Date(item.createdInDb || item.timestamp)
      const title = item.title || 'Okänd händelse'
      const tooltip = `${title}\n${timeValue.toLocaleString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
      })}`

      marker.bindTooltip(tooltip, {
        direction: 'top',
        offset: [0, -12],
        opacity: 0.95,
        className: 'newsdeck-map-tooltip'
      })

      marker.addTo(layer)
      markersRef.current.set(item.dbId, { marker, item })
      bounds.push([lat, lng])
    })

    if (bounds.length) {
      const mapBounds = L.latLngBounds(bounds)
      map.fitBounds(mapBounds.pad(0.08), { maxZoom: 11 })
    } else {
      map.setView(DEFAULT_CENTER, 5)
    }
  }, [items, createMarkerIcon, onSelectItem, selectedItemId, isReady])

  // Highlight selected item without recreating all markers
  useEffect(() => {
    if (!isReady) return

    const map = mapInstanceRef.current
    const L = leafletRef.current
    if (!map || !L) return

    markersRef.current.forEach(({ marker, item }) => {
      const isSelected = item.dbId === selectedItemId
      const icon = createMarkerIcon(item, isSelected)
      if (icon) {
        marker.setIcon(icon)
      }
      if (isSelected && item.location?.coordinates?.length === 2) {
        const [lat, lng] = item.location.coordinates
        map.panTo([lat, lng], { animate: true })
      }
    })
  }, [selectedItemId, createMarkerIcon, isReady])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {items.length === 0 && emptyState && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur">
          {emptyState}
        </div>
      )}
    </div>
  )
}
