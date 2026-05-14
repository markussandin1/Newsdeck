import { useState, useEffect, useRef, useCallback } from 'react'
import type { NewsItem, DashboardColumn } from '@/lib/types'
import type { NotificationSettings, DesktopNotificationPermission } from '@/lib/dashboard/types'
import { getCategory } from '@/lib/categories'
import { clientLogger } from '@/lib/logger.client'

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
    audio.load()

    const audioPreference = localStorage.getItem('audioEnabled')

    const testAudio = async () => {
      if (audioPreference === 'false') return

      // If user has already enabled audio, try to initialize silently
      if (audioPreference === 'true') {
        try {
          await audio.play()
          audio.pause()
          audio.currentTime = 0
          setAudioReady(true)
          return
        } catch {
          // Audio blocked despite saved preference — fall through to autoplay-test
        }
      }

      // First-time visit or previous attempt failed — test autoplay
      try {
        await audio.play()
        audio.pause()
        audio.currentTime = 0
        setAudioReady(true)
        localStorage.setItem('audioEnabled', 'true')
      } catch {
        // Blocked by autoplay policy — bara visa prompt om anvandaren inte
        // tidigare valt och om ljud i grunden ar aktiverat
        if (!audioPreference && settings.global.masterEnabled && settings.global.defaultSoundEnabled) {
          setShowAudioPrompt(true)
        }
      }
    }

    audioRef.current = audio
    testAudio()
  }, [settings.global.masterEnabled, settings.global.defaultSoundEnabled])

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(error => {
        clientLogger.warn('notifications.playSound.failed', { error: String(error) })
        setShowAudioPrompt(true)
      })
    }
  }, [])

  const handleNewItems = useCallback((columnId: string, items: NewsItem[]) => {
    if (!settings.global.masterEnabled) return

    const notifiableItems = items.filter(
      item => item.newsValue >= settings.global.newsValueThreshold,
    )
    if (notifiableItems.length === 0) return

    const columnSettings = settings.columns[columnId] || {
      soundEnabled: settings.global.defaultSoundEnabled,
      desktopEnabled: settings.global.defaultDesktopEnabled,
    }

    if (columnSettings.soundEnabled && audioReady) {
      playSound()
    }

    if (columnSettings.desktopEnabled && desktopPermission === 'granted') {
      const topItem = notifiableItems.reduce(
        (best, item) => (item.newsValue > best.newsValue ? item : best),
        notifiableItems[0],
      )

      const category = topItem.category
        ? getCategory(topItem.category)?.label || topItem.category
        : 'Nyhet'
      const body = `${topItem.source} • ${category}`

      showDesktopNotification({
        title: topItem.title,
        body,
        tag: `newsdeck-${columnId}-${topItem.dbId}`,
        data: { columnId, itemId: topItem.dbId },
      })
    }
  }, [settings, audioReady, desktopPermission, playSound, showDesktopNotification])

  /**
   * Test-notis ignorerar settings — klicket racker som user gesture sa
   * webblasaren tillater audio playback aven om autoplay tidigare misslyckats.
   */
  const testNotification = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
        .then(() => {
          if (!audioReady) {
            setAudioReady(true)
            localStorage.setItem('audioEnabled', 'true')
          }
        })
        .catch(error => {
          clientLogger.warn('notifications.testSound.failed', { error: String(error) })
          setShowAudioPrompt(true)
        })
    }

    if (desktopPermission === 'granted') {
      showDesktopNotification({
        title: 'Testnotis',
        body: 'Newsdeck • Notiser fungerar!',
        tag: 'newsdeck-test',
      })
    }
  }, [audioReady, desktopPermission, showDesktopNotification])

  // Suppress unused warning — columns prop kept for back-compat
  void columns

  const enableAudio = useCallback(async () => {
    try {
      if (audioRef.current) {
        await audioRef.current.play()
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        localStorage.setItem('audioEnabled', 'true')
        setAudioReady(true)
        setShowAudioPrompt(false)
      }
    } catch (error) {
      clientLogger.error('notifications.enableAudio.failed', { error: String(error) })
    }
  }, [])

  const disableAudio = useCallback(() => {
    localStorage.setItem('audioEnabled', 'false')
    setShowAudioPrompt(false)
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

export type { UseColumnNotificationsProps, UseColumnNotificationsReturn }
