import { useEffect, useRef } from 'react';
import type { NewsItem } from '@/lib/types';
import type { ColumnData } from '@/lib/dashboard/types';

interface UsePendingImagePollingProps {
  columnData: ColumnData;
  updateColumnData: (updater: (prev: ColumnData) => ColumnData) => void;
}

const POLL_INTERVAL = 5000; // Poll every 5 seconds
const MAX_POLL_DURATION = 60000; // Stop polling after 60 seconds (assume failed)

/**
 * Hook that polls for status updates on items with pending traffic camera images.
 *
 * When a traffic camera image is being uploaded, the item has status: 'pending'.
 * This hook periodically checks if the status has changed to 'ready' and updates
 * the UI accordingly without requiring a page refresh.
 */
export function usePendingImagePolling({
  columnData,
  updateColumnData,
}: UsePendingImagePollingProps) {
  const pollTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const itemAgesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // Find all items with pending traffic camera status across all columns
    const pendingItems: Array<{ columnId: string; item: NewsItem }> = [];

    Object.entries(columnData).forEach(([columnId, items]) => {
      items.forEach((item) => {
        if (item.trafficCamera?.status === 'pending' && item.dbId) {
          pendingItems.push({ columnId, item });
        }
      });
    });

    if (pendingItems.length === 0) {
      // No pending items, clear all timeouts
      pollTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      pollTimeoutsRef.current.clear();
      itemAgesRef.current.clear();
      return;
    }

    console.log(`📸 Polling ${pendingItems.length} items with pending images`);

    // Poll each pending item
    pendingItems.forEach(({ columnId, item }) => {
      if (!item.dbId) return;

      const itemKey = `${columnId}:${item.dbId}`;

      // Track how long we've been polling this item
      if (!itemAgesRef.current.has(itemKey)) {
        itemAgesRef.current.set(itemKey, Date.now());
      }

      const age = Date.now() - (itemAgesRef.current.get(itemKey) || Date.now());

      // Stop polling if item has been pending for too long (assume failed)
      if (age > MAX_POLL_DURATION) {
        console.warn(`⏱️ Stopped polling ${item.dbId} (timeout after ${MAX_POLL_DURATION}ms)`);
        itemAgesRef.current.delete(itemKey);
        return;
      }

      // Skip if already polling this item
      if (pollTimeoutsRef.current.has(itemKey)) {
        return;
      }

      // Start polling for this item
      const timeout = setTimeout(async () => {
        try {
          // Fetch fresh data for this specific item via column API
          const response = await fetch(`/api/columns/${columnId}?limit=500`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          const updatedItem = data.items?.find((i: NewsItem) => i.dbId === item.dbId);

          if (updatedItem && updatedItem.trafficCamera?.status !== 'pending') {
            console.log(`✅ Image ready for ${item.dbId}: ${updatedItem.trafficCamera?.status}`);

            // Update the item in columnData
            updateColumnData((prev) => ({
              ...prev,
              [columnId]: prev[columnId]?.map((i) =>
                i.dbId === item.dbId ? updatedItem : i
              ) || [],
            }));

            // Stop polling this item
            itemAgesRef.current.delete(itemKey);
            pollTimeoutsRef.current.delete(itemKey);
          } else {
            // Still pending, schedule next poll
            pollTimeoutsRef.current.delete(itemKey);
          }
        } catch (error) {
          console.error(`Failed to poll image status for ${item.dbId}:`, error);
          pollTimeoutsRef.current.delete(itemKey);
        }
      }, POLL_INTERVAL);

      pollTimeoutsRef.current.set(itemKey, timeout);
    });

    // Cleanup on unmount
    return () => {
      pollTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      pollTimeoutsRef.current.clear();
    };
  }, [columnData, updateColumnData]);
}
