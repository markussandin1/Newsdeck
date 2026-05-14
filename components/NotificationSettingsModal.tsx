'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, Volume2, VolumeX, Monitor, X, Check, AlertTriangle } from 'lucide-react';
import type { NotificationSettings, DesktopNotificationPermission } from '@/lib/dashboard/types';

interface NotificationSettingsModalProps {
  settings: NotificationSettings;
  desktopPermission: DesktopNotificationPermission;
  onClose: () => void;
  onUpdateGlobal: (updates: Partial<NotificationSettings['global']>) => void;
  onRequestDesktopPermission: () => Promise<NotificationPermission>;
  onTestNotification: () => void;
}

const NEWS_VALUE_LABELS: Record<number, string> = {
  1: 'Alla nyheter (1+)',
  2: 'Låg prioritet (2+)',
  3: 'Normal prioritet (3+)',
  4: 'Hög prioritet (4+)',
  5: 'Endast kritiska (5)',
};

export function NotificationSettingsModal({
  settings,
  desktopPermission,
  onClose,
  onUpdateGlobal,
  onRequestDesktopPermission,
  onTestNotification,
}: NotificationSettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleRequestPermission = async () => {
    setRequestingPermission(true);
    try {
      await onRequestDesktopPermission();
    } finally {
      setRequestingPermission(false);
    }
  };

  const getPermissionStatus = () => {
    switch (desktopPermission) {
      case 'granted':
        return { text: 'Tillåtet', color: 'text-green-500', icon: Check };
      case 'denied':
        return { text: 'Blockerat', color: 'text-red-500', icon: AlertTriangle };
      case 'default':
        return { text: 'Ej valt', color: 'text-yellow-500', icon: Bell };
      case 'unsupported':
        return { text: 'Stöds ej', color: 'text-muted-foreground', icon: BellOff };
      default:
        return { text: 'Okänt', color: 'text-muted-foreground', icon: Bell };
    }
  };

  const permissionStatus = getPermissionStatus();
  const PermissionIcon = permissionStatus.icon;

  if (!mounted) return null;

  const modalContent = (
    <div
      className="nd-modal-wrap"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-settings-title"
      onClick={onClose}
    >
      <div className="nd-modal nd-modal-sm" onClick={(e) => e.stopPropagation()}>
        <header>
          <div className="nd-mh-l">
            <Bell className="h-3.5 w-3.5" style={{ color: 'var(--nd-accent)' }} />
            <span id="notification-settings-title" className="nd-mh-col">Notisinställningar</span>
          </div>
          <div className="nd-mh-r">
            <button onClick={onClose} aria-label="Stäng" className="nd-mh-x">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <div className="nd-mbody" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.global.masterEnabled ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <div className="font-medium">Aktivera notiser</div>
                <div className="text-sm text-muted-foreground">
                  Huvudbrytare för alla notiser
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateGlobal({ masterEnabled: !settings.global.masterEnabled })}
              className={`nd-toggle ${settings.global.masterEnabled ? 'nd-on' : ''}`}
              role="switch"
              aria-checked={settings.global.masterEnabled}
            >
              <span className="nd-toggle-knob" />
            </button>
          </div>

          {/* Divider */}
          <hr className="border-border/50" />

          {/* Sound Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.global.defaultSoundEnabled ? (
                <Volume2 className="h-5 w-5 text-blue-500" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <div className="font-medium">Ljudnotiser</div>
                <div className="text-sm text-muted-foreground">
                  Spela ljud vid nya händelser
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateGlobal({ defaultSoundEnabled: !settings.global.defaultSoundEnabled })}
              disabled={!settings.global.masterEnabled}
              className={`nd-toggle ${settings.global.defaultSoundEnabled ? 'nd-on-blue' : ''}`}
              role="switch"
              aria-checked={settings.global.defaultSoundEnabled}
            >
              <span className="nd-toggle-knob" />
            </button>
          </div>

          {/* Desktop Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className={`h-5 w-5 ${
                  settings.global.defaultDesktopEnabled ? 'text-green-500' : 'text-muted-foreground'
                }`} />
                <div>
                  <div className="font-medium">Desktop-notiser</div>
                  <div className="text-sm text-muted-foreground">
                    Visa notiser i skrivbordsmiljön
                  </div>
                </div>
              </div>
              <button
                onClick={() => onUpdateGlobal({ defaultDesktopEnabled: !settings.global.defaultDesktopEnabled })}
                disabled={!settings.global.masterEnabled || desktopPermission === 'unsupported'}
                className={`nd-toggle ${settings.global.defaultDesktopEnabled ? 'nd-on-green' : ''}`}
                role="switch"
                aria-checked={settings.global.defaultDesktopEnabled}
              >
                <span className="nd-toggle-knob" />
              </button>
            </div>

            {/* Permission Status */}
            <div className="flex items-center justify-between pl-8">
              <div className="flex items-center gap-2">
                <PermissionIcon className={`h-4 w-4 ${permissionStatus.color}`} />
                <span className={`text-sm ${permissionStatus.color}`}>
                  {permissionStatus.text}
                </span>
              </div>
              {desktopPermission === 'default' && (
                <button
                  onClick={handleRequestPermission}
                  disabled={requestingPermission}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  {requestingPermission ? 'Begär...' : 'Be om tillstånd'}
                </button>
              )}
              {desktopPermission === 'denied' && (
                <span className="text-xs text-muted-foreground">
                  Ändra i webbläsarens inställningar
                </span>
              )}
            </div>

            {/* P2-12: Tydlig Chrome-begränsning så icke-Chrome-användare
                inte tror att appen är trasig. */}
            {desktopPermission === 'unsupported' && (
              <div className="pl-8 text-xs text-muted-foreground leading-relaxed">
                Desktop-notiser kräver Chrome på dator. Ljudnotiser fungerar i alla
                webbläsare.
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="border-border/50" />

          {/* Priority Threshold */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <div className="font-medium">Prioritetströskel</div>
                <div className="text-sm text-muted-foreground">
                  Notifiera endast för viktigare händelser
                </div>
              </div>
            </div>
            <select
              value={settings.global.newsValueThreshold}
              onChange={(e) => onUpdateGlobal({ newsValueThreshold: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
              disabled={!settings.global.masterEnabled}
              className="nd-input"
              style={!settings.global.masterEnabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {NEWS_VALUE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <footer className="nd-mfoot" style={{ justifyContent: 'space-between' }}>
          <button
            onClick={onTestNotification}
            className="nd-btn nd-btn-ghost"
          >
            Testa notis
          </button>
          <button
            onClick={onClose}
            className="nd-btn nd-btn-primary"
          >
            Klar
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
