'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dashboard as DashboardType } from '@/lib/types';
import { GlobalHeader } from './GlobalHeader';
import { Rss, Check, Search, X, Bell, Trash2 } from 'lucide-react';

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
  const router = useRouter();
  const [feedCopied, setFeedCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const isMainDashboard = dashboard.id === 'main-dashboard' || dashboard.slug === 'main'

  const openDeleteConfirm = () => {
    if (isMainDashboard) return
    setDeleteError(null)
    setShowDeleteConfirm(true)
  }

  const performDelete = async () => {
    setDeleteError(null)
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/dashboards/${dashboard.slug}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error || 'Kunde inte radera dashboarden')
        return
      }
      router.push('/dashboard/main')
    } catch (error) {
      console.error('Failed to delete dashboard:', error)
      setDeleteError('Kunde inte radera dashboarden')
    } finally {
      setIsDeleting(false)
    }
  }

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

  // Left zone (after brand wordmark): dashboard picker
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

      {showDashboardDropdown && (
        <div
          className="absolute top-full left-0 mt-1.5 w-72 bg-[var(--nd-surface)] rounded-xl border border-[var(--nd-line)] z-50 shadow-[var(--nd-shadow-lg)] flex flex-col"
          style={{ maxHeight: 'calc(100vh - 80px)' }}
        >
          {/* Sticky header */}
          <div className="px-4 py-2 border-b border-[var(--nd-line-soft)] flex-shrink-0">
            <div className="text-xs font-mono text-[var(--nd-ink-mute)] uppercase tracking-[0.08em]">
              Dashboards
            </div>
          </div>
          <button
            onClick={() => { setShowCreateDashboardModal(true); setShowDashboardDropdown(false); }}
            className="w-full px-4 py-3 text-left hover:bg-[var(--nd-surface-2)] flex items-center gap-3 text-[var(--nd-accent)] flex-shrink-0"
          >
            <span className="text-sm font-bold">＋</span>
            <span className="font-medium">Ny Dashboard</span>
          </button>

          {/* Scrollable dashboards list */}
          <div className="border-t border-[var(--nd-line-soft)] flex-1 overflow-y-auto min-h-0">
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

          {/* Sticky footer */}
          <div className="border-t border-[var(--nd-line-soft)] flex-shrink-0">
            <button
              onClick={() => { copyDashboardFeed(); }}
              className="w-full px-4 py-2.5 text-left hover:bg-[var(--nd-surface-2)] flex items-center gap-3 text-[var(--nd-ink-dim)]"
            >
              {feedCopied
                ? <Check className="w-3.5 h-3.5 text-[var(--nd-accent)]" />
                : <Rss className="w-3.5 h-3.5" />}
              <span className="text-sm">{feedCopied ? 'Kopierat!' : 'Kopiera dashboard-feed'}</span>
            </button>
            {!isMainDashboard && (
              <button
                onClick={() => { setShowDashboardDropdown(false); openDeleteConfirm() }}
                disabled={isDeleting}
                className="w-full px-4 py-2.5 text-left hover:bg-[var(--nd-surface-2)] flex items-center gap-3 text-[oklch(0.7_0.2_25)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-sm">Radera dashboard</span>
              </button>
            )}
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
        title="Kolumner — bevaka kolumnvis, optimalt för löpande bevakning"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="16" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>
        Kolumner
      </button>
      <button
        className={viewMode === 'pulse' ? 'nd-active' : ''}
        onClick={() => setViewMode('pulse')}
        title="Pulse — kronologiskt flöde, alla händelser tidssorterade"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 12 7 12 10 5 14 19 17 12 21 12"/></svg>
        Pulse
      </button>
      <button
        className={viewMode === 'grid' ? 'nd-active' : ''}
        onClick={() => setViewMode('grid')}
        title="Grid — prioritetsöversikt, viktiga händelser visas större"
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
    <>
      <GlobalHeader
        userName={userName}
        dashboardId={dashboard.id}
        onLogout={handleLogout}
        onOpenNotificationSettings={onOpenNotificationSettings}
      >
        <GlobalHeader.Left>{brandContent}</GlobalHeader.Left>
        <GlobalHeader.Center>{centerContent}</GlobalHeader.Center>
        <GlobalHeader.Right>{rightContent}</GlobalHeader.Right>
      </GlobalHeader>

      {/* P2-9: designad confirm-modal ersätter window.confirm() */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dashboard-title"
          onClick={() => !isDeleting && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-xl border border-[var(--nd-line)] bg-[var(--nd-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--nd-line)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[oklch(0.7_0.2_25_/_0.15)] flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-[oklch(0.7_0.2_25)]" />
              </div>
              <h2 id="delete-dashboard-title" className="text-base font-semibold text-foreground">
                Radera dashboard
              </h2>
            </div>
            <div className="px-5 py-4 text-sm text-muted-foreground space-y-2">
              <p>
                Är du säker på att du vill radera <strong className="text-foreground">&quot;{dashboard.name}&quot;</strong>?
              </p>
              <p>
                Kolumnerna i dashboarden försvinner men händelserna finns kvar i databasen.
                Denna åtgärd kan inte ångras.
              </p>
              {deleteError && (
                <p className="text-[oklch(0.7_0.2_25)] font-medium pt-2">{deleteError}</p>
              )}
            </div>
            <div className="px-5 py-3 border-t border-[var(--nd-line)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-md text-sm text-foreground hover:bg-[var(--nd-surface-2)] disabled:opacity-50"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={performDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-md text-sm font-semibold text-white bg-[oklch(0.6_0.2_25)] hover:bg-[oklch(0.55_0.2_25)] disabled:opacity-50"
              >
                {isDeleting ? 'Raderar…' : 'Radera permanent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
