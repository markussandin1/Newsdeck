'use client';

import { useState, useMemo } from 'react';
import { MapPin, X, ChevronDown, ChevronRight, Search, Eye, EyeOff } from 'lucide-react';
import type { Region, Municipality } from '@/lib/types';
import type { UseGeoFiltersReturn } from '@/lib/dashboard/hooks/useGeoFilters';

interface GeoFilterPanelProps {
  geoFilters: UseGeoFiltersReturn;
}

export function GeoFilterPanel({ geoFilters }: GeoFilterPanelProps) {
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const {
    filters,
    metadata,
    isMetadataLoading,
    metadataError,
    toggleRegion,
    toggleMunicipality,
    setShowItemsWithoutLocation,
    clearFilters,
    isActive,
  } = geoFilters;

  // Group municipalities by region
  const municipalitiesByRegion = useMemo(() => {
    const grouped = new Map<string, Municipality[]>();
    metadata.municipalities.forEach(muni => {
      const key = `${muni.countryCode}-${muni.regionCode}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(muni);
    });
    return grouped;
  }, [metadata.municipalities]);

  // Filter regions and municipalities by search query
  const filteredRegions = useMemo(() => {
    if (!searchQuery.trim()) return metadata.regions;
    const query = searchQuery.toLowerCase();
    return metadata.regions.filter(
      region =>
        region.name.toLowerCase().includes(query) ||
        region.nameShort?.toLowerCase().includes(query)
    );
  }, [metadata.regions, searchQuery]);

  const getFilteredMunicipalities = (regionKey: string): Municipality[] => {
    const municipalities = municipalitiesByRegion.get(regionKey) || [];
    if (!searchQuery.trim()) return municipalities;
    const query = searchQuery.toLowerCase();
    return municipalities.filter(muni =>
      muni.name.toLowerCase().includes(query)
    );
  };

  const toggleRegionExpanded = (regionCode: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      if (next.has(regionCode)) {
        next.delete(regionCode);
      } else {
        next.add(regionCode);
      }
      return next;
    });
  };

  const handleRegionToggle = (regionCode: string) => {
    toggleRegion(regionCode);
    // Auto-expand region when selected to show municipalities
    if (!filters.regionCodes.includes(regionCode)) {
      setExpandedRegions(prev => new Set(prev).add(regionCode));
    }
  };

  const selectedCount = filters.regionCodes.length + filters.municipalityCodes.length;

  if (metadataError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-800 dark:text-red-200">
          Kunde inte ladda geografiska data: {metadataError}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background border border-border/50 rounded-xl shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Geografiska filter</h3>
          {selectedCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {selectedCount}
            </span>
          )}
        </div>
        {isActive && (
          <button
            onClick={clearFilters}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Rensa alla
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Sök län eller kommun..."
            className="w-full pl-9 pr-3 py-2 bg-muted/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Show items without location toggle */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {filters.showItemsWithoutLocation ? (
              <Eye className="h-4 w-4 text-blue-500" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm">Visa utan plats</span>
          </div>
          <button
            onClick={() => setShowItemsWithoutLocation(!filters.showItemsWithoutLocation)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              filters.showItemsWithoutLocation ? 'bg-blue-500' : 'bg-muted'
            }`}
            role="switch"
            aria-checked={filters.showItemsWithoutLocation}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                filters.showItemsWithoutLocation ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Regions and Municipalities */}
      <div className="max-h-[400px] overflow-y-auto">
        {isMetadataLoading ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Laddar geografiska data...
          </div>
        ) : filteredRegions.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Inga resultat för &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="py-2">
            {filteredRegions.map(region => {
              const regionKey = `${region.countryCode}-${region.code}`;
              const municipalities = getFilteredMunicipalities(regionKey);
              const isExpanded = expandedRegions.has(region.code);
              const isSelected = filters.regionCodes.includes(region.code);
              const selectedMunicipalities = municipalities.filter(m =>
                filters.municipalityCodes.includes(m.code)
              );

              return (
                <div key={regionKey} className="border-b border-border/30 last:border-0">
                  {/* Region row */}
                  <div className="flex items-center hover:bg-muted/50 transition-colors">
                    <button
                      onClick={() => toggleRegionExpanded(region.code)}
                      className="p-3 hover:bg-muted/70 transition-colors"
                      aria-label={isExpanded ? 'Dölj kommuner' : 'Visa kommuner'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <div
                      className="flex-1 flex items-center justify-between py-2 pr-3 cursor-pointer"
                      onClick={() => handleRegionToggle(region.code)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {region.nameShort || region.name}
                        </span>
                        {selectedMunicipalities.length > 0 && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                            {selectedMunicipalities.length}
                          </span>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-primary-foreground"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Municipalities (expanded) */}
                  {isExpanded && (
                    <div className="bg-muted/30">
                      {municipalities.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-muted-foreground ml-9">
                          Inga kommuner hittades
                        </div>
                      ) : (
                        municipalities.map(municipality => {
                          const isMuniSelected = filters.municipalityCodes.includes(
                            municipality.code
                          );
                          return (
                            <div
                              key={municipality.code}
                              className="flex items-center hover:bg-muted/50 transition-colors cursor-pointer ml-9"
                              onClick={() => toggleMunicipality(municipality.code)}
                            >
                              <div className="flex-1 flex items-center justify-between py-2 px-3">
                                <span className="text-sm text-muted-foreground">
                                  {municipality.name}
                                </span>
                                <div
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                    isMuniSelected
                                      ? 'bg-primary border-primary'
                                      : 'border-border hover:border-primary/50'
                                  }`}
                                >
                                  {isMuniSelected && (
                                    <svg
                                      className="w-2.5 h-2.5 text-primary-foreground"
                                      fill="none"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with info */}
      {!isMetadataLoading && (
        <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {metadata.regions.length} län, {metadata.municipalities.length} kommuner
          </p>
        </div>
      )}
    </div>
  );
}
