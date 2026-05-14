'use client';

import React, { Children, isValidElement, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserMenu } from './UserMenu';
import { DatabaseStatusIndicator } from './DatabaseStatusIndicator';

/**
 * Slot-mönster (P3-10): istället för contextContent/centerContent/rightContent-
 * props pekar man ut zoner via subkomponenter. Det här gör call-sites mer
 * läsbara — varje zons innehåll står med sitt eget JSX-block, och optional
 * zoner kan helt enkelt utelämnas.
 *
 * Användning:
 *   <GlobalHeader userName={name} dashboardId={id}>
 *     <GlobalHeader.Left>...</GlobalHeader.Left>
 *     <GlobalHeader.Center>...</GlobalHeader.Center>
 *     <GlobalHeader.Right>...</GlobalHeader.Right>
 *   </GlobalHeader>
 */
type SlotProps = { children: ReactNode };

// Marker-komponenterna renderar inget själva — GlobalHeader plockar ut
// deras `children` och placerar i rätt zon.
const HeaderLeft: React.FC<SlotProps> = () => null;
const HeaderCenter: React.FC<SlotProps> = () => null;
const HeaderRight: React.FC<SlotProps> = () => null;

interface GlobalHeaderProps {
  children?: ReactNode;
  userName: string | null;
  onLogout?: () => void;
  onOpenNotificationSettings?: () => void;
  className?: string;
}

export function GlobalHeader({
  children,
  userName,
  onLogout,
  onOpenNotificationSettings,
  className = '',
}: GlobalHeaderProps) {
  let left: ReactNode = null;
  let center: ReactNode = null;
  let right: ReactNode = null;

  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === HeaderLeft) left = (child.props as SlotProps).children;
    else if (child.type === HeaderCenter) center = (child.props as SlotProps).children;
    else if (child.type === HeaderRight) right = (child.props as SlotProps).children;
  });

  const handleLogout = () => {
    if (onLogout) onLogout();
    else window.location.href = '/api/auth/signout';
  };

  return (
    <div className={`nd-top hidden lg:grid ${className}`}>
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
        {left}
      </div>

      <div className="nd-top-c">{center}</div>

      <div className="nd-top-r">
        {right}
        <UserMenu
          userName={userName || 'User'}
          onLogout={handleLogout}
          onOpenNotificationSettings={onOpenNotificationSettings}
        />
      </div>

      {process.env.NODE_ENV === 'development' && <DatabaseStatusIndicator />}
    </div>
  );
}

GlobalHeader.Left = HeaderLeft;
GlobalHeader.Center = HeaderCenter;
GlobalHeader.Right = HeaderRight;
