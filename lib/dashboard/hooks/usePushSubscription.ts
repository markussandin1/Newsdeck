import { useState, useEffect, useCallback } from 'react'
import { clientLogger } from '@/lib/logger.client'

/**
 * Konverterar VAPID-nyckeln från URL-safe base64 till Uint8Array
 * som PushManager.subscribe() förväntar sig.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return new Uint8Array(Array.from(raw, c => c.charCodeAt(0)))
}

interface UsePushSubscriptionProps {
  columnIds: string[]
  newsValueThreshold: number
}

/**
 * Hanterar Web Push-prenumerationen för den här browsern/enheten.
 * isSubscribed reflekterar pushManager-state; enable/disable synkar
 * mot /api/push/subscribe. Kolumnlista + tröskel skickas med vid varje
 * (re-)subscribe så server-side-filtreringen följer användarens settings.
 */
export function usePushSubscription({ columnIds, newsValueThreshold }: UsePushSubscriptionProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  // Kontrollera stöd och hämta befintlig prenumerationsstatus vid montering
  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    setIsSupported(supported)
    if (!supported) return

    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setIsSubscribed(Boolean(sub)))
      .catch(() => setIsSubscribed(false))
  }, [])

  // Re-synka prenumerationen mot servern när kolumnlista eller tröskel ändras
  // och användaren redan har en aktiv prenumeration.
  // Jämför med föregående värde via ref för att undvika onödiga POST:ar.
  useEffect(() => {
    if (!isSubscribed || !isSupported) return

    let cancelled = false

    const resync = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!sub || cancelled) return

        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: sub.toJSON(),
            columnIds,
            newsValueThreshold,
          }),
        })
        if (!res.ok && !cancelled) {
          clientLogger.warn('push.resync.failed', { status: res.status })
        }
      } catch (error) {
        if (!cancelled) {
          clientLogger.error('push.resync.error', { error: String(error) })
        }
      }
    }

    // Debounce: vänta 500 ms så täta renders inte triggar flera POST:ar
    const timer = setTimeout(resync, 500)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isSubscribed, isSupported, columnIds, newsValueThreshold])

  const subscribe = useCallback(async () => {
    setIsBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), columnIds, newsValueThreshold }),
      })
      if (!res.ok) throw new Error(`subscribe failed: ${res.status}`)

      setIsSubscribed(true)
      return true
    } catch (error) {
      clientLogger.error('push.subscribe.failed', { error: String(error) })
      return false
    } finally {
      setIsBusy(false)
    }
  }, [columnIds, newsValueThreshold])

  const unsubscribe = useCallback(async () => {
    setIsBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
    } catch (error) {
      clientLogger.error('push.unsubscribe.failed', { error: String(error) })
    } finally {
      setIsBusy(false)
    }
  }, [])

  return { isSupported, isSubscribed, isBusy, subscribe, unsubscribe }
}
