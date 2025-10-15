'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Clock, Globe2, MapPin, RefreshCw } from 'lucide-react'
import ColumnMapView from '@/components/ColumnMapView'
import NewsItem from '@/components/NewsItem'
import type { Dashboard, DashboardColumn, NewsItem as NewsItemType } from '@/lib/types'

const HOURS_OPTIONS = [6, 12, 24]
const POLL_INTERVAL_MS = 30000

function getEventTimestamp(item: NewsItemType) {
  const value = item.createdInDb || item.timestamp
  return new Date(value).getTime()
}

function hasCoordinates(item: NewsItemType) {
  const coords = item.location?.coordinates
  if (!coords || coords.length < 2) return false
  const [lat, lng] = coords
  return typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)
}

export default function ColumnMapPage() {
  const params = useParams()
  const slugParam = params?.slug
  const columnIdParam = (params as Record<string, string | string[] | undefined>)?.columnId
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam
  const columnId = Array.isArray(columnIdParam) ? columnIdParam[0] : columnIdParam

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [column, setColumn] = useState<DashboardColumn | null>(null)
  const [items, setItems] = useState<NewsItemType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeWindowHours, setTimeWindowHours] = useState<number>(24)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  useEffect(() => {
    setDashboard(null)
    setColumn(null)
    setItems([])
    setSelectedItemId(null)
  }, [slug, columnId])

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!slug || !columnId) return

    const silent = options?.silent ?? false
    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
      setError(null)
    }

    try {
      let dashboardData: { success?: boolean; dashboard?: Dashboard } | null = null
      if (!dashboard) {
        const dashboardResponse = await fetch(`/api/dashboards/${slug}`)
        if (!dashboardResponse.ok) {
          throw new Error(`Failed to fetch dashboard: ${dashboardResponse.status}`)
        }
        dashboardData = await dashboardResponse.json()
        if (!dashboardData?.success || !dashboardData?.dashboard) {
          throw new Error('Dashboard saknas eller kunde inte hämtas')
        }
        setDashboard(dashboardData.dashboard)
        const foundColumn = (dashboardData.dashboard.columns || []).find((col: DashboardColumn) => col.id === columnId) || null
        setColumn(foundColumn)
      }

      const columnResponse = await fetch(`/api/columns/${columnId}`)
      if (!columnResponse.ok) {
        throw new Error(`Failed to fetch column: ${columnResponse.status}`)
      }
      const columnData = await columnResponse.json()
      if (!columnData?.success || !Array.isArray(columnData?.items)) {
        throw new Error('Kolumn-data saknas eller kunde inte hämtas')
      }

      setItems(columnData.items as NewsItemType[])
      setError(null)
    } catch (err) {
      console.error('Kunde inte ladda kartdata:', err)
      setError(err instanceof Error ? err.message : 'Något gick fel vid laddning av kartdata')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [slug, columnId, dashboard])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchData({ silent: true })
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [fetchData])

  const now = Date.now()
  const windowMs = timeWindowHours * 60 * 60 * 1000

  const itemsWithinWindow = useMemo(() => {
    return items.filter((item) => now - getEventTimestamp(item) <= windowMs)
  }, [items, now, windowMs])

  const itemsWithCoordinates = useMemo(() => {
    return itemsWithinWindow.filter(hasCoordinates)
  }, [itemsWithinWindow])

  const itemsWithoutCoordinates = useMemo(() => {
    return itemsWithinWindow.filter((item) => !hasCoordinates(item))
  }, [itemsWithinWindow])

  const sortedItems = useMemo(() => {
    return [...itemsWithCoordinates].sort((a, b) => getEventTimestamp(b) - getEventTimestamp(a))
  }, [itemsWithCoordinates])

  useEffect(() => {
    if (sortedItems.length === 0) {
      setSelectedItemId(null)
      return
    }
    if (!selectedItemId || !sortedItems.some((item) => item.dbId === selectedItemId)) {
      setSelectedItemId(sortedItems[0].dbId)
    }
  }, [sortedItems, selectedItemId])

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null
    return sortedItems.find((item) => item.dbId === selectedItemId) || null
  }, [sortedItems, selectedItemId])

  const headline = column?.title || 'Kolumnkarta'
  const subHeadline = column?.description || dashboard?.description

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0">
        <ColumnMapView
          items={sortedItems}
          selectedItemId={selectedItemId}
          onSelectItem={(item) => setSelectedItemId(item.dbId)}
          emptyState={
            <div className="flex flex-col items-center gap-2 text-center text-slate-100">
              <MapPin className="h-8 w-8 text-slate-200" />
              <p>Inga händelser med koordinater senaste {timeWindowHours} timmarna.</p>
            </div>
          }
        />
      </div>

      {isLoading && (
        <div className="absolute inset-0 z-[700] flex items-center justify-center bg-slate-900/60 backdrop-blur">
          <div className="flex flex-col items-center gap-2 text-slate-200">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
            <span>Laddar kartdata…</span>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="absolute inset-0 z-[700] flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white/95 p-6 text-center text-slate-700 shadow-xl backdrop-blur">
            <MapPin className="mx-auto h-10 w-10 text-red-500" />
            <div className="mt-3 text-lg font-semibold">Kunde inte ladda kartan</div>
            <p className="mt-1 text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={() => fetchData()}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              Försök igen
            </button>
          </div>
        </div>
      )}

      <header className="absolute left-4 right-4 top-4 z-[600] pointer-events-none md:left-8 md:right-8">
        <div className="pointer-events-auto rounded-3xl bg-white/90 p-4 text-slate-800 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={slug ? `/dashboard/${slug}` : '/dashboard/main'}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tillbaka
              </Link>
              <div className="flex items-center gap-2">
                <Globe2 className="h-5 w-5 text-blue-600" />
                <h1 className="text-lg font-semibold sm:text-xl">
                  {headline}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <Clock className="h-4 w-4" />
                {itemsWithinWindow.length} händelser · {timeWindowHours}h
              </div>
              <div className="flex items-center gap-2">
                {HOURS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTimeWindowHours(option)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      option === timeWindowHours
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {option}h
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => fetchData({ silent: true })}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Uppdatera
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <div>Med koordinater: {itemsWithCoordinates.length}</div>
            <div>Utan koordinater: {itemsWithoutCoordinates.length}</div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-red-500" /> 5
              <span className="flex h-2 w-2 rounded-full bg-orange-500" /> 4
              <span className="flex h-2 w-2 rounded-full bg-amber-400" /> 3
              <span className="flex h-2 w-2 rounded-full bg-slate-400" /> 1-2
            </div>
          </div>
          {subHeadline && (
            <p className="mt-2 text-sm text-slate-600">
              {subHeadline}
            </p>
          )}
        </div>
      </header>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[600] space-y-4 md:inset-y-32 md:right-8 md:left-auto md:w-[380px]">
        <div className="pointer-events-auto overflow-hidden rounded-3xl bg-white/95 text-slate-800 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold">
            <span>Händelser på kartan</span>
            <span className="text-xs font-normal text-slate-500">{sortedItems.length} st</span>
          </div>
          {sortedItems.length === 0 ? (
            <div className="flex h-48 items-center justify-center px-4 py-6 text-sm text-slate-500">
              Inga händelser inom valt intervall.
            </div>
          ) : (
            <div className="max-h-[45vh] space-y-3 overflow-y-auto px-4 py-4 md:max-h-[calc(100vh-340px)]">
              {sortedItems.map((item) => (
                <div
                  key={item.dbId}
                  className={`rounded-xl border transition ${
                    selectedItemId === item.dbId
                      ? 'border-blue-500 shadow-md'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <NewsItem
                    item={item}
                    compact
                    onClick={() => setSelectedItemId(item.dbId)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedItem && (
          <div className="pointer-events-auto rounded-3xl bg-white/95 p-4 text-slate-800 shadow-xl backdrop-blur">
            <div className="mb-2 text-sm font-semibold text-slate-700">Detaljer</div>
            <NewsItem item={selectedItem} />
          </div>
        )}
      </div>
    </div>
  )
}
