import { WorkItem } from '../types';

/**
 * Build a tree structure from a flat array of work items
 */
export function buildTree(items: WorkItem[]): WorkItem[] {
  const itemMap = new Map<string, WorkItem>();
  const rootItems: WorkItem[] = [];

  // Create a map and initialize children arrays
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [], level: 0 });
  });

  // Build parent-child relationships and calculate levels
  items.forEach(item => {
    const itemWithChildren = itemMap.get(item.id)!;
    
    if (item.parentId && itemMap.has(item.parentId)) {
      const parent = itemMap.get(item.parentId)!;
      parent.children!.push(itemWithChildren);
      itemWithChildren.level = (parent.level || 0) + 1;
    } else {
      // No parent or parent doesn't exist - treat as root
      rootItems.push(itemWithChildren);
    }
  });

  return rootItems;
}

/**
 * Flatten a tree structure back to a flat array
 */
export function flattenTree(tree: WorkItem[]): WorkItem[] {
  const result: WorkItem[] = [];

  function traverse(items: WorkItem[]) {
    items.forEach(item => {
      const { children, ...itemWithoutChildren } = item;
      result.push(itemWithoutChildren as WorkItem);
      if (children && children.length > 0) {
        traverse(children);
      }
    });
  }

  traverse(tree);
  return result;
}

/**
 * Get all items in a tree as a flat array (including computed fields)
 */
export function getAllItems(tree: WorkItem[]): WorkItem[] {
  const result: WorkItem[] = [];

  function traverse(items: WorkItem[]) {
    items.forEach(item => {
      result.push(item);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    });
  }

  traverse(tree);
  return result;
}

/**
 * Check if an item can have children
 * Any item can have children regardless of type
 */
export function canHaveChildren(item: WorkItem): boolean {
  return true;
}

/**
 * Get the allowed child types for a parent item
 * No type restrictions - any type can be a child of any type
 */
export function getAllowedChildTypes(parent: WorkItem): string[] {
  return [];
}

/**
 * Validate if a child can be added to a parent
 * Checks only for self-reference and circular dependencies (no type restrictions)
 */
export function validateParent(child: WorkItem, parent: WorkItem): { valid: boolean; reason?: string } {
  // Can't parent to self
  if (child.id === parent.id) {
    return { valid: false, reason: 'Cannot make an item its own parent' };
  }

  // Check for circular reference (child having parent as descendant)
  function isDescendant(item: WorkItem, ancestorId: string): boolean {
    if (!item.children) return false;
    return item.children.some(c => 
      c.id === ancestorId || isDescendant(c, ancestorId)
    );
  }

  if (isDescendant(child, parent.id)) {
    return { valid: false, reason: 'Cannot create circular reference' };
  }

  return { valid: true };
}

/**
 * Get the level (depth) of an item in the tree
 */
export function getItemLevel(item: WorkItem, allItems: WorkItem[]): number {
  if (!item.parentId) return 0;
  
  const parent = allItems.find(i => i.id === item.parentId);
  if (!parent) return 0;
  
  return 1 + getItemLevel(parent, allItems);
}

/**
 * Get all ancestors of an item
 */
export function getAncestors(item: WorkItem, allItems: WorkItem[]): WorkItem[] {
  const ancestors: WorkItem[] = [];
  let current = item;
  
  while (current.parentId) {
    const parent = allItems.find(i => i.id === current.parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent;
  }
  
  return ancestors;
}

/**
 * Get all descendants of an item (children, grandchildren, etc.)
 */
export function getDescendants(item: WorkItem): WorkItem[] {
  const descendants: WorkItem[] = [];
  
  function traverse(currentItem: WorkItem) {
    if (currentItem.children) {
      currentItem.children.forEach(child => {
        descendants.push(child);
        traverse(child);
      });
    }
  }
  
  traverse(item);
  return descendants;
}

/**
 * Filter tree items and include their ancestors
 * Useful for showing filtered results with context
 */
export function filterWithAncestors(
  tree: WorkItem[],
  predicate: (item: WorkItem) => boolean
): WorkItem[] {
  const matchingIds = new Set<string>();
  const allItems = getAllItems(tree);
  
  // Find all matching items
  allItems.forEach(item => {
    if (predicate(item)) {
      matchingIds.add(item.id);
      // Add all ancestors
      const ancestors = getAncestors(item, allItems);
      ancestors.forEach(ancestor => matchingIds.add(ancestor.id));
    }
  });

  // Filter tree keeping only matching items and their structure
  function filterTree(items: WorkItem[]): WorkItem[] {
    return items
      .filter(item => matchingIds.has(item.id))
      .map(item => ({
        ...item,
        children: item.children ? filterTree(item.children) : []
      }));
  }

  return filterTree(tree);
}
