'use client';

import { useRef, useEffect, useState } from 'react';
import { Dashboard as DashboardType } from '@/lib/types';
import { GlobalHeader } from './GlobalHeader';
import { Rss, Check, Search, X, Bell } from 'lucide-react';

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
  getTotalNewsCount,
  navigateToDashboard,
  onOpenNotificationSettings,
  viewMode,
  setViewMode,
  searchQuery,
  onSearchChange,
}: DashboardHeaderProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [feedCopied, setFeedCopied] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Tick the clock every 30 s — minute resolution is enough for the status pill
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

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

  const activeColumnCount = dashboard.columns?.filter(c => !c.isArchived).length ?? 0
  const totalNewsCount = getTotalNewsCount()

  const timeLabel = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' })
  const statusLabel = connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Ansluter' : 'Offline'

  // Left zone (after brand wordmark): dashboard picker + RSS shortcut
  const brandContent = (
    <div className="nd-dash-pick" ref={dropdownRef}>
      <button
        className="nd-dash-btn"
        onClick={() => setShowDashboardDropdown(!showDashboardDropdown)}
      >
        <span className="nd-dash-btn-text">
          <span className="nd-dash-n">{dashboard.name}</span>
          <span className="nd-dash-s">
            {activeColumnCount} kolumner · {totalNewsCount} händelser
          </span>
        </span>
        <svg
          className={`nd-dash-caret ${showDashboardDropdown ? 'nd-open' : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <button
        onClick={copyDashboardFeed}
        title="Kopiera feed-URL"
        className="ml-1 p-1.5 rounded-md hover:bg-[var(--nd-surface)] text-[var(--nd-ink-mute)] hover:text-[var(--nd-ink)] transition-colors"
      >
        {feedCopied ? <Check className="w-3.5 h-3.5" /> : <Rss className="w-3.5 h-3.5" />}
      </button>

      {showDashboardDropdown && (
        <div className="absolute top-full left-0 mt-1.5 w-72 bg-[var(--nd-surface)] rounded-xl border border-[var(--nd-line)] py-2 z-50 shadow-[var(--nd-shadow-lg)]">
          <div className="px-4 py-2 border-b border-[var(--nd-line-soft)]">
            <div className="text-xs font-mono text-[var(--nd-ink-mute)] uppercase tracking-[0.08em]">
              Dashboards
            </div>
          </div>
          <button
            onClick={() => { setShowCreateDashboardModal(true); setShowDashboardDropdown(false); }}
            className="w-full px-4 py-3 text-left hover:bg-[var(--nd-surface-2)] flex items-center gap-3 text-[var(--nd-accent)]"
          >
            <span className="text-sm font-bold">＋</span>
            <span className="font-medium">Ny Dashboard</span>
          </button>
          <div className="border-t border-[var(--nd-line-soft)] mt-1 pt-1">
            {allDashboards.map((dash) => (
              <button
                key={dash.id}
                onClick={() => { if (dash.slug !== dashboard.slug) navigateToDashboard(dash.slug); setShowDashboardDropdown(false); }}
                className={`w-full px-4 py-3 text-left hover:bg-[var(--nd-surface-2)] flex items-center justify-between ${dash.id === dashboard.id ? 'bg-[var(--nd-surface-2)]' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--nd-ink)] truncate">{dash.name}</div>
                  {dash.description && <div className="text-xs text-[var(--nd-ink-mute)] mt-1 truncate">{dash.description}</div>}
                  <div className="text-xs text-[var(--nd-ink-mute)] mt-1 font-mono">
                    {dash.columns?.filter(col => !col.isArchived)?.length ?? 0} kolumner
                  </div>
                </div>
                {dash.id === dashboard.id && <div className="text-[var(--nd-accent)] text-sm ml-2">✓</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Center zone: view switcher only
  const centerContent = (
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
  );

  // Right zone: search + status pill + notification bell
  const rightContent = (
    <>
      <label className="nd-search">
        <Search className="w-3.5 h-3.5 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Sök titel, källa, plats…"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="text-[var(--nd-ink-mute)] hover:text-[var(--nd-ink)]"
            aria-label="Rensa sökning"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd>⌘K</kbd>
        )}
      </label>

      <span className={`nd-status nd-${connectionStatus}`} title={`Status: ${statusLabel}`}>
        <span className="nd-live-dot" />
        <span>{statusLabel}</span>
        <span className="nd-status-sep">·</span>
        <time dateTime={now.toISOString()}>{timeLabel}</time>
      </span>

      {onOpenNotificationSettings && (
        <button
          type="button"
          onClick={onOpenNotificationSettings}
          className="nd-icon-btn"
          aria-label="Notiser"
          title="Notiser"
        >
          <Bell className="w-4 h-4" />
          <span className="nd-icon-btn-badge" aria-hidden />
        </button>
      )}
    </>
  );

  return (
    <GlobalHeader
      contextContent={brandContent}
      centerContent={centerContent}
      rightContent={rightContent}
      userName={userName}
      dashboardId={dashboard.id}
      onLogout={handleLogout}
      onOpenNotificationSettings={onOpenNotificationSettings}
    />
  );
}
