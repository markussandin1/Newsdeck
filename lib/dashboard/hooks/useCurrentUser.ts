import { useEffect, useState } from 'react'

interface SessionResponse {
  user?: {
    name?: string | null
    email?: string | null
  }
}

/**
 * Hämtar inloggad användare via `/api/auth/session` och returnerar ett
 * visningsbart namn (fallback: e-postens local-part).
 *
 * Extraherat ur DashboardView (P1-3 steg 4). Tidigare en useState +
 * useEffect inline.
 *
 * Returnerar `null` tills sessionen hämtats eller om användaren inte är
 * inloggad. Caller bör hantera båda fallen identiskt — gränssnittet ska
 * visa något neutralt ("User") tills namnet finns.
 */
export function useCurrentUser(): string | null {
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch('/api/auth/session')
        const session = (await response.json()) as SessionResponse | null
        if (cancelled) return
        if (session?.user) {
          setUserName(session.user.name || session.user.email?.split('@')[0] || null)
        }
      } catch (error) {
        // Logger får inte importeras från client-komponenter (node:util-beroende).
        // Behåller console här eftersom det körs i browser.
        console.warn('useCurrentUser.fetchSessionFailed', error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return userName
}
