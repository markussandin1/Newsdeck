import { useState, useEffect, useCallback } from 'react'
import type { DesktopNotificationPermission } from '@/lib/dashboard/types'

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
 * Hook for managing desktop browser notifications using the Web Notifications API
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

    if ('Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    } else {
      setIsSupported(false)
      setPermission('unsupported')
      console.log('Desktop notifications not supported in this browser')
    }
  }, [])

  // Request permission from user
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('Cannot request permission: Notifications not supported')
      return 'denied'
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      console.log(`Desktop notification permission: ${result}`)
      return result
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return 'denied'
    }
  }, [isSupported])

  // Show a desktop notification
  const showNotification = useCallback((content: NotificationContent): Notification | null => {
    if (!isSupported) {
      console.warn('Cannot show notification: Notifications not supported')
      return null
    }

    if (permission !== 'granted') {
      console.warn(`Cannot show notification: Permission is "${permission}"`)
      return null
    }

    try {
      const notification = new Notification(content.title, {
        body: content.body,
        icon: content.icon || '/newsdeck-icon.svg',
        badge: '/newsdeck-icon.svg',
        tag: content.tag || 'newsdeck-notification',
        requireInteraction: false, // Auto-dismiss after a while
        data: content.data,
      })

      // Handle click - focus the window
      notification.onclick = () => {
        window.focus()
        notification.close()

        // If we have column/item data, we could scroll to it
        // This is handled by the caller if needed
      }

      // Log for debugging
      console.log('Showed desktop notification:', content.title)

      return notification
    } catch (error) {
      console.error('Error showing notification:', error)
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
