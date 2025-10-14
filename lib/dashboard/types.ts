/**
 * Dashboard-specific types and interfaces for MainDashboard refactoring
 *
 * This file defines the type contracts for the upcoming hooks and components
 * that will be extracted from MainDashboard.tsx
 */

import { Dashboard, NewsItem, DashboardColumn } from '@/lib/types'

// ============================================================================
// Core Data Types
// ============================================================================

/**
 * Column data mapping: columnId -> array of news items
 */
export interface ColumnData {
  [columnId: string]: NewsItem[]
}

/**
 * Connection status for real-time updates
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

/**
 * Drag preview state for column reordering
 */
export interface DragPreview {
  x: number
  y: number
  visible: boolean
}

// ============================================================================
// Hook Interfaces - useDashboardData
// ============================================================================

/**
 * State and actions for dashboard data management
 * Extracted from: column data, archived columns, dashboard list, loading state
 */
export interface DashboardDataState {
  // Data state
  columnData: ColumnData
  archivedColumns: DashboardColumn[]
  allDashboards: Array<Dashboard & { columnCount?: number }>
  lastUpdate: Date
  isLoading: boolean

  // Actions
  fetchColumnData: (columnId: string) => Promise<void>
  loadArchivedColumns: (dashboardId: string) => Promise<void>
  loadAllDashboards: () => Promise<void>
  refreshAllColumns: () => Promise<void>
  clearColumnData: (columnId: string) => Promise<void>
}

// ============================================================================
// Hook Interfaces - useDashboardPolling
// ============================================================================

/**
 * State and actions for real-time polling
 * Extracted from: long-polling, connection status, event handling
 */
export interface DashboardPollingState {
  // State
  connectionStatus: ConnectionStatus

  // Actions
  startPolling: (columnId: string) => void
  stopPolling: (columnId: string) => void
  stopAllPolling: () => void
}

// ============================================================================
// Hook Interfaces - useColumnNotifications
// ============================================================================

/**
 * State and actions for audio notifications
 * Extracted from: audio element, muted columns, audio prompt
 */
export interface ColumnNotificationsState {
  // State
  mutedColumns: Set<string>
  showAudioPrompt: boolean

  // Actions
  toggleColumnMute: (columnId: string) => void
  playNotification: (columnId: string) => void
  enableAudio: () => void
  disableAudio: () => void
}

// ============================================================================
// Hook Interfaces - useDashboardLayout
// ============================================================================

/**
 * State and actions for layout and drag & drop
 * Extracted from: column reordering, drag state, mobile layout
 */
export interface DashboardLayoutState {
  // Desktop drag & drop
  draggedColumn: string | null
  dragOverColumn: string | null
  dragPreview: DragPreview

  // Mobile state
  isMobile: boolean
  activeColumnIndex: number
  showMobileMenu: boolean

  // Pull-to-refresh
  pullDistance: number
  isRefreshing: boolean

  // Actions
  handleDragStart: (columnId: string, event: React.DragEvent) => void
  handleDragOver: (columnId: string, event: React.DragEvent) => void
  handleDragEnd: () => void
  handleDrop: (targetColumnId: string) => Promise<void>
  navigateToColumn: (index: number) => void
  handlePullToRefresh: () => Promise<void>
}

// ============================================================================
// Modal State Types
// ============================================================================

/**
 * State for the "Add Column" modal
 */
export interface AddColumnModalState {
  show: boolean
  title: string
  description: string
  flowId: string
  showWorkflowInput: boolean
  urlExtracted: boolean
  showWorkflowHelp: boolean
  showExtractionSuccess: boolean
}

/**
 * State for column editing
 */
export interface EditColumnState {
  editingColumnId: string | null
  title: string
  description: string
  flowId: string
}

/**
 * State for dashboard creation modal
 */
export interface CreateDashboardModalState {
  show: boolean
  name: string
  description: string
}

/**
 * State for archived columns modal
 */
export interface ArchivedColumnsModalState {
  show: boolean
  columns: DashboardColumn[]
}

/**
 * State for dashboard dropdown
 */
export interface DashboardDropdownState {
  show: boolean
  dashboards: Array<Dashboard & { columnCount?: number }>
}

/**
 * Combined modal state
 */
export interface DashboardModalsState {
  addColumn: AddColumnModalState
  editColumn: EditColumnState
  createDashboard: CreateDashboardModalState
  archivedColumns: ArchivedColumnsModalState
  dashboardDropdown: DashboardDropdownState
  selectedNewsItem: NewsItem | null
  toastMessage: string | null
  copiedId: string | null
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for the main dashboard component
 */
export interface MainDashboardProps {
  dashboard: Dashboard
  onDashboardUpdate: (dashboard: Dashboard) => void
}

/**
 * Props for DashboardHeader component (future extraction)
 */
export interface DashboardHeaderProps {
  dashboard: Dashboard
  allDashboards: Array<Dashboard & { columnCount?: number }>
  showDashboardDropdown: boolean
  onToggleDropdown: () => void
  onCreateDashboard: () => void
  onNavigateToDashboard: (slug: string) => void
}

/**
 * Props for ColumnBoard component (future extraction)
 */
export interface ColumnBoardProps {
  dashboard: Dashboard
  columnData: ColumnData
  isMobile: boolean
  activeColumnIndex: number
  draggedColumn: string | null
  dragOverColumn: string | null
  onColumnClick: (item: NewsItem) => void
  onEditColumn: (column: DashboardColumn) => void
  onArchiveColumn: (columnId: string) => void
  onClearColumn: (columnId: string) => void
  onToggleMute: (columnId: string) => void
  mutedColumns: Set<string>
  onDragStart: (columnId: string, event: React.DragEvent) => void
  onDragOver: (columnId: string, event: React.DragEvent) => void
  onDragEnd: () => void
  onDrop: (columnId: string) => void
}

// ============================================================================
// Utility Function Types
// ============================================================================

/**
 * Type guard for checking if a value is a Record
 */
export type IsRecordFn = (value: unknown) => value is Record<string, unknown>

/**
 * Deep equality comparison function
 */
export type DeepEqualFn = (obj1: unknown, obj2: unknown) => boolean

/**
 * Extract workflow ID from URL or return as-is
 */
export type ExtractWorkflowIdFn = (input: string) => string

/**
 * Format location string from NewsItem
 */
export type FormatLocationFn = (item: NewsItem) => string

/**
 * Format relative time (e.g., "2 minuter sedan")
 */
export type FormatRelativeTimeFn = (timestamp: string) => string
