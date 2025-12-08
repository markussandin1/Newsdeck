import { useState, useEffect, useCallback } from 'react'
import type {
  NotificationSettings,
  ColumnNotificationSettings,
  GlobalNotificationSettings,
} from '@/lib/dashboard/types'
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/dashboard/types'

interface UseNotificationSettingsProps {
  dashboardId: string
}

interface UseNotificationSettingsReturn {
  // Settings state
  settings: NotificationSettings
  isLoaded: boolean

  // Global settings actions
  setMasterEnabled: (enabled: boolean) => void
  setDefaultSoundEnabled: (enabled: boolean) => void
  setDefaultDesktopEnabled: (enabled: boolean) => void
  setNewsValueThreshold: (threshold: 1 | 2 | 3 | 4 | 5) => void
  updateGlobalSettings: (updates: Partial<GlobalNotificationSettings>) => void

  // Column settings actions
  getColumnSettings: (columnId: string) => ColumnNotificationSettings
  setColumnSoundEnabled: (columnId: string, enabled: boolean) => void
  setColumnDesktopEnabled: (columnId: string, enabled: boolean) => void
  updateColumnSettings: (columnId: string, updates: Partial<ColumnNotificationSettings>) => void

  // Utility
  shouldNotify: (columnId: string, newsValue: number) => { sound: boolean; desktop: boolean }
}

const STORAGE_KEY_PREFIX = 'notificationSettings_'

/**
 * Migrate from legacy localStorage keys to new settings structure
 */
function migrateFromLegacy(dashboardId: string): NotificationSettings | null {
  const legacyMuted = localStorage.getItem(`mutedColumns_${dashboardId}`)
  const legacyAudio = localStorage.getItem('audioEnabled')

  // No legacy data to migrate
  if (!legacyMuted && !legacyAudio) {
    return null
  }

  const settings: NotificationSettings = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS))

  // Migrate muted columns
  if (legacyMuted) {
    try {
      const mutedIds: string[] = JSON.parse(legacyMuted)
      mutedIds.forEach(id => {
        settings.columns[id] = {
          soundEnabled: false,
          desktopEnabled: settings.global.defaultDesktopEnabled
        }
      })
      console.log(`Migrated ${mutedIds.length} muted columns from legacy storage`)
    } catch (e) {
      console.error('Failed to migrate legacy muted columns:', e)
    }
  }

  // Migrate global audio preference
  if (legacyAudio === 'false') {
    settings.global.defaultSoundEnabled = false
    console.log('Migrated audio disabled preference from legacy storage')
  }

  return settings
}

/**
 * Hook for managing notification settings with localStorage persistence
 */
export function useNotificationSettings({
  dashboardId,
}: UseNotificationSettingsProps): UseNotificationSettingsReturn {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  const storageKey = `${STORAGE_KEY_PREFIX}${dashboardId}`

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      // First, check for existing new-format settings
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as NotificationSettings
          // Merge with defaults to ensure new fields are present
          const merged: NotificationSettings = {
            global: { ...DEFAULT_NOTIFICATION_SETTINGS.global, ...parsed.global },
            columns: { ...parsed.columns }
          }
          setSettings(merged)
          setIsLoaded(true)
          console.log('Loaded notification settings from localStorage')
          return
        } catch (e) {
          console.error('Failed to parse notification settings:', e)
        }
      }

      // Try to migrate from legacy format
      const migrated = migrateFromLegacy(dashboardId)
      if (migrated) {
        setSettings(migrated)
        // Save migrated settings to new format
        localStorage.setItem(storageKey, JSON.stringify(migrated))
        // Clean up legacy keys after successful migration
        localStorage.removeItem(`mutedColumns_${dashboardId}`)
        // Note: Keep 'audioEnabled' as it might be used by other dashboards
        console.log('Migrated and saved notification settings')
      }

      setIsLoaded(true)
    }

    loadSettings()
  }, [dashboardId, storageKey])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(storageKey, JSON.stringify(settings))
    }
  }, [settings, storageKey, isLoaded])

  // Get column settings with fallback to global defaults
  const getColumnSettings = useCallback((columnId: string): ColumnNotificationSettings => {
    const columnSettings = settings.columns[columnId]
    if (columnSettings) {
      return columnSettings
    }
    // Return defaults from global settings
    return {
      soundEnabled: settings.global.defaultSoundEnabled,
      desktopEnabled: settings.global.defaultDesktopEnabled
    }
  }, [settings])

  // Check if we should notify for a specific column and newsValue
  const shouldNotify = useCallback((columnId: string, newsValue: number): { sound: boolean; desktop: boolean } => {
    // Master toggle check
    if (!settings.global.masterEnabled) {
      return { sound: false, desktop: false }
    }

    // NewsValue threshold check
    if (newsValue < settings.global.newsValueThreshold) {
      return { sound: false, desktop: false }
    }

    // Get column-specific settings (or defaults)
    const columnSettings = getColumnSettings(columnId)

    return {
      sound: columnSettings.soundEnabled,
      desktop: columnSettings.desktopEnabled
    }
  }, [settings, getColumnSettings])

  // Global settings setters
  const setMasterEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      global: { ...prev.global, masterEnabled: enabled }
    }))
  }, [])

  const setDefaultSoundEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      global: { ...prev.global, defaultSoundEnabled: enabled }
    }))
  }, [])

  const setDefaultDesktopEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      global: { ...prev.global, defaultDesktopEnabled: enabled }
    }))
  }, [])

  const setNewsValueThreshold = useCallback((threshold: 1 | 2 | 3 | 4 | 5) => {
    setSettings(prev => ({
      ...prev,
      global: { ...prev.global, newsValueThreshold: threshold }
    }))
  }, [])

  const updateGlobalSettings = useCallback((updates: Partial<GlobalNotificationSettings>) => {
    setSettings(prev => ({
      ...prev,
      global: { ...prev.global, ...updates }
    }))
  }, [])

  // Column settings setters
  const setColumnSoundEnabled = useCallback((columnId: string, enabled: boolean) => {
    setSettings(prev => {
      const currentColumnSettings = prev.columns[columnId] || {
        soundEnabled: prev.global.defaultSoundEnabled,
        desktopEnabled: prev.global.defaultDesktopEnabled
      }
      return {
        ...prev,
        columns: {
          ...prev.columns,
          [columnId]: { ...currentColumnSettings, soundEnabled: enabled }
        }
      }
    })
  }, [])

  const setColumnDesktopEnabled = useCallback((columnId: string, enabled: boolean) => {
    setSettings(prev => {
      const currentColumnSettings = prev.columns[columnId] || {
        soundEnabled: prev.global.defaultSoundEnabled,
        desktopEnabled: prev.global.defaultDesktopEnabled
      }
      return {
        ...prev,
        columns: {
          ...prev.columns,
          [columnId]: { ...currentColumnSettings, desktopEnabled: enabled }
        }
      }
    })
  }, [])

  const updateColumnSettings = useCallback((columnId: string, updates: Partial<ColumnNotificationSettings>) => {
    setSettings(prev => {
      const currentColumnSettings = prev.columns[columnId] || {
        soundEnabled: prev.global.defaultSoundEnabled,
        desktopEnabled: prev.global.defaultDesktopEnabled
      }
      return {
        ...prev,
        columns: {
          ...prev.columns,
          [columnId]: { ...currentColumnSettings, ...updates }
        }
      }
    })
  }, [])

  return {
    settings,
    isLoaded,
    setMasterEnabled,
    setDefaultSoundEnabled,
    setDefaultDesktopEnabled,
    setNewsValueThreshold,
    updateGlobalSettings,
    getColumnSettings,
    setColumnSoundEnabled,
    setColumnDesktopEnabled,
    updateColumnSettings,
    shouldNotify,
  }
}
