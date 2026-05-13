import { useState, useEffect, useRef, useCallback } from 'react'
import type { NewsItem, DashboardColumn } from '@/lib/types'
import type { NotificationSettings, DesktopNotificationPermission } from '@/lib/dashboard/types'
import { getCategory } from '@/lib/categories'

interface UseColumnNotificationsProps {
  settings: NotificationSettings
  desktopPermission: DesktopNotificationPermission
  showDesktopNotification: (content: {
    title: string
    body: string
    tag?: string
    data?: Record<string, unknown>
  }) => Notification | null
  columns: DashboardColumn[]
}

interface UseColumnNotificationsReturn {
  showAudioPrompt: boolean
  audioReady: boolean
  handleNewItems: (columnId: string, items: NewsItem[]) => void
  playSound: () => void
  enableAudio: () => Promise<void>
  disableAudio: () => void
  dismissAudioPrompt: () => void
  testNotification: () => void
}

/**
 * Hook for managing notifications (audio + desktop) for columns.
 * Handles audio initialization, autoplay policy, and notification triggering.
 */
export function useColumnNotifications({
  settings,
  desktopPermission,
  showDesktopNotification,
  columns,
}: UseColumnNotificationsProps): UseColumnNotificationsReturn {
  const [showAudioPrompt, setShowAudioPrompt] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio element and handle autoplay policy
  useEffect(() => {
    const audio = new Audio('/52pj7t0b7w3-notification-sfx-10.mp3')
    audio.volume = 0.5

    // Try to preload and enable audio
    audio.load()

    // Check if user has made an audio preference choice
    const audioPreference = localStorage.getItem('audioEnabled')

    // Test if audio can play (autoplay policy check)
    const testAudio = async () => {
      // If user has explicitly disabled audio, don't show prompt
      if (audioPreference === 'false') {
        console.log('🔇 Audio disabled by user preference')
        return
      }

      // If user has already enabled audio, try to initialize silently
      if (audioPreference === 'true') {
        try {
          await audio.play()
          audio.pause()
          audio.currentTime = 0
          setAudioReady(true)
          console.log('✅ Audio initialized successfully from saved preference')
          return
        } catch (error) {
          console.log('⚠️ Audio blocked despite saved preference:', error)
        }
      }

      // First-time visit or previous attempt failed - test autoplay
      try {
        await audio.play()
        audio.pause()
        audio.currentTime = 0
        setAudioReady(true)
        console.log('✅ Audio initialized successfully')
        // Save successful autoplay
        localStorage.setItem('audioEnabled', 'true')
      } catch (error) {
        console.log('⚠️ Audio blocked by autoplay policy. User interaction needed:', error)
        // Only show prompt if user hasn't made a choice yet and sound notifications are enabled
        if (!audioPreference && settings.global.masterEnabled && settings.global.defaultSoundEnabled) {
          setShowAudioPrompt(true)
        }
      }
    }

    audioRef.current = audio
    testAudio()
  }, [settings.global.masterEnabled, settings.global.defaultSoundEnabled])

  // Play sound
  const playSound = useCallback(() => {
    if (audioRef.current) {
      console.log('🔔 Playing notification sound')
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(e => {
        console.warn('⚠️ Could not play notification sound:', e)
        setShowAudioPrompt(true)
      })
    }
  }, [])

  // Handle new items - determine what notifications to show
  const handleNewItems = useCallback((columnId: string, items: NewsItem[]) => {
    // Master toggle check
    if (!settings.global.masterEnabled) {
      console.log(`🔇 Notifications disabled globally`)
      return
    }

    // Find the column to get its title
    const column = columns.find(c => c.id === columnId)
    const columnTitle = column?.title || 'Kolumn'

    // Filter items by newsValue threshold
    const notifiableItems = items.filter(
      item => item.newsValue >= settings.global.newsValueThreshold
    )

    if (notifiableItems.length === 0) {
      console.log(`🔇 No items meet newsValue threshold (${settings.global.newsValueThreshold})`)
      return
    }

    // Get column-specific settings (or defaults)
    const columnSettings = settings.columns[columnId] || {
      soundEnabled: settings.global.defaultSoundEnabled,
      desktopEnabled: settings.global.defaultDesktopEnabled
    }

    // Play sound if enabled
    if (columnSettings.soundEnabled && audioReady) {
      playSound()
    } else if (columnSettings.soundEnabled && !audioReady) {
      console.log('🔇 Sound enabled but audio not ready')
    }

    // Show desktop notification if enabled and permission granted
    if (columnSettings.desktopEnabled && desktopPermission === 'granted') {
      // Use the highest priority item for the notification
      const topItem = notifiableItems.reduce((best, item) =>
        item.newsValue > best.newsValue ? item : best
      , notifiableItems[0])

      // Build notification body with source and category
      const category = topItem.category
        ? getCategory(topItem.category)?.label || topItem.category
        : 'Nyhet'
      const body = `${topItem.source} • ${category}`

      showDesktopNotification({
        title: topItem.title,
        body,
        tag: `newsdeck-${columnId}-${topItem.dbId}`,
        data: { columnId, itemId: topItem.dbId }
      })

      // If there are more items, show a count
      if (notifiableItems.length > 1) {
        console.log(`📢 ${notifiableItems.length - 1} more items in ${columnTitle}`)
      }
    } else if (columnSettings.desktopEnabled && desktopPermission !== 'granted') {
      console.log(`🔇 Desktop notifications enabled but permission is: ${desktopPermission}`)
    }
  }, [settings, columns, audioReady, desktopPermission, playSound, showDesktopNotification])

  // Test notification - useful for settings modal.
  // Always attempts to play sound + show desktop notification regardless of
  // current settings, since the user explicitly clicked "test". The click
  // counts as a user gesture so the browser allows audio playback even if
  // the autoplay init failed earlier.
  const testNotification = useCallback(() => {
    // Attempt to play sound regardless of settings/audioReady — this click IS
    // the required user gesture, so autoplay policies should permit it.
    if (audioRef.current) {
      console.log('🔔 Testing notification sound')
      audioRef.current.currentTime = 0
      audioRef.current.play()
        .then(() => {
          // Successful play implies audio is now unlocked; remember it.
          if (!audioReady) {
            setAudioReady(true)
            localStorage.setItem('audioEnabled', 'true')
            console.log('✅ Audio unlocked by test-button gesture')
          }
        })
        .catch(e => {
          console.warn('⚠️ Test playback failed:', e)
          setShowAudioPrompt(true)
        })
    } else {
      console.warn('⚠️ Audio element not initialised yet')
    }

    // Always attempt a desktop notification if permission is granted.
    if (desktopPermission === 'granted') {
      showDesktopNotification({
        title: 'Testnotis',
        body: 'Newsdeck • Notiser fungerar!',
        tag: 'newsdeck-test'
      })
    } else {
      console.log(`🔕 Desktop notification permission: ${desktopPermission}`)
    }
  }, [audioReady, desktopPermission, showDesktopNotification])

  const enableAudio = useCallback(async () => {
    try {
      if (audioRef.current) {
        await audioRef.current.play()
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        localStorage.setItem('audioEnabled', 'true')
        setAudioReady(true)
        setShowAudioPrompt(false)
        console.log('✅ Audio enabled by user')
      }
    } catch (e) {
      console.error('Failed to enable audio:', e)
    }
  }, [])

  const disableAudio = useCallback(() => {
    localStorage.setItem('audioEnabled', 'false')
    setShowAudioPrompt(false)
    console.log('🔇 Audio disabled by user')
  }, [])

  const dismissAudioPrompt = useCallback(() => {
    setShowAudioPrompt(false)
  }, [])

  return {
    showAudioPrompt,
    audioReady,
    handleNewItems,
    playSound,
    enableAudio,
    disableAudio,
    dismissAudioPrompt,
    testNotification,
  }
}

// Legacy exports for backwards compatibility during migration
export type { UseColumnNotificationsProps, UseColumnNotificationsReturn }
