import { useState, useEffect, useRef, useCallback } from 'react'

interface UseColumnNotificationsProps {
  dashboardId: string
}

interface UseColumnNotificationsReturn {
  mutedColumns: Set<string>
  showAudioPrompt: boolean
  toggleMute: (columnId: string) => void
  playNotification: (columnId: string) => void
  enableAudio: () => Promise<void>
  disableAudio: () => void
  dismissAudioPrompt: () => void
}

/**
 * Hook for managing audio notifications for columns.
 * Handles audio initialization, autoplay policy, mute state persistence.
 */
export function useColumnNotifications({
  dashboardId,
}: UseColumnNotificationsProps): UseColumnNotificationsReturn {
  const [mutedColumns, setMutedColumns] = useState<Set<string>>(new Set())
  const [showAudioPrompt, setShowAudioPrompt] = useState(false)
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
        console.log('✅ Audio initialized successfully')
        // Save successful autoplay
        localStorage.setItem('audioEnabled', 'true')
      } catch (error) {
        console.log('⚠️ Audio blocked by autoplay policy. User interaction needed:', error)
        // Only show prompt if user hasn't made a choice yet
        if (!audioPreference) {
          setShowAudioPrompt(true)
        }
      }
    }

    audioRef.current = audio
    testAudio()
  }, [])

  // Load muted columns from localStorage
  useEffect(() => {
    const storageKey = `mutedColumns_${dashboardId}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setMutedColumns(new Set(parsed))
      } catch (e) {
        console.error('Failed to parse muted columns:', e)
      }
    }
  }, [dashboardId])

  // Save muted columns to localStorage
  useEffect(() => {
    const storageKey = `mutedColumns_${dashboardId}`
    localStorage.setItem(storageKey, JSON.stringify(Array.from(mutedColumns)))
  }, [mutedColumns, dashboardId])

  const toggleMute = useCallback((columnId: string) => {
    setMutedColumns(prev => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }, [])

  const playNotification = useCallback((columnId: string) => {
    if (!mutedColumns.has(columnId) && audioRef.current) {
      console.log(`🔔 Trying to play notification for column ${columnId}`)
      audioRef.current.currentTime = 0 // Reset to start
      audioRef.current.play().catch(e => {
        console.warn('⚠️ Could not play notification sound:', e)
        setShowAudioPrompt(true)
      })
    } else if (mutedColumns.has(columnId)) {
      console.log(`🔇 Column ${columnId} is muted, skipping sound`)
    }
  }, [mutedColumns])

  const enableAudio = useCallback(async () => {
    try {
      if (audioRef.current) {
        await audioRef.current.play()
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        localStorage.setItem('audioEnabled', 'true')
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
    mutedColumns,
    showAudioPrompt,
    toggleMute,
    playNotification,
    enableAudio,
    disableAudio,
    dismissAudioPrompt,
  }
}
