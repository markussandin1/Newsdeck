'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, User, Sun, Moon, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserMenuProps {
  userName: string;
  userEmail?: string;
  dashboardId: string;
  onLogout?: () => void;
}

export function UserMenu({ userName, userEmail, dashboardId, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-sm font-semibold text-primary-foreground">
          {userName.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-body font-medium text-foreground hidden md:block">
          {userName}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
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
              {/* Profile (placeholder - can be implemented later) */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                onClick={() => {
                  // Profile action - placeholder
                  setIsOpen(false);
                }}
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-body text-foreground">Profil</span>
              </button>

              {/* Dashboard Settings */}
              <Link
                href={`/admin?dashboardId=${dashboardId}`}
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-body text-foreground">Dashboard-inställningar</span>
              </Link>

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
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left text-destructive"
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
