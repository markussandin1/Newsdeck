'use client'

import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

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
  hasActiveSearch: boolean
  onSearchChange: (value: string) => void
  onToggleSearchInput: (show: boolean) => void
}

export function DashboardFilterBar({
  searchQuery,
  showSearchInput,
  hasActiveSearch,
  onSearchChange,
  onToggleSearchInput,
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
          <Button
            variant={searchQuery ? "secondary" : "outline"}
            size="icon"
            onClick={() => onToggleSearchInput(true)}
            title="Sök i händelser"
            className={searchQuery ? "border-primary text-primary" : ""}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      {hasActiveSearch && searchQuery && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span>
            Visar händelser som matchar <span className="font-medium text-foreground">{searchQuery}</span>
          </span>
        </div>
      )}
    </div>
  )
}
