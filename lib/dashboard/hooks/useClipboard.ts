/**
 * useClipboard Hook
 *
 * Manages clipboard operations with toast feedback:
 * - copyToClipboard: copies arbitrary text with toast notification
 * - copyColumnFeedUrl: copies column Atom feed URL
 */

import { useState, useCallback } from 'react'

interface UseClipboardReturn {
  copiedId: string | null
  copiedFeedId: string | null
  toastMessage: string | null
  copyToClipboard: (text: string | undefined, columnId: string, columnTitle: string, label?: string) => Promise<void>
  copyColumnFeedUrl: (columnId: string, columnTitle: string) => Promise<void>
}

export function useClipboard(): UseClipboardReturn {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedFeedId, setCopiedFeedId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const copyToClipboard = useCallback(async (
    text: string | undefined,
    columnId: string,
    columnTitle: string,
    label = 'Kolumn ID'
  ) => {
    if (!text) {
      setToastMessage(`Ingen ${label.toLowerCase()} att kopiera för ${columnTitle}`)
      setTimeout(() => setToastMessage(null), 2500)
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(columnId)
      setToastMessage(`${label}: ${text} för kolumnen ${columnTitle} är kopierat`)
      setTimeout(() => {
        setCopiedId(null)
        setToastMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [])

  const copyColumnFeedUrl = useCallback(async (columnId: string, columnTitle: string) => {
    const url = `${window.location.origin}/feeds/columns/${columnId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedFeedId(columnId)
      setToastMessage(`Feed-URL för ${columnTitle} är kopierad`)
      setTimeout(() => {
        setCopiedFeedId(null)
        setToastMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Failed to copy feed URL:', error)
    }
  }, [])

  return {
    copiedId,
    copiedFeedId,
    toastMessage,
    copyToClipboard,
    copyColumnFeedUrl,
  }
}
