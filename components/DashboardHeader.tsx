'use client';

import { useRef, useEffect } from 'react';
import { Dashboard as DashboardType } from '@/lib/types';
import { ConnectionStatus } from './ConnectionStatus';
import { GlobalHeader } from './GlobalHeader';
import { EnhancedDateTime } from './EnhancedDateTime';

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
  onNavigateAway?: () => void;
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
  onNavigateAway,
}: DashboardHeaderProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dashboard dropdown
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

  // Dashboard context content for Zone 2
  const dashboardContext = (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center gap-3 hover:bg-muted/50 rounded-lg px-4 py-2 smooth-transition"
        onClick={() => setShowDashboardDropdown(!showDashboardDropdown)}
      >
        <div>
          <h1 className="text-xl font-display font-semibold text-foreground text-left">
            {dashboard.name}
          </h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <ConnectionStatus status={connectionStatus} />
            <span>•</span>
            <EnhancedDateTime />
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-muted-foreground smooth-transition ${
            showDashboardDropdown ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dashboard Dropdown */}
      {showDashboardDropdown && (
        <div className="absolute top-full left-0 mt-2 w-72 glass rounded-xl shadow-soft-lg border border-border py-2 z-50">
          <div className="px-4 py-2 border-b border-border/50">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Dashboards
            </div>
          </div>

          <button
            onClick={() => {
              setShowCreateDashboardModal(true);
              setShowDashboardDropdown(false);
            }}
            className="w-full px-4 py-3 text-left hover:bg-muted smooth-transition flex items-center gap-3"
          >
            <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-md flex items-center justify-center text-sm font-bold">
              +
            </div>
            <span className="font-medium text-foreground">Ny Dashboard</span>
          </button>

          <div className="border-t border-border/50 mt-1 pt-1">
            {allDashboards.map((dash) => (
              <button
                key={dash.id}
                onClick={() => {
                  if (dash.slug !== dashboard.slug) {
                    navigateToDashboard(dash.slug);
                  }
                  setShowDashboardDropdown(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-muted smooth-transition flex items-center justify-between ${
                  dash.id === dashboard.id ? 'bg-blue-50/50 border-r-2 border-blue-500' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium text-foreground">{dash.name}</div>
                  {dash.description && (
                    <div className="text-xs text-muted-foreground mt-1">{dash.description}</div>
                  )}
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
  );

  return (
    <GlobalHeader
      contextContent={dashboardContext}
      userName={userName}
      dashboardId={dashboard.id}
      onLogout={handleLogout}
      onOpenNotificationSettings={onOpenNotificationSettings}
      onNavigateAway={onNavigateAway}
    />
  );
}
