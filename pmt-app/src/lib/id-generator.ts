import { WorkItem } from '../types';

/**
 * Generate a new 4-digit work item ID
 * Format: ITEM-0001, ITEM-0002, etc.
 */
export function generateWorkItemId(existingItems: WorkItem[]): string {
  // Extract all numeric IDs
  const numericIds = existingItems
    .map(item => {
      const match = item.id.match(/ITEM-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => !isNaN(num));

  // Find the highest ID, default to 0 if no items
  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
  
  // Increment and format as 4-digit number
  const nextId = maxId + 1;
  const paddedId = nextId.toString().padStart(4, '0');
  
  return `ITEM-${paddedId}`;
}
