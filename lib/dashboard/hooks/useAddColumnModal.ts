/**
 * useAddColumnModal Hook
 *
 * Ager state for "Lagg till kolumn"-modalen:
 *   - isOpen, showArchivedTab (vilken tab i modalen)
 *   - newColumnTitle / newColumnDescription (formdata)
 *
 * Lifecycle:
 *   1. open() — formdata behalls fran forra gangen
 *   2. close() — formdata behalls
 *   3. reset() — nollstaller fait (anvands efter lyckad submit)
 *
 * Notera: tidigare hanterade hooken aven workflow-URL-input + flowId
 * extraktion. Det rev vi sedan P1-5 (workflowId-routing borttagen) —
 * Workflows postar nu via columnId, sa det fanns inget for modalen att
 * gora forrun kolumnen ar skapad.
 */

import { useState } from 'react'

export function useAddColumnModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [showArchivedTab, setShowArchivedTab] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [newColumnDescription, setNewColumnDescription] = useState('')

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  const reset = () => {
    setNewColumnTitle('')
    setNewColumnDescription('')
  }

  return {
    isOpen,
    showArchivedTab,
    newColumnTitle,
    newColumnDescription,
    setShowArchivedTab,
    setNewColumnTitle,
    setNewColumnDescription,
    open,
    close,
    reset,
  }
}
