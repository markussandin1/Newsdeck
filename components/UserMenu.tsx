'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, Sun, Moon, ChevronDown, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserMenuProps {
  userName: string;
  userEmail?: string;
  onLogout?: () => void;
  onOpenNotificationSettings?: () => void;
}

export function UserMenu({ userName, userEmail, onLogout, onOpenNotificationSettings }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // P3-5: fokus-bar fingerar tangentbordsnav. Refs samlas in via callback
  // i varje meny-item så vi kan call .focus() programmatiskt.
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Tangentbordsnavigation (P3-5, WCAG 2.1 AA):
  // - Escape stänger menyn och returnerar fokus till triggern
  // - ArrowDown/ArrowUp flyttar fokus mellan items, wrap-around
  // - Home/End hoppar till första/sista
  // - Tab stänger menyn så vidare tab tar användaren ut ur menyn
  useEffect(() => {
    if (!isOpen) return;

    // När menyn öppnas, fokusera första item så piltangenter kan börja navigera.
    const t = setTimeout(() => itemRefs.current.find(Boolean)?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      const items = itemRefs.current.filter((el): el is HTMLElement => !!el);
      if (items.length === 0) return;
      const activeIndex = items.indexOf(document.activeElement as HTMLElement);

      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key === 'Tab') {
        // Låt naturlig tab-ordning ta vid, men stäng menyn så fokus inte
        // återgår dit vid nästa Tab.
        setIsOpen(false);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = activeIndex < 0 ? 0 : (activeIndex + 1) % items.length;
        items[next]?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = activeIndex < 0 ? items.length - 1 : (activeIndex - 1 + items.length) % items.length;
        items[prev]?.focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        items[0]?.focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        items[items.length - 1]?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Återställ ref-arrayen mellan render-passar så stale refs inte ligger kvar
  itemRefs.current = [];
  const registerItem = (el: HTMLElement | null) => {
    if (el && !itemRefs.current.includes(el)) itemRefs.current.push(el);
  };

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      // Default logout behavior - redirect to home
      router.push('/');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger: Avatar + Name + Chevron */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        aria-label={`User menu for ${userName}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={userName}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-sm font-semibold text-primary-foreground">
          {userName.charAt(0).toUpperCase()}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-foreground transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            role="menu"
            aria-label="Användarmeny"
            className="absolute right-0 top-full mt-2 w-60 bg-background/85 backdrop-blur-md rounded-xl shadow-soft-lg border border-border/20 py-2 z-50"
          >
            {/* User Info Section */}
            <div className="px-4 py-3 border-b border-border/50">
              <div className="font-body font-medium text-foreground">{userName}</div>
              {userEmail && (
                <div className="text-xs font-body text-muted-foreground mt-0.5">{userEmail}</div>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* Profil-knappen togs bort (P2-14): den var en no-op.
                  Användarens namn + e-post visas redan i sektionen ovan. */}

              {/* Dokumentation (ersätter tidigare Dashboard-inställningar som låg på /admin) */}
              <Link
                ref={registerItem}
                role="menuitem"
                href="/docs"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted focus:bg-muted focus:outline-none transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-body text-foreground">Dokumentation</span>
              </Link>

              {/* Notification Settings */}
              {onOpenNotificationSettings && (
                <button
                  ref={registerItem}
                  role="menuitem"
                  onClick={() => {
                    onOpenNotificationSettings();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted focus:bg-muted focus:outline-none transition-colors text-left"
                >
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-body text-foreground">Notiser</span>
                </button>
              )}

              {/* Theme Toggle (inline) */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-body font-medium text-foreground">Tema</span>
                  <div className="flex gap-1 bg-background/50 rounded-full p-1">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-1.5 rounded-full transition-colors ${
                        theme === 'light'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      aria-label="Light theme"
                    >
                      <Sun className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-1.5 rounded-full transition-colors ${
                        theme === 'dark'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      aria-label="Dark theme"
                    >
                      <Moon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout */}
            <div className="border-t border-border/50 pt-1">
              <button
                ref={registerItem}
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted focus:bg-muted focus:outline-none transition-colors text-left text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-body">Logga ut</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
