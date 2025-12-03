'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Dashboard as DashboardType } from '@/lib/types';
import { ConnectionStatus } from './ConnectionStatus';
import { WeatherCycle } from './WeatherCycle';
import { WeatherWarningBadge } from './WeatherWarningBadge';
import { WeatherWarningModal } from './WeatherWarningModal';
import { EnhancedDateTime } from './EnhancedDateTime';
import { UserMenu } from './UserMenu';
import { useWeather } from '@/lib/hooks/useWeather';
import { useWeatherWarnings } from '@/lib/hooks/useWeatherWarnings';

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
}: DashboardHeaderProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { weather } = useWeather();
  const { warnings } = useWeatherWarnings();
  const [isWarningsModalOpen, setIsWarningsModalOpen] = useState(false);

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
    // Redirect to logout endpoint
    window.location.href = '/api/auth/signout';
  };

  return (
    <div className="glass border-b border-border sticky top-0 z-50 hidden lg:block">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Zone 1 + 2: Tightly Grouped Left Side */}
          <div className="flex items-center gap-2">
            {/* Zone 1: Brand Anchor */}
            <Link href="/dashboards" className="shrink-0">
              <div className="w-12 h-12 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                <Image
                  src="/newsdeck-icon.svg"
                  alt="Newsdeck logo"
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain"
                />
              </div>
            </Link>

            {/* Zone 2: Dashboard Context */}
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
                  <span>{dashboard?.columns?.filter((col) => !col.isArchived)?.length || 0} kolumner</span>
                  <span>•</span>
                  <span>{getTotalNewsCount()} händelser</span>
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
          </div>

          {/* Zone 3: Consolidated Weather & DateTime */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {warnings.length > 0 && (
              <div className="hidden xl:block">
                <WeatherWarningBadge
                  warnings={warnings}
                  onClick={() => setIsWarningsModalOpen(true)}
                />
              </div>
            )}
            <WeatherCycle cities={weather} className="w-[120px] xl:w-[140px]" />
            <div className="hidden xl:block">
              <EnhancedDateTime />
            </div>
            <div className="xl:hidden">
              <EnhancedDateTime showDate={false} />
            </div>
          </div>

          {/* Zone 4: User Controls */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Time only on mobile/tablet */}
            <div className="flex lg:hidden">
              <EnhancedDateTime showDate={false} />
            </div>
            {userName && (
              <UserMenu
                userName={userName}
                dashboardId={dashboard.id}
                onLogout={handleLogout}
              />
            )}
          </div>
        </div>
      </div>

      {/* Weather Warnings Modal */}
      {isWarningsModalOpen && (
        <WeatherWarningModal
          warnings={warnings}
          onClose={() => setIsWarningsModalOpen(false)}
        />
      )}
    </div>
  );
}
