'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GeoFilterPanel } from '@/components/GeoFilterPanel'
import { Search, MapPin, ChevronRight, X } from 'lucide-react'
import { useGeoFilters } from '@/lib/dashboard/hooks/useGeoFilters'

interface DashboardSearchInputProps {
  value: string
  onChange: (value: string) => void
}

function DashboardSearchInput({ value, onChange }: DashboardSearchInputProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Sök händelser..."
        aria-label="Sök händelser"
        autoComplete="off"
        autoFocus
        className="w-full pl-10 pr-10 py-2 rounded-lg border border-input bg-background font-body text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Rensa sökfilter"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

interface DashboardFilterBarProps {
  searchQuery: string
  showSearchInput: boolean
  showGeoFilterPanel: boolean
  geoFilters: ReturnType<typeof useGeoFilters>
  hasActiveSearch: boolean
  onSearchChange: (value: string) => void
  onToggleSearchInput: (show: boolean) => void
  onToggleGeoFilterPanel: (show: boolean) => void
}

export function DashboardFilterBar({
  searchQuery,
  showSearchInput,
  showGeoFilterPanel,
  geoFilters,
  hasActiveSearch,
  onSearchChange,
  onToggleSearchInput,
  onToggleGeoFilterPanel,
}: DashboardFilterBarProps) {
  return (
    <div className="mt-2 space-y-1 relative">
      <div className="flex gap-2 items-center">
        {showSearchInput ? (
          <div className="flex-1 flex gap-2 animate-in fade-in slide-in-from-right-2">
            <DashboardSearchInput value={searchQuery} onChange={onSearchChange} />
            <Button variant="ghost" size="icon" onClick={() => onToggleSearchInput(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onToggleGeoFilterPanel(!showGeoFilterPanel)}
              className={`flex-1 px-3 py-1.5 rounded-lg border transition-colors flex items-center justify-between group ${
                geoFilters.isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-input hover:bg-muted'
              }`}
              title="Geografiska filter"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {geoFilters.isActive
                    ? `${geoFilters.filters.regionCodes.length + geoFilters.filters.municipalityCodes.length} valda områden`
                    : "Filtrera på område..."}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity rotate-90" />
            </button>

            <Button
              variant={searchQuery ? "secondary" : "outline"}
              size="icon"
              onClick={() => onToggleSearchInput(true)}
              title="Sök i händelser"
              className={searchQuery ? "border-primary text-primary" : ""}
            >
              <Search className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {showGeoFilterPanel && (
        <div className="absolute top-full left-0 mt-2 w-full max-w-sm z-50">
          <GeoFilterPanel
            geoFilters={geoFilters}
            onClose={() => onToggleGeoFilterPanel(false)}
          />
        </div>
      )}

      {/* Active Geo Filters Badges */}
      {geoFilters.isActive && (
        <div className="flex flex-wrap gap-2 mt-1 pb-1">
          {geoFilters.filters.regionCodes.map(code => {
            const region = geoFilters.metadata.regions.find(r => r.code === code)
            return (
              <Badge
                key={`region-${code}`}
                variant="secondary"
                className="flex items-center gap-1 pl-2 pr-1 py-1 cursor-pointer hover:bg-secondary/80"
                onClick={() => geoFilters.toggleRegion(code)}
              >
                {region ? (region.nameShort || region.name) : code}
                <X className="h-3 w-3 hover:text-foreground/70" />
              </Badge>
            )
          })}
          {geoFilters.filters.municipalityCodes.map(code => {
            const municipality = geoFilters.metadata.municipalities.find(m => m.code === code)
            return (
              <Badge
                key={`muni-${code}`}
                variant="secondary"
                className="flex items-center gap-1 pl-2 pr-1 py-1 cursor-pointer hover:bg-secondary/80"
                onClick={() => geoFilters.toggleMunicipality(code)}
              >
                {municipality ? municipality.name : code}
                <X className="h-3 w-3 hover:text-foreground/70" />
              </Badge>
            )
          })}
          <button
            onClick={geoFilters.clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 px-2"
          >
            Rensa alla
          </button>
        </div>
      )}

      {hasActiveSearch && (
        <div className="mt-2 text-xs text-muted-foreground">
          {searchQuery && (
            <span>
              Visar händelser som matchar <span className="font-medium text-foreground">{searchQuery}</span>
            </span>
          )}
          {searchQuery && geoFilters.isActive && <span> och </span>}
          {geoFilters.isActive && (
            <span>
              filtrerade efter plats
            </span>
          )}
        </div>
      )}
    </div>
  )
}
