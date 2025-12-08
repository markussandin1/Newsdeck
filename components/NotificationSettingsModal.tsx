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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-settings-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-background rounded-xl shadow-2xl border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <h2 id="notification-settings-title" className="text-lg font-semibold">
              Notisinställningar
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Stäng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.global.masterEnabled ? 'bg-primary' : 'bg-muted'
              }`}
              role="switch"
              aria-checked={settings.global.masterEnabled}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  settings.global.masterEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
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
              className={`relative w-12 h-6 rounded-full transition-colors ${
                !settings.global.masterEnabled
                  ? 'bg-muted/50 cursor-not-allowed'
                  : settings.global.defaultSoundEnabled
                  ? 'bg-blue-500'
                  : 'bg-muted'
              }`}
              role="switch"
              aria-checked={settings.global.defaultSoundEnabled}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  settings.global.defaultSoundEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
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
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  !settings.global.masterEnabled || desktopPermission === 'unsupported'
                    ? 'bg-muted/50 cursor-not-allowed'
                    : settings.global.defaultDesktopEnabled
                    ? 'bg-green-500'
                    : 'bg-muted'
                }`}
                role="switch"
                aria-checked={settings.global.defaultDesktopEnabled}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    settings.global.defaultDesktopEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
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
              className={`w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground ${
                !settings.global.masterEnabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {NEWS_VALUE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 bg-muted/30 flex justify-between items-center">
          <button
            onClick={onTestNotification}
            disabled={!settings.global.masterEnabled}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Testa notis
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Klar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
