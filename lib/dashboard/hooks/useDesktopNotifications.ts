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
 * Hook for managing desktop browser notifications using the Web Notifications API.
 * Currently optimized for Chrome on desktop.
 */
export function useDesktopNotifications(): UseDesktopNotificationsReturn {
  const [permission, setPermission] = useState<DesktopNotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  // Check for API support and initial permission on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSupported(false)
      setPermission('unsupported')
      return
    }

    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    if (!isChrome || isMobile) {
      setIsSupported(false)
      setPermission('unsupported')
      return
    }

    if ('Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    } else {
      setIsSupported(false)
      setPermission('unsupported')
    }
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

    try {
      const notification = new Notification(content.title, {
        body: content.body,
        icon: content.icon || '/newsdeck-icon.svg',
        badge: '/newsdeck-icon.svg',
        tag: content.tag || 'newsdeck-notification',
        requireInteraction: false,
        silent: false,
        data: content.data,
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      return notification
    } catch (error) {
      // Failure is usually system-level (Mac: System Settings → Notifications → Chrome)
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
