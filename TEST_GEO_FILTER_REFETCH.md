# Test Instructions: Geographic Filter Refetch Bug Fix

## Bug Description
When a user selects a geographic filter and then removes it, the dashboard should automatically reload all events without requiring a page refresh. Previously, the user had to manually refresh the page to see all events again.

## Test Environment
- URL: http://localhost:3002/dashboard/main-dashboard
- Browser: Chrome/Firefox with console access
- Dev server must be running: `npm run dev`

## Test Procedure

### Step 1: Initial Load
1. Navigate to `http://localhost:3002/dashboard/main-dashboard`
2. Wait for page to fully load
3. Open browser console (F12 → Console tab)
4. Verify you see news items in the columns

### Step 2: Apply Geographic Filter
1. Click the MapPin button (location icon) next to the search input in the header
2. A geographic filter panel should appear on the right side
3. Search for "Härnösand" in the filter search box
4. Click to expand "Västernorrlands län" (should auto-expand when searching)
5. Check the checkbox for "Härnösand" municipality

**Expected Console Output:**
```
🔄 Geographic filters changed, refetching data: {
  regionCodes: ["22"],
  municipalityCodes: ["2280"],
  showItemsWithoutLocation: false
}
📡 Fetching column data: /api/dashboards/main-dashboard?regionCode=22&municipalityCode=2280&showItemsWithoutLocation=false
```

**Expected UI Behavior:**
- News items should filter to only show events from Härnösand
- Columns should update to show filtered content
- Some columns may become empty if they have no Härnösand events

### Step 3: Remove Geographic Filter
1. Click the same "Härnösand" checkbox again to uncheck it
2. Alternatively, click "Rensa filter" button to clear all filters
3. Watch the browser console

**Expected Console Output (THIS IS THE BUG FIX):**
```
🔄 Geographic filters changed, refetching data: {
  regionCodes: [],
  municipalityCodes: [],
  showItemsWithoutLocation: false
}
📡 Fetching column data: /api/dashboards/main-dashboard
```

**Expected UI Behavior:**
- ALL news items should automatically reload (no page refresh needed)
- Columns should populate with events from all of Sweden again
- Previously empty columns should now show content

### Step 4: Verify Long-Polling Still Works
1. After removing filters, wait ~5 seconds
2. Check console for long-polling requests
3. Verify you see periodic polling requests like:
```
GET /api/columns/{columnId}/updates 200
```

**Expected Behavior:**
- Long-polling should continue working after filter removal
- New events should still appear in real-time

## Success Criteria

✅ **PASS** if:
1. Console shows "🔄 Geographic filters changed" when filter is REMOVED
2. Console shows "📡 Fetching column data: /api/dashboards/main-dashboard" (without query params)
3. All news items reload automatically without page refresh
4. Columns that were empty during filtering now show content

❌ **FAIL** if:
1. Console does NOT show filter change logs when removing filter
2. News items do not reload after filter removal
3. User must manually refresh page to see all events again

## Test Variations

### Variation A: Multiple Filters
1. Select multiple municipalities (e.g., Härnösand + Örnsköldsvik)
2. Remove one municipality → verify partial reload
3. Remove last municipality → verify full reload

### Variation B: Region-level Filter
1. Select entire region (e.g., all of Västernorrlands län)
2. Remove region filter → verify all events reload

### Variation C: "Rensa filter" Button
1. Apply any filter combination
2. Click "Rensa filter" button
3. Verify all events reload immediately

## Debugging

If test fails, check:
1. Is dev server running? (`npm run dev`)
2. Are there console errors?
3. Network tab: Are API requests being made?
4. What is the exact URL being fetched when filter is removed?

## Browser Console Commands

To manually inspect filter state:
```javascript
// Check if geo filters are active
localStorage.getItem('geoFilters_main-dashboard')

// Should return something like:
// {"regionCodes":[],"municipalityCodes":[],"showItemsWithoutLocation":false}
```

## Related Files
- `components/MainDashboard.tsx` - Filter object creation with useMemo
- `lib/dashboard/hooks/useDashboardData.ts` - Refetch logic with useEffect
- `lib/dashboard/hooks/useDashboardPolling.ts` - Long-polling filter updates
- `lib/dashboard/hooks/useGeoFilters.ts` - Filter state management
