import { useState, useEffect, useCallback } from 'react'
import type { DesktopNotificationPermission } from '@/lib/dashboard/types'
import { clientLogger } from '@/lib/logger.client'

interface NotificationContent {
  title: string
  body: string
  icon?: string
  tag?: string
  data?: Record<string, unknown>
}

interface UseDesktopNotificationsReturn {
  permission: DesktopNotificationPermission
  isSupported: boolean
  requestPermission: () => Promise<NotificationPermission>
  showNotification: (content: NotificationContent) => Notification | null
}

/**
 * Hook för desktop-notiser via Web Notifications API.
 * Stöder Chrome, Firefox, Safari och Edge på desktop via feature detection.
 */
export function useDesktopNotifications(): UseDesktopNotificationsReturn {
  const [permission, setPermission] = useState<DesktopNotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  // Kontrollera API-stöd och initialt tillstånd vid mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setIsSupported(false)
      setPermission('unsupported')
      return
    }

    // Notification API utan Service Worker fungerar inte på mobil
    // (Android Chrome kräver SW, iOS kräver installerad PWA) — desktop
    // Chrome/Firefox/Safari/Edge stöds alla via feature detection.
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile) {
      setIsSupported(false)
      setPermission('unsupported')
      return
    }

    setIsSupported(true)
    setPermission(Notification.permission)
  }, [])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return 'denied'

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    } catch (error) {
      clientLogger.error('desktopNotifications.requestPermission.failed', { error: String(error) })
      return 'denied'
    }
  }, [isSupported])

  const showNotification = useCallback((content: NotificationContent): Notification | null => {
    if (!isSupported || permission !== 'granted') return null

    const options: NotificationOptions = {
      body: content.body,
      icon: content.icon || '/newsdeck-icon.svg',
      badge: '/newsdeck-icon.svg',
      tag: content.tag || 'newsdeck-notification',
      requireInteraction: false,
      silent: false,
      data: content.data,
    }

    // Via SW-registreringen om möjligt — överlever flikens throttling och
    // ger klick-hantering i sw.js. Fallback till sid-kontextens Notification.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(reg => reg.showNotification(content.title, options))
        .catch(error => {
          clientLogger.error('desktopNotifications.swShow.failed', { error: String(error) })
        })
      return null
    }

    try {
      const notification = new Notification(content.title, options)
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
      return notification
    } catch (error) {
      clientLogger.error('desktopNotifications.showNotification.failed', { error: String(error) })
      return null
    }
  }, [isSupported, permission])

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
  }
}
