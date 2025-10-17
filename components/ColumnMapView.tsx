'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as LeafletMapInstance, LayerGroup, Marker as LeafletMarker } from 'leaflet'
import type { NewsItem } from '@/lib/types'
import { getCategoryIcon } from '@/lib/categories'
import MapInfoCard from './MapInfoCard'

interface ColumnMapViewProps {
  items: NewsItem[]
  selectedItemId?: string | null
  onSelectItem: (item: NewsItem, userInitiated?: boolean) => void
  emptyState?: React.ReactNode
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

export default function ColumnMapView({ items, selectedItemId, onSelectItem, emptyState }: ColumnMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null)
  const markersLayerRef = useRef<LayerGroup | null>(null)
  const leafletRef = useRef<typeof import('leaflet') | null>(null)
  const markersRef = useRef<Map<string, { marker: LeafletMarker; item: NewsItem }>>(new Map())
  const [isReady, setIsReady] = useState(false)
  const [showInfoCard, setShowInfoCard] = useState(false)

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

  // Track if user has interacted with the map
  const hasUserInteractedRef = useRef(false)
  const previousLocationRef = useRef<[number, number] | null>(null)

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
        const newLocation: [number, number] = [lat, lng]

        // Calculate distance from previous location if we have one
        const previousLocation = previousLocationRef.current

        if (previousLocation && hasUserInteractedRef.current) {
          const currentZoom = map.getZoom()

          // Calculate distance in kilometers using Haversine formula
          const distance = L.latLng(previousLocation).distanceTo(L.latLng(newLocation)) / 1000 // km

          // Determine intermediate zoom level based on distance
          // Close (<50km): zoom to 9, Medium (50-200km): zoom to 7, Far (>200km): zoom to 5
          let intermediateZoom = 9
          if (distance > 200) {
            intermediateZoom = 5
          } else if (distance > 50) {
            intermediateZoom = 7
          } else if (distance > 10) {
            intermediateZoom = 9
          } else {
            // Very close, just pan directly
            map.flyTo(newLocation, 12, {
              animate: true,
              duration: 0.8,
              easeLinearity: 0.5
            })
            previousLocationRef.current = newLocation
            setTimeout(() => setShowInfoCard(true), 100)
            return
          }

          // Only do smooth zoom-out if we're currently zoomed in enough
          // Otherwise the animation looks weird
          if (currentZoom >= 10) {
            // Step 1: Zoom out from current position
            map.setZoom(intermediateZoom, {
              animate: true,
              duration: 0.6
            })

            // Step 2: Pan to show both points
            setTimeout(() => {
              const bounds = L.latLngBounds([previousLocation, newLocation])
              map.fitBounds(bounds.pad(0.3), {
                animate: true,
                duration: 0.6,
                maxZoom: intermediateZoom
              })
            }, 600)

            // Step 3: Zoom in on target
            setTimeout(() => {
              map.flyTo(newLocation, 12, {
                animate: true,
                duration: 1.0,
                easeLinearity: 0.5
              })
            }, 1200)

            setTimeout(() => setShowInfoCard(true), 2200)
          } else {
            // Not zoomed in enough, just fly directly
            map.flyTo(newLocation, 12, {
              animate: true,
              duration: 1.0,
              easeLinearity: 0.5
            })
            setTimeout(() => setShowInfoCard(true), 100)
          }
        } else {
          // First time or no previous location - direct fly
          map.flyTo(newLocation, 12, {
            animate: true,
            duration: 1.0,
            easeLinearity: 0.5
          })
          if (hasUserInteractedRef.current) {
            setTimeout(() => setShowInfoCard(true), 100)
          }
        }

        previousLocationRef.current = newLocation
      }
    })

    // Hide info card when no item is selected
    if (!selectedItemId) {
      setShowInfoCard(false)
    }
  }, [selectedItemId, createMarkerIcon, isReady])

  // Get the selected item object
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null
    return items.find(item => item.dbId === selectedItemId) || null
  }, [selectedItemId, items])

  const handleCloseInfoCard = () => {
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
