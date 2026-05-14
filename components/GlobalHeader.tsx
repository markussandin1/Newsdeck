'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserMenu } from './UserMenu';
import { DatabaseStatusIndicator } from './DatabaseStatusIndicator';

interface GlobalHeaderProps {
  /** Left zone: content right of the brand wordmark (dashboard picker etc.) */
  contextContent: ReactNode;
  /** Center zone: view switcher etc. */
  centerContent?: ReactNode;
  /** Right zone slot rendered before the user menu (status pill, search, bell etc.) */
  rightContent?: ReactNode;
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
  centerContent,
  rightContent,
  userName,
  dashboardId = '',
  onLogout,
  onOpenNotificationSettings,
  className = '',
}: GlobalHeaderProps) {
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = '/api/auth/signout';
    }
  };

  return (
    <>
      {/* Desktop header (>= lg) */}
      <div className={`nd-top hidden lg:grid ${className}`}>
        {/* Zone 1: Brand wordmark + context (dashboard picker etc.) */}
        <div className="nd-top-l">
          <Link href="/dashboards" className="nd-brand" aria-label="Newsdeck">
            <Image
              src="/newsdeck-icon.svg"
              alt=""
              width={28}
              height={28}
              className="shrink-0"
            />
            <span className="nd-brand-text">
              <span className="nd-brand-n">Newsdeck</span>
              <span className="nd-brand-s">Bonnier News</span>
            </span>
          </Link>
          {contextContent}
        </div>

        {/* Zone 2: Center content (view switcher) */}
        <div className="nd-top-c">{centerContent}</div>

        {/* Zone 3: Right controls */}
        <div className="nd-top-r">
          {rightContent}
          <UserMenu
            userName={userName || 'User'}
            dashboardId={dashboardId}
            onLogout={handleLogout}
            onOpenNotificationSettings={onOpenNotificationSettings}
          />
        </div>

        {process.env.NODE_ENV === 'development' && <DatabaseStatusIndicator />}
      </div>

      {/* Mobile header (< lg) — minimal: logo + UserMenu.
          Mobil är sekundärt use case (reportrar på språng) men måste alltid
          ha navigation. Persona: nyhetsredaktör — vi prioriterar Newsdeck-
          identitet + snabb access till profil/notisinställningar. */}
      <div
        className={`lg:hidden flex items-center justify-between gap-3 px-4 py-2 border-b border-[var(--nd-line)] bg-[var(--nd-bg)] ${className}`}
      >
        <Link href="/dashboards" className="flex items-center gap-2 min-w-0" aria-label="Newsdeck">
          <Image
            src="/newsdeck-icon.svg"
            alt=""
            width={24}
            height={24}
            className="shrink-0"
          />
          <span className="font-ui font-semibold text-foreground truncate">
            Newsdeck
          </span>
        </Link>
        <UserMenu
          userName={userName || 'User'}
          dashboardId={dashboardId}
          onLogout={handleLogout}
          onOpenNotificationSettings={onOpenNotificationSettings}
        />
      </div>
    </>
  );
}
