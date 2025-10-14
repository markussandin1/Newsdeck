# Dashboard Module

This module contains extracted hooks and utilities from `components/MainDashboard.tsx` to improve code organization and maintainability.

## Overview

The MainDashboard component has been refactored from ~2,400 lines to ~1,950 lines by extracting reusable custom hooks and utilities. This modular approach makes the code:
- **More testable**: Each hook can be tested in isolation
- **More maintainable**: Clear separation of concerns
- **More reusable**: Hooks can be reused in other components
- **More readable**: Reduced complexity in the main component

## Module Structure

```
lib/dashboard/
├── README.md                           # This file
├── types.ts                            # TypeScript type definitions
├── utils.ts                            # Utility functions
└── hooks/
    ├── useDashboardData.ts             # Data fetching and state
    ├── useDashboardPolling.ts          # Long-polling for real-time updates
    ├── useColumnNotifications.ts       # Audio notifications
    └── useDashboardLayout.ts           # Layout and mobile state
```

## Type Definitions (`types.ts`)

### Core Types
- **`ColumnData`**: Maps column IDs to arrays of news items
  ```typescript
  type ColumnData = Record<string, NewsItem[]>
  ```

- **`ConnectionStatus`**: Long-polling connection state
  ```typescript
  type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'
  ```

### Hook Interfaces
- **`DashboardDataState`**: State shape for useDashboardData
- **`DashboardPollingState`**: State shape for useDashboardPolling
- **`DashboardLayoutState`**: State shape for useDashboardLayout
- **`ColumnNotificationsState`**: State shape for useColumnNotifications

## Utilities (`utils.ts`)

### Type Guards
- **`isRecord(value: unknown): value is Record<string, unknown>`**
  - Type guard for checking if value is a plain object

### Data Utilities
- **`deepEqual(a: unknown, b: unknown): boolean`**
  - Deep equality comparison for complex objects
  - Used for preventing unnecessary re-renders

- **`extractWorkflowId(columnId: string, columns: DashboardColumn[]): string | undefined`**
  - Extracts workflow ID from column configuration
  - Returns the flowId associated with a column

## Custom Hooks

### 1. `useDashboardData`

**Purpose**: Manages all data fetching and state for dashboard columns.

**Props**:
```typescript
interface UseDashboardDataProps {
  dashboardSlug: string
}
```

**Returns**:
```typescript
interface UseDashboardDataReturn {
  // State
  dashboard: Dashboard | null
  columnData: ColumnData
  archivedColumns: DashboardColumn[]
  allDashboards: Dashboard[]
  lastUpdate: Date | null
  isLoading: boolean

  // Actions
  fetchColumnData: () => Promise<void>
  loadArchivedColumns: () => Promise<void>
  loadAllDashboards: () => Promise<void>
  updateColumnData: (updater: (prev: ColumnData) => ColumnData) => void
}
```

**Responsibilities**:
- Fetches dashboard configuration on mount
- Loads column data for all columns
- Manages archived columns
- Loads list of all dashboards
- Provides deduplication logic for news items
- Exposes `updateColumnData` for real-time updates

**Usage**:
```typescript
const {
  dashboard,
  columnData,
  fetchColumnData,
  updateColumnData
} = useDashboardData({ dashboardSlug: 'main-dashboard' })
```

**Key Features**:
- Auto-loads data on mount using `useEffect`
- Deduplicates news items by `dbId` (database UUID)
- Exposes `updateColumnData` for polling hook integration
- Handles loading states and errors

### 2. `useDashboardPolling`

**Purpose**: Manages long-polling connections for real-time updates.

**Props**:
```typescript
interface UseDashboardPollingProps {
  columns: DashboardColumn[]
  updateColumnData: (updater: (prev: ColumnData) => ColumnData) => void
  onNewItems?: (columnId: string) => void
}
```

**Returns**:
```typescript
interface UseDashboardPollingReturn {
  connectionStatus: ConnectionStatus
  startPolling: (columnId: string) => void
  stopPolling: (columnId: string) => void
  stopAllPolling: () => void
}
```

**Responsibilities**:
- Establishes long-polling connections to `/api/columns/[id]/updates`
- Manages abort controllers for each column
- Handles reconnection logic with exponential backoff
- Tracks last-seen timestamps per column
- Calls `onNewItems` callback when new items arrive
- Auto-starts polling for all non-archived columns

**Usage**:
```typescript
const { connectionStatus } = useDashboardPolling({
  columns: dashboard?.columns || [],
  updateColumnData,
  onNewItems: (columnId) => playNotification(columnId)
})
```

**Key Features**:
- One polling loop per column
- Automatic cleanup on unmount
- Deduplicates items by `dbId` before adding to state
- Graceful handling of network errors
- Respects archived column state (no polling for archived columns)

### 3. `useColumnNotifications`

**Purpose**: Manages audio notifications for new items.

**Props**:
```typescript
interface UseColumnNotificationsProps {
  dashboardId: string
}
```

**Returns**:
```typescript
interface UseColumnNotificationsReturn {
  mutedColumns: Set<string>
  showAudioPrompt: boolean
  toggleMute: (columnId: string) => void
  playNotification: (columnId: string) => void
  enableAudio: () => Promise<void>
  disableAudio: () => void
  dismissAudioPrompt: () => void
}
```

**Responsibilities**:
- Initializes audio element on mount
- Handles browser autoplay policy
- Persists audio preference to localStorage (`audioEnabled`)
- Persists per-column mute state to localStorage (`mutedColumns_{dashboardId}`)
- Plays notification sound when new items arrive (unless muted)
- Shows audio prompt if autoplay is blocked

**Usage**:
```typescript
const {
  mutedColumns,
  toggleMute,
  playNotification,
  showAudioPrompt,
  enableAudio,
  disableAudio
} = useColumnNotifications({ dashboardId: dashboard.id })
```

**Key Features**:
- Tests autoplay on mount to detect browser restrictions
- Per-column mute settings (persisted across sessions)
- Global audio enable/disable (persisted across sessions)
- Error handling for blocked audio playback
- Audio prompt modal integration

**localStorage Keys**:
- `audioEnabled`: `"true" | "false" | null`
- `mutedColumns_{dashboardId}`: JSON array of muted column IDs

### 4. `useDashboardLayout`

**Purpose**: Manages layout state and mobile interactions.

**Props**:
```typescript
interface UseDashboardLayoutProps {
  columns: DashboardColumn[]
  onRefresh: () => Promise<void>
}
```

**Returns**:
```typescript
interface UseDashboardLayoutReturn {
  // Mobile state
  isMobile: boolean
  activeColumnIndex: number
  showMobileMenu: boolean
  showDashboardDropdown: boolean

  // Pull-to-refresh state
  pullDistance: number
  isRefreshing: boolean
  scrollContainerRef: React.RefObject<HTMLDivElement>

  // Dropdown ref
  dropdownRef: React.RefObject<HTMLDivElement>

  // Computed values
  activeColumns: DashboardColumn[]

  // Actions
  setShowMobileMenu: (show: boolean) => void
  setShowDashboardDropdown: (show: boolean) => void
  nextColumn: () => void
  prevColumn: () => void
  goToColumn: (index: number) => void
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchMove: (e: React.TouchEvent) => void
  handleTouchEnd: () => Promise<void>
}
```

**Responsibilities**:
- Detects mobile viewport (`window.innerWidth < 768px`)
- Manages mobile column navigation state
- Handles pull-to-refresh touch events
- Manages dropdown visibility and click-outside detection
- Computes active (non-archived) columns

**Usage**:
```typescript
const {
  isMobile,
  activeColumnIndex,
  nextColumn,
  prevColumn,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  scrollContainerRef
} = useDashboardLayout({
  columns: dashboard?.columns || [],
  onRefresh: fetchColumnData
})
```

**Key Features**:
- Responsive viewport detection with resize listener
- Touch event handlers for pull-to-refresh (60px threshold)
- Pull distance with resistance (0.5) and max pull (120px)
- Mobile navigation (next/prev/goto column)
- Click-outside handling for dropdowns
- Active columns memoization (excludes archived)

## Component Hierarchy

```
MainDashboard (components/MainDashboard.tsx)
│
├── useDashboardData
│   ├── Fetches dashboard config
│   ├── Loads column data
│   └── Manages data state
│
├── useDashboardPolling
│   ├── Uses updateColumnData from useDashboardData
│   ├── Calls onNewItems callback
│   └── Manages long-polling connections
│
├── useColumnNotifications
│   ├── Receives columnId from polling callback
│   ├── Plays notification if not muted
│   └── Manages audio state
│
└── useDashboardLayout
    ├── Detects mobile viewport
    ├── Manages touch events
    └── Handles mobile navigation
```

## Data Flow

### Initial Load
1. `useDashboardData` fetches dashboard config and column data
2. Component renders with initial data

### Real-time Updates
1. `useDashboardPolling` starts long-polling for each column
2. Server sends new items via long-polling response
3. Polling hook calls `updateColumnData` to add items to state
4. Polling hook calls `onNewItems(columnId)` callback
5. `useColumnNotifications` receives callback and plays sound (if not muted)
6. Component re-renders with new items

### Mobile Interactions
1. User touches screen → `useDashboardLayout` captures touch events
2. User pulls down → `handleTouchMove` updates pull distance
3. User releases → `handleTouchEnd` triggers refresh if threshold met
4. `onRefresh` callback calls `fetchColumnData` from `useDashboardData`
5. Component re-renders with refreshed data

## Testing

Each hook can be tested independently:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useDashboardData } from '@/lib/dashboard/hooks/useDashboardData'

describe('useDashboardData', () => {
  it('should fetch dashboard on mount', async () => {
    const { result } = renderHook(() =>
      useDashboardData({ dashboardSlug: 'test' })
    )

    await waitFor(() => {
      expect(result.current.dashboard).not.toBeNull()
    })
  })
})
```

## Migration Notes

### Before (Monolithic Component)
```typescript
// All in MainDashboard.tsx (~2,400 lines)
const [columnData, setColumnData] = useState<ColumnData>({})
const [isMobile, setIsMobile] = useState(false)
const [mutedColumns, setMutedColumns] = useState<Set<string>>(new Set())
// ... hundreds of lines of logic
```

### After (Modular Hooks)
```typescript
// MainDashboard.tsx (~1,950 lines)
const { dashboard, columnData, updateColumnData } = useDashboardData({ dashboardSlug })
const { connectionStatus } = useDashboardPolling({ columns, updateColumnData, onNewItems })
const { playNotification, toggleMute } = useColumnNotifications({ dashboardId })
const { isMobile, handleTouchStart } = useDashboardLayout({ columns, onRefresh })
```

**Benefits**:
- ~450 lines removed from MainDashboard.tsx
- Clear separation of concerns
- Each hook is independently testable
- Reusable across other components
- Easier to understand and maintain

## Future Improvements

1. **Component Extraction** (optional):
   - Extract `StableColumn` to `components/dashboard/ColumnCard.tsx`
   - Extract `ColumnContent` to `components/dashboard/ColumnContent.tsx`
   - Extract modals to `components/dashboard/DashboardModals.tsx`

2. **Testing**:
   - Add unit tests for each hook
   - Add integration tests for hook interactions
   - Add tests for utilities (`deepEqual`, `extractWorkflowId`)

3. **Performance**:
   - Add memoization for expensive computations
   - Consider virtualizing long column lists
   - Optimize re-render frequency

4. **Documentation**:
   - Add JSDoc comments to all hooks
   - Add usage examples to hook files
   - Document edge cases and gotchas

## Refactoring History

- **Fas 0.5** (commit: 99b9ff4): Created `types.ts` with all type definitions
- **Fas 1** (commit: 93fa16d): Extracted utilities to `utils.ts` (~40 lines)
- **Fas 2a** (commit: 56db068): Created `useDashboardData` hook (~100 lines)
- **Fas 2b** (commit: 11db119): Created `useDashboardPolling` hook (~140 lines)
- **Fas 3** (commit: 9083e2f): Created `useColumnNotifications` hook (~80 lines)
- **Fas 4** (commit: 1d55bd2): Created `useDashboardLayout` hook (~150 lines)
- **Fas 5**: Skipped (components already well-structured)
- **Fas 6**: Final verification and documentation

**Total reduction**: ~450 lines removed from MainDashboard.tsx
