# Dashboard Module

This module contains hooks, utilities, and the client-side column store for the dashboard.

## Module Structure

```
lib/dashboard/
├── README.md                           # This file
├── types.ts                            # TypeScript type definitions
├── utils.ts                            # Utility functions
├── column-store.ts                     # Client-side state store for column items
├── new-item-diff.ts                    # Diff utility for detecting new items
└── hooks/
    ├── useDashboardData.ts             # Initial data fetching and dashboard config
    ├── useDashboardStream.ts           # SSE connection + column-store dispatch
    ├── useNewItemNotifier.ts           # Notification trigger (diffs seen dbIds)
    ├── useColumnNotifications.ts       # Coordinates audio and desktop notifications
    ├── useNotificationSettings.ts      # Notification settings (global + per-column)
    ├── useDesktopNotifications.ts      # Web Notifications API wrapper
    ├── useDashboardLayout.ts           # Layout and mobile scroll state
    ├── useDashboardNavigation.ts       # Dashboard switching
    ├── useColumnDragDrop.ts            # Column drag-and-drop reordering
    ├── useColumnEditing.ts             # Column create/edit/delete
    ├── useColumnOperations.ts          # Column actions (archive etc.)
    ├── useColumnSearch.ts              # Per-column search
    ├── useAddColumnModal.ts            # Add-column modal state
    ├── useCurrentUser.ts               # Current user preferences
    ├── useViewMode.ts                  # View mode (columns/pulse/grid)
    ├── useClipboard.ts                 # Clipboard helpers
    └── usePendingImagePolling.ts       # Polls for pending image generation
```

## Core State: `column-store.ts`

`column-store` is the **single source of truth** for live column items on the client. It is a lightweight Zustand-style store (or equivalent) that:

- Holds `Record<columnId, NewsItem[]>` (initial data + all live updates)
- `applyLive(columnId, items)` — merges incoming items by `dbId`; if an item has a `source_id` that already exists in the column the old entry is replaced (mirrors server-side `deleteReplacedSourceItems`)
- `patchItem(dbId, patch)` — applies partial updates to a single item
- `dbId` is the identity key — duplicates are silently dropped

## Custom Hooks

### `useDashboardData`

Fetches the initial dashboard config and column data on mount. Returns `dashboard`, `columnData` (used to seed the column-store), and helpers like `fetchColumnData`.

### `useDashboardStream`

Connects to `/api/stream` (SSE) and dispatches incoming `news_items` events to the column-store via `applyLive`. Manages the EventSource lifecycle (open / reconnect / close on unmount).

### `useNewItemNotifier`

After each column-store update, diffs the set of known `dbId`s to detect genuinely new items. Triggers `useColumnNotifications` for audio/desktop notifications. Intentionally runs as an effect (never inside a setState updater).

### `useColumnNotifications`

Coordinates audio and desktop notifications. Reads settings from `useNotificationSettings` and calls into `useDesktopNotifications`.

### `useDashboardLayout`

Manages layout state and mobile scroll. Exposes `mobileScrollRef` and `onMobileScroll` which compute `activeColumnIndex` from `scrollLeft` (CSS `scroll-snap` navigation, not Framer Motion).

## Data Flow

### Initial Load
1. `useDashboardData` fetches dashboard config and initial column items
2. Column-store is seeded with the fetched data
3. Component renders

### Real-time Updates (SSE + pg LISTEN/NOTIFY)
1. `useDashboardStream` opens `GET /api/stream` (SSE)
2. Server pushes `{ type: 'news_items', items: [...] }` events
3. `useDashboardStream` calls `applyLive(columnId, items)` on the column-store
4. `useNewItemNotifier` diffs seen dbIds → triggers notifications for genuinely new items
5. Component re-renders with merged items

### Mobile Scroll Navigation
CSS `scroll-snap` drives column navigation. `useDashboardLayout` reads `scrollLeft` to track the active column index. Pull-to-refresh calls `fetchColumnData`.

## Refactoring History

- **Realtime v1** (long-polling / `/api/columns/[id]/updates`): removed 2026-06
- **Realtime v2** (SSE + pg LISTEN/NOTIFY): `useDashboardStream`, `column-store`, `useNewItemNotifier`, `new-item-diff` added 2026-06
