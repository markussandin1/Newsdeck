# Frontend Test Plan - Geographic Filtering

## Test Environment Setup

**Prerequisites:**
- Application running locally on `http://localhost:3000` or production URL
- Database populated with news items that have geographic codes
- Browser: Chrome/Firefox with DevTools access

## Test Scenarios

### Test 1: Verify Geographic Filter Panel Access

**Steps:**
1. Navigate to main dashboard (`/dashboard/main`)
2. Locate the MapPin icon button in the header (next to search input)
3. Click the MapPin button

**Expected Result:**
- Geographic filter panel opens below the search bar
- Panel shows title "Geografiska filter"
- Search box visible with placeholder "Sök län eller kommun..."
- Toggle "Visa utan plats" visible (default: OFF)
- List of Swedish regions (län) visible

**Pass/Fail Criteria:**
- ✅ PASS: All UI elements render correctly
- ❌ FAIL: Panel doesn't open, elements missing, or console errors

---

### Test 2: Search for Stockholm Region

**Steps:**
1. Open geographic filter panel (Test 1)
2. Type "Stockholm" in the search box
3. Observe filtered results

**Expected Result:**
- Only "Stockholm" region appears in list
- Region has chevron icon indicating it's expandable
- No other regions visible

**Pass/Fail Criteria:**
- ✅ PASS: Only Stockholm region shown
- ❌ FAIL: Multiple regions shown or no results

---

### Test 3: Expand Stockholm Region to Show Municipalities

**Steps:**
1. Search for "Stockholm" (Test 2)
2. Click the chevron icon next to "Stockholm" region
3. Observe the expanded municipality list

**Expected Result:**
- Region expands to show municipalities
- Stockholm kommun (municipality) visible in the list
- Other municipalities like Salem, Huddinge, etc. visible
- Each municipality has a checkbox

**Pass/Fail Criteria:**
- ✅ PASS: Municipalities list expands correctly
- ❌ FAIL: List doesn't expand or is empty

---

### Test 4: Select Stockholm Municipality (NO region selected)

**Steps:**
1. Expand Stockholm region (Test 3)
2. Clear search box if needed
3. Ensure Stockholm REGION checkbox is NOT checked
4. Click ONLY the "Stockholm" municipality checkbox
5. Observe the dashboard columns

**Expected Result:**
- Stockholm municipality checkbox becomes checked
- MapPin button shows badge with "1" (one filter selected)
- Dashboard columns update to show ONLY items from Stockholm municipality
- Items should have location data containing "Stockholm" as municipality
- NO items from other municipalities (Salem, Eskilstuna, Helsingborg, etc.)

**Verification:**
- Check first 10 visible items in any column
- Click on items to open details modal
- Verify location field shows Stockholm-related data

**Pass/Fail Criteria:**
- ✅ PASS: Only Stockholm municipality items visible
- ❌ FAIL: Items from other municipalities visible, or no items at all

**Debug Actions if FAIL:**
1. Open Browser DevTools → Console
2. Check for JavaScript errors
3. Open DevTools → Network → Filter by "dashboard" or "main"
4. Inspect API response to see if items have `municipalityCode` set
5. Check if `municipalityCode: "0180"` exists in response data

---

### Test 5: Select Stockholm Region (includes all municipalities)

**Steps:**
1. Open geographic filter panel
2. Search for "Stockholm"
3. Click the Stockholm REGION checkbox (not municipality)
4. Observe the dashboard

**Expected Result:**
- Stockholm region checkbox becomes checked
- MapPin button shows badge with "1"
- Dashboard shows items from ENTIRE Stockholm region
- This includes: Stockholm stad, Salem, Huddinge, Sollentuna, etc.
- Items should have `regionCode: "AB"` (Stockholms län)

**Pass/Fail Criteria:**
- ✅ PASS: Items from all Stockholm municipalities visible
- ❌ FAIL: No items, or items from outside Stockholm län

---

### Test 6: Combine Search Query with Geographic Filter

**Steps:**
1. Select Stockholm municipality filter (Test 4)
2. Type "brand" in the search input field
3. Observe results

**Expected Result:**
- Dashboard shows items that:
  - Are from Stockholm municipality AND
  - Contain the word "brand" in title/description
- Fewer items than with just municipality filter
- Info text shows: "Visar händelser som matchar brand och filtrerade efter plats"

**Pass/Fail Criteria:**
- ✅ PASS: Results filtered by both conditions (AND operation)
- ❌ FAIL: Only one filter applied, or OR operation instead of AND

---

### Test 7: Clear Geographic Filters

**Steps:**
1. Apply Stockholm municipality filter (Test 4)
2. Click "Rensa alla" button in geographic filter panel header
3. Observe dashboard

**Expected Result:**
- All checkboxes become unchecked
- MapPin button badge disappears
- Dashboard shows ALL items (no filtering)
- Filter panel remains open

**Pass/Fail Criteria:**
- ✅ PASS: Filters cleared, all items visible
- ❌ FAIL: Filters remain active

---

### Test 8: "No Results" Banner and Clear Button

**Steps:**
1. Apply a filter that returns no results (e.g., select a municipality with no recent items)
2. Observe yellow banner appears
3. Click "Rensa alla filter" button in banner

**Expected Result:**
- Yellow banner shows: "Inga händelser matchar valda geografiska filter."
- Clicking "Rensa alla filter" clears BOTH search and geo filters
- Banner disappears
- All items become visible again

**Pass/Fail Criteria:**
- ✅ PASS: Banner appears, button clears all filters
- ❌ FAIL: Button doesn't clear filters, or banner shows wrong message

---

### Test 9: "Visa utan plats" Toggle

**Steps:**
1. Select Stockholm municipality
2. Toggle "Visa utan plats" to ON
3. Observe results

**Expected Result:**
- Items from Stockholm municipality visible
- PLUS items that have NO geographic codes (NULL)
- More items than with toggle OFF

**Pass/Fail Criteria:**
- ✅ PASS: Items without location also shown
- ❌ FAIL: Toggle has no effect

---

### Test 10: Filter Persistence (localStorage)

**Steps:**
1. Select Stockholm municipality filter
2. Refresh the page (F5)
3. Observe filter state

**Expected Result:**
- Geographic filter panel reopens (if it was open)
- Stockholm municipality remains checked
- Dashboard shows filtered results
- Filters persist across page reloads

**Pass/Fail Criteria:**
- ✅ PASS: Filters persist after reload
- ❌ FAIL: Filters reset to default

---

## Data Verification Tests

### Test 11: Verify Items Have Geographic Codes

**Manual API Check:**
1. Open DevTools → Network
2. Refresh dashboard
3. Find request to `/api/dashboards/main` or `/api/dashboards/[slug]`
4. Inspect response JSON

**Expected Data Structure:**
```json
{
  "columnId": {
    "items": [
      {
        "dbId": "...",
        "title": "...",
        "countryCode": "SE",
        "regionCode": "AB",
        "municipalityCode": "0180",
        "location": {
          "municipality": "Stockholm",
          "county": "Stockholms län"
        }
      }
    ]
  }
}
```

**Pass/Fail Criteria:**
- ✅ PASS: Items have `countryCode`, `regionCode`, or `municipalityCode` populated
- ❌ FAIL: All items have NULL geographic codes

---

## Automated Test Script (Playwright/Cypress)

### Example Playwright Test

```typescript
import { test, expect } from '@playwright/test'

test.describe('Geographic Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/main')
  })

  test('should filter by Stockholm municipality', async ({ page }) => {
    // Open geo filter panel
    await page.click('[title="Geografiska filter"]')

    // Search for Stockholm
    await page.fill('input[placeholder="Sök län eller kommun..."]', 'Stockholm')

    // Expand Stockholm region
    await page.click('button[aria-label="Visa kommuner"]')

    // Select Stockholm municipality (NOT region)
    await page.click('text=Stockholm kommun') // Adjust selector

    // Wait for dashboard to update
    await page.waitForTimeout(500)

    // Verify badge shows "1"
    const badge = await page.locator('[title="Geografiska filter"] >> span')
    await expect(badge).toHaveText('1')

    // Verify items are filtered
    const items = await page.locator('[data-testid="news-item"]').all()
    expect(items.length).toBeGreaterThan(0)

    // Click first item and verify location
    await items[0].click()
    const locationText = await page.locator('[data-testid="news-item-location"]').textContent()
    expect(locationText).toContain('Stockholm')
  })

  test('should show no results banner when no items match', async ({ page }) => {
    // Apply filter that returns no results
    await page.click('[title="Geografiska filter"]')
    await page.fill('input[placeholder="Sök län eller kommun..."]', 'Kiruna')
    await page.click('text=Kiruna')

    // Verify banner appears
    const banner = await page.locator('.bg-amber-50')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('Inga händelser matchar')

    // Click clear button
    await banner.locator('button >> text=Rensa alla filter').click()

    // Verify filters cleared
    const badge = await page.locator('[title="Geografiska filter"] >> span')
    await expect(badge).not.toBeVisible()
  })
})
```

---

## Common Issues and Debugging

### Issue: No items shown when filtering by Stockholm

**Debug Steps:**
1. Check browser console for errors
2. Verify API response has `municipalityCode: "0180"` for Stockholm items
3. Run: `npx tsx scripts/test-location-normalization.mjs`
4. Check if location cache is loaded: `curl http://localhost:3000/api/admin/location-cache/status`
5. Verify database has items with geographic codes: `node scripts/check-geo-codes.mjs`

### Issue: Filters don't clear

**Debug Steps:**
1. Check console for React state update errors
2. Verify `clearFilters()` is called in `useGeoFilters.ts`
3. Check localStorage: `localStorage.getItem('geoFilters_main')`

### Issue: Wrong items shown (e.g., Helsingborg when Stockholm selected)

**Debug Steps:**
1. Inspect item data in DevTools → Components → MainDashboard → filteredColumnData
2. Verify `applyFilters` logic in `useGeoFilters.ts`
3. Check if `showItemsWithoutLocation` is ON (should be OFF by default)

---

## Success Criteria

**All tests must pass for geographic filtering to be considered working:**

- ✅ Filter panel opens and shows regions
- ✅ Search filters regions correctly
- ✅ Selecting municipality shows ONLY items from that municipality
- ✅ Selecting region shows items from all municipalities in that region
- ✅ Combined search + geo filter works (AND operation)
- ✅ Clear buttons work correctly
- ✅ "Visa utan plats" toggle works
- ✅ Filters persist across page reloads
- ✅ No console errors during filtering
- ✅ Items have correct geographic codes in database
