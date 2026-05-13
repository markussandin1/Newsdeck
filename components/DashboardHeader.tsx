'use client';

import { useRef, useEffect, useState } from 'react';
import { Dashboard as DashboardType } from '@/lib/types';
import { ConnectionStatus } from './ConnectionStatus';
import { GlobalHeader } from './GlobalHeader';
import { EnhancedDateTime } from './EnhancedDateTime';
import { Rss, Check, Search, X } from 'lucide-react';

interface DashboardHeaderProps {
  dashboard: DashboardType;
  userName: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  allDashboards: DashboardType[];
  showDashboardDropdown: boolean;
  setShowDashboardDropdown: (show: boolean) => void;
  setShowCreateDashboardModal: (show: boolean) => void;
  getTotalNewsCount: () => number;
  navigateToDashboard: (slug: string) => void;
  onOpenNotificationSettings?: () => void;
  /** Desktop view mode state */
  viewMode: 'columns' | 'pulse' | 'grid';
  setViewMode: (mode: 'columns' | 'pulse' | 'grid') => void;
  /** Desktop search state */
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function DashboardHeader({
  dashboard,
  userName,
  connectionStatus,
  allDashboards,
  showDashboardDropdown,
  setShowDashboardDropdown,
  setShowCreateDashboardModal,
  getTotalNewsCount: _getTotalNewsCount,
  navigateToDashboard,
  onOpenNotificationSettings,
  viewMode,
  setViewMode,
  searchQuery,
  onSearchChange,
}: DashboardHeaderProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [feedCopied, setFeedCopied] = useState(false);

  const copyDashboardFeed = async () => {
    const url = `${window.location.origin}/feeds/dashboards/${dashboard.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setFeedCopied(true);
      setTimeout(() => setFeedCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy feed URL:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDashboardDropdown(false);
      }
    };
    if (showDashboardDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDashboardDropdown, setShowDashboardDropdown]);

  const handleLogout = () => {
    window.location.href = '/api/auth/signout';
  };

  // Left zone: compact brand + dropdown
  const brandContent = (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="relative" ref={dropdownRef}>
        <button
          className="flex items-center gap-2 hover:bg-muted/50 rounded-md px-2 py-1 smooth-transition min-w-0"
          onClick={() => setShowDashboardDropdown(!showDashboardDropdown)}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-foreground leading-tight tracking-tight truncate max-w-[200px]">
                {dashboard.name}
              </span>
              <svg
                className={`w-3.5 h-3.5 text-muted-foreground shrink-0 smooth-transition ${showDashboardDropdown ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground font-mono mt-0.5">
              <ConnectionStatus status={connectionStatus} />
              <span className="text-muted-foreground/50">·</span>
              <EnhancedDateTime />
            </div>
          </div>
        </button>

        {showDashboardDropdown && (
          <div className="absolute top-full left-0 mt-1.5 w-72 glass rounded-xl shadow-soft-lg border border-border py-2 z-50">
            <div className="px-4 py-2 border-b border-border/50">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Dashboards
              </div>
            </div>
            <button
              onClick={() => { setShowCreateDashboardModal(true); setShowDashboardDropdown(false); }}
              className="w-full px-4 py-3 text-left hover:bg-muted smooth-transition flex items-center gap-3"
            >
              <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-md flex items-center justify-center text-sm font-bold">+</div>
              <span className="font-medium text-foreground">Ny Dashboard</span>
            </button>
            <div className="border-t border-border/50 mt-1 pt-1">
              {allDashboards.map((dash) => (
                <button
                  key={dash.id}
                  onClick={() => { if (dash.slug !== dashboard.slug) navigateToDashboard(dash.slug); setShowDashboardDropdown(false); }}
                  className={`w-full px-4 py-3 text-left hover:bg-muted smooth-transition flex items-center justify-between ${dash.id === dashboard.id ? 'bg-blue-50/50 border-r-2 border-blue-500' : ''}`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{dash.name}</div>
                    {dash.description && <div className="text-xs text-muted-foreground mt-1">{dash.description}</div>}
                    <div className="text-xs text-muted-foreground mt-1">
                      {dash.columns?.filter(col => !col.isArchived)?.length ?? 0} kolumner
                    </div>
                  </div>
                  {dash.id === dashboard.id && <div className="text-blue-500 text-sm">✓</div>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={copyDashboardFeed}
        title="Kopiera feed-URL"
        className="p-1.5 rounded-md hover:bg-muted/50 smooth-transition text-muted-foreground hover:text-foreground shrink-0"
      >
        {feedCopied ? <Check className="w-3.5 h-3.5" /> : <Rss className="w-3.5 h-3.5" />}
      </button>
    </div>
  );

  // Center zone: view switcher + persistent search
  const centerContent = (
    <div className="flex items-center gap-3">
      <div className="nd-seg">
        <button
          className={viewMode === 'columns' ? 'nd-active' : ''}
          onClick={() => setViewMode('columns')}
          title="Kolumnvy"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="16" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>
          Kolumner
        </button>
        <button
          className={viewMode === 'pulse' ? 'nd-active' : ''}
          onClick={() => setViewMode('pulse')}
          title="Kronologisk vy"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 12 7 12 10 5 14 19 17 12 21 12"/></svg>
          Pulse
        </button>
        <button
          className={viewMode === 'grid' ? 'nd-active' : ''}
          onClick={() => setViewMode('grid')}
          title="Rutnätsvy"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Grid
        </button>
      </div>

      <div className="relative flex items-center">
        <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Sök händelser…"
          className="pl-8 pr-7 py-1.5 w-56 rounded-md border border-border bg-background/60 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <GlobalHeader
      contextContent={brandContent}
      centerContent={centerContent}
      userName={userName}
      dashboardId={dashboard.id}
      onLogout={handleLogout}
      onOpenNotificationSettings={onOpenNotificationSettings}
    />
  );
}
