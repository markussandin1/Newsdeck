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
 * Currently optimized for Chrome on desktop
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

    // Check if it's Chrome on desktop
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    if (!isChrome || isMobile) {
      console.log('🔇 Desktop notifications only supported on Chrome desktop')
      setIsSupported(false)
      setPermission('unsupported')
      return
    }

    if ('Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
      console.log('✅ Desktop notifications supported, permission:', Notification.permission)
    } else {
      setIsSupported(false)
      setPermission('unsupported')
      console.log('❌ Desktop notifications not supported in this browser')
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
    console.log('🔔 showNotification called:', {
      isSupported,
      permission,
      title: content.title,
      body: content.body
    })

    if (!isSupported) {
      console.warn('❌ Cannot show notification: Notifications not supported on this browser/device')
      return null
    }

    if (permission !== 'granted') {
      console.warn(`❌ Cannot show notification: Permission is "${permission}"`)
      console.warn('💡 Tip: Check System Settings → Notifications → Chrome and allow notifications')
      return null
    }

    try {
      console.log('📱 Creating Notification object...')

      const notification = new Notification(content.title, {
        body: content.body,
        icon: content.icon || '/newsdeck-icon.svg',
        badge: '/newsdeck-icon.svg',
        tag: content.tag || 'newsdeck-notification',
        requireInteraction: false, // Auto-dismiss after a while
        silent: false, // Play sound
        data: content.data,
      })

      // Handle click - focus the window
      notification.onclick = () => {
        console.log('🖱️ Notification clicked')
        window.focus()
        notification.close()
      }

      // Handle errors
      notification.onerror = (event) => {
        console.error('❌ Notification error event:', event)
      }

      // Handle show event
      notification.onshow = () => {
        console.log('✅ Notification shown successfully!')
      }

      // Handle close event
      notification.onclose = () => {
        console.log('🚪 Notification closed')
      }

      console.log('✅ Notification object created successfully')

      return notification
    } catch (error) {
      console.error('❌ Error creating notification:', error)
      console.error('💡 This might be a system-level notification block. Check:')
      console.error('   - Mac: System Settings → Notifications → Chrome')
      console.error('   - Chrome: chrome://settings/content/notifications')
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
