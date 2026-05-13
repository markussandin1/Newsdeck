'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserMenu } from './UserMenu';
import { DatabaseStatusIndicator } from './DatabaseStatusIndicator';
import { useRouter } from 'next/navigation';

interface GlobalHeaderProps {
  /** Left zone: brand name, dashboard dropdown etc */
  contextContent: ReactNode;
  /** Center zone: view switcher, search bar etc */
  centerContent?: ReactNode;
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
  /** Called before navigating away (e.g., to stop polling) */
  onNavigateAway?: () => void;
}

export function GlobalHeader({
  contextContent,
  centerContent,
  userName,
  dashboardId = '',
  onLogout,
  onOpenNotificationSettings,
  className = '',
  onNavigateAway,
}: GlobalHeaderProps) {
  const router = useRouter();

  const handleGoToGallery = () => {
    try {
      onNavigateAway?.();
      router.push('/gallery');
    } catch {
      onNavigateAway?.();
      window.location.href = '/gallery';
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = '/api/auth/signout';
    }
  };

  return (
    <div className={`glass border-b border-border sticky top-0 z-50 hidden lg:block ${className}`}>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-5 px-5 py-2.5">
        {/* Zone 1: Brand anchor + context (dashboard name/dropdown) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/dashboards" className="shrink-0 hover:opacity-80 transition-opacity">
            <Image
              src="/newsdeck-icon.svg"
              alt="Newsdeck"
              width={28}
              height={28}
              className="w-7 h-7 object-contain"
            />
          </Link>
          {contextContent}
        </div>

        {/* Zone 2: Center content (view switcher + search) */}
        <div className="flex items-center justify-center gap-3">
          {centerContent}
        </div>

        {/* Zone 3: Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/gallery"
            onClick={(e) => { e.preventDefault(); handleGoToGallery(); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.9L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/></svg>
            Trafikbilder
          </a>
          <UserMenu
            userName={userName || 'User'}
            dashboardId={dashboardId}
            onLogout={handleLogout}
            onOpenNotificationSettings={onOpenNotificationSettings}
          />
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && <DatabaseStatusIndicator />}
    </div>
  );
}
