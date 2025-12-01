'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { Map as LeafletMapInstance, LayerGroup, Marker as LeafletMarker } from 'leaflet'
import type { NewsItem } from '@/lib/types'
import { getCategoryIcon } from '@/lib/categories'
import MapInfoCard from './MapInfoCard'

interface ColumnMapViewProps {
  items: NewsItem[]
  selectedItemId?: string | null
  onSelectItem: (item: NewsItem, userInitiated?: boolean) => void
  emptyState?: React.ReactNode
  userInitiatedSelection?: boolean
}

const DEFAULT_CENTER: [number, number] = [62, 16]

function getNewsValueColor(newsValue: number) {
  if (newsValue >= 5) return '#DC2626'
  if (newsValue >= 4) return '#EA580C'
  if (newsValue >= 3) return '#F59E0B'
  return '#6B7280'
}

// getCategorySymbol moved to lib/categories.ts
// Using getCategoryIcon instead for standardized category icons

export default function ColumnMapView({ items, selectedItemId, onSelectItem, emptyState, userInitiatedSelection }: ColumnMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null)
  const markersLayerRef = useRef<LayerGroup | null>(null)
  const leafletRef = useRef<typeof import('leaflet') | null>(null)
  const markersRef = useRef<Map<string, { marker: LeafletMarker; item: NewsItem }>>(new Map())
  const infoCardTimeoutRef = useRef<number | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [showInfoCard, setShowInfoCard] = useState(false)
  const hasUserInteractedRef = useRef(false)
  const previousLocationRef = useRef<[number, number] | null>(null)

  const clearInfoCardTimeout = useCallback(() => {
    if (infoCardTimeoutRef.current !== null) {
      window.clearTimeout(infoCardTimeoutRef.current)
      infoCardTimeoutRef.current = null
    }
  }, [])

  const scheduleInfoCard = useCallback((delay: number) => {
    if (!hasUserInteractedRef.current) return
    clearInfoCardTimeout()
    infoCardTimeoutRef.current = window.setTimeout(() => {
      setShowInfoCard(true)
      infoCardTimeoutRef.current = null
    }, delay)
  }, [clearInfoCardTimeout])

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

      // Clean up markers first
      markerStore.clear()
      if (layerStore) {
        layerStore.clearLayers()
      }

      // Only remove the map instance once (prefer the ref)
      const mapToRemove = mapInstanceRef.current || mapInstance
      if (mapToRemove) {
        try {
          mapToRemove.remove()
        } catch {
          // Map may already be removed, ignore errors
          console.debug('Map cleanup: instance already removed')
        }
        mapInstanceRef.current = null
      }

      markersLayerRef.current = null
      leafletRef.current = null
      setIsReady(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      clearInfoCardTimeout()
    }
  }, [clearInfoCardTimeout])

  const createMarkerIcon = useMemo(() => {
    return (item: NewsItem, isSelected: boolean) => {
      const L = leafletRef.current
      if (!L) return undefined
      const color = getNewsValueColor(item.newsValue)
      const symbol = getCategoryIcon(item.category)
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

      marker.on('click', () => {
        hasUserInteractedRef.current = true
        onSelectItem(item, true)
      })

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

    if (userInitiatedSelection) {
      hasUserInteractedRef.current = true
    }

    let targetLocation: [number, number] | null = null

    markersRef.current.forEach(({ marker, item }) => {
      const isSelected = item.dbId === selectedItemId
      const icon = createMarkerIcon(item, isSelected)
      if (icon) {
        marker.setIcon(icon)
      }

      if (
        isSelected &&
        item.location?.coordinates?.length === 2 &&
        typeof item.location.coordinates[0] === 'number' &&
        typeof item.location.coordinates[1] === 'number' &&
        !Number.isNaN(item.location.coordinates[0]) &&
        !Number.isNaN(item.location.coordinates[1])
      ) {
        targetLocation = [item.location.coordinates[0], item.location.coordinates[1]]
      }
    })

    if (!selectedItemId || !targetLocation) {
      if (!selectedItemId) {
        setShowInfoCard(false)
      }
      clearInfoCardTimeout()
      return
    }

    const previousLocation = previousLocationRef.current
    const currentZoom = map.getZoom()
    const targetLatLng = L.latLng(targetLocation)
    const previousLatLng = previousLocation ? L.latLng(previousLocation) : null

    map.stop()

    if (!previousLatLng || !hasUserInteractedRef.current) {
      const focusZoom = Math.max(currentZoom, 11)
      map.flyTo(targetLatLng, focusZoom, {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.25
      })

      if (hasUserInteractedRef.current) {
        scheduleInfoCard(200)
      }

      previousLocationRef.current = targetLocation
      return
    }

    const distanceKm = previousLatLng.distanceTo(targetLatLng) / 1000

    // Nearby items (< 50km) - Smooth transition
    if (distanceKm <= 50) {
      // Keep current zoom if we are already zoomed in enough, otherwise ensure at least zoom 11
      const targetZoom = Math.max(currentZoom, 11)
      
      map.flyTo(targetLatLng, targetZoom, {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.25 // Higher value = flatter flight path (less zoom out)
      })
      scheduleInfoCard(300)
    } 
    // Distant items - Google Earth style (Zoom out -> Pan -> Zoom in)
    else {
      // Always go to a good viewing zoom level for the target
      const targetZoom = 11
      
      map.flyTo(targetLatLng, targetZoom, {
        animate: true,
        duration: 3.0, // Longer duration for the "flight"
        easeLinearity: 0.1 // Low value = deep parabolic flight path (significant zoom out)
      })
      scheduleInfoCard(1500) // Show card later since animation takes longer
    }

    previousLocationRef.current = targetLocation
  }, [selectedItemId, createMarkerIcon, isReady, userInitiatedSelection, scheduleInfoCard, clearInfoCardTimeout])

  // Get the selected item object
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null
    return items.find(item => item.dbId === selectedItemId) || null
  }, [selectedItemId, items])

  const handleCloseInfoCard = () => {
    clearInfoCardTimeout()
    setShowInfoCard(false)
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {items.length === 0 && emptyState && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur">
          {emptyState}
        </div>
      )}
      {showInfoCard && selectedItem && (
        <MapInfoCard item={selectedItem} onClose={handleCloseInfoCard} />
      )}
    </div>
  )
}
