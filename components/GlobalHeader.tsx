'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WeatherCycle } from './WeatherCycle';
import { WeatherWarningBanner } from './WeatherWarningBanner';
import { WeatherWarningModal } from './WeatherWarningModal';
import { EnhancedDateTime } from './EnhancedDateTime';
import { UserMenu } from './UserMenu';
import { useWeather } from '@/lib/hooks/useWeather';
import { useWeatherWarnings } from '@/lib/hooks/useWeatherWarnings';

interface GlobalHeaderProps {
  /** Content for the middle zone (page context/title area) */
  contextContent: ReactNode;
  /** User name for the user menu */
  userName: string | null;
  /** Dashboard ID (used for logout redirect) */
  dashboardId?: string;
  /** Custom logout handler */
  onLogout?: () => void;
  /** Callback to open notification settings modal */
  onOpenNotificationSettings?: () => void;
  /** Additional class names */
  className?: string;
}

export function GlobalHeader({
  contextContent,
  userName,
  dashboardId = '',
  onLogout,
  onOpenNotificationSettings,
  className = '',
}: GlobalHeaderProps) {
  const { weather } = useWeather();
  const { warnings } = useWeatherWarnings();
  const [isWarningsModalOpen, setIsWarningsModalOpen] = useState(false);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = '/api/auth/signout';
    }
  };

  return (
    <div className={`glass border-b border-border sticky top-0 z-50 hidden lg:block ${className}`}>
      {/* Weather Warning Banner - Full Width */}
      {warnings.length > 0 && (
        <WeatherWarningBanner
          warnings={warnings}
          onClick={() => setIsWarningsModalOpen(true)}
        />
      )}

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

            {/* Zone 2: Page Context (flexible content) */}
            {contextContent}
          </div>

          {/* Zone 3: Consolidated Weather & DateTime */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
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
                dashboardId={dashboardId}
                onLogout={handleLogout}
                onOpenNotificationSettings={onOpenNotificationSettings}
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
