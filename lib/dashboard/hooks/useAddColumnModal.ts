/**
 * useAddColumnModal Hook
 *
 * Ager all state for "Lagg till kolumn"-modalen:
 *   - isOpen, showArchivedTab (vilken tab i modalen)
 *   - newColumnTitle / newColumnDescription / newColumnFlowId (formdata)
 *   - showWorkflowInput (visa workflow-URL-input)
 *   - urlExtracted (har vi extraherat ett flowId fran URL:en)
 *
 * Lifecyklen for modalen:
 *   1. open() — formdata behalls fran forra gangen (matchar tidigare beteende)
 *   2. close() — formdata behalls
 *   3. reset() — nollstall alla falt (anvands efter lyckad submit)
 */

import { useState } from 'react'

export function useAddColumnModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [showArchivedTab, setShowArchivedTab] = useState(false)
  const [showWorkflowInput, setShowWorkflowInput] = useState(false)
  const [urlExtracted, setUrlExtracted] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [newColumnDescription, setNewColumnDescription] = useState('')
  const [newColumnFlowId, setNewColumnFlowId] = useState('')

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  const reset = () => {
    setNewColumnTitle('')
    setNewColumnDescription('')
    setNewColumnFlowId('')
    setUrlExtracted(false)
    setShowWorkflowInput(false)
  }

  return {
    isOpen,
    showArchivedTab,
    showWorkflowInput,
    urlExtracted,
    newColumnTitle,
    newColumnDescription,
    newColumnFlowId,
    setShowArchivedTab,
    setShowWorkflowInput,
    setUrlExtracted,
    setNewColumnTitle,
    setNewColumnDescription,
    setNewColumnFlowId,
    open,
    close,
    reset,
  }
}
