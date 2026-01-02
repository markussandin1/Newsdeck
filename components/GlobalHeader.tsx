'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WeatherWidget } from './WeatherWidget';
import { WeatherWarningModal } from './WeatherWarningModal';
import { UserMenu } from './UserMenu';
import { DatabaseStatusIndicator } from './DatabaseStatusIndicator';
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

          {/* Zone 3: Weather Widget */}
          <div className="hidden lg:flex items-center gap-6 shrink-0">
            <WeatherWidget
              cities={weather}
              warnings={warnings}
              onWarningsClick={() => setIsWarningsModalOpen(true)}
            />
          </div>

          {/* Zone 4: User Controls */}
          <div className="flex items-center shrink-0">
            <UserMenu
              userName={userName || 'User'}
              dashboardId={dashboardId}
              onLogout={handleLogout}
              onOpenNotificationSettings={onOpenNotificationSettings}
            />
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

      {/* Database Status Indicator (development only) */}
      {process.env.NODE_ENV === 'development' && <DatabaseStatusIndicator />}
    </div>
  );
}
