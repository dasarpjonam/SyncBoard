import { describe, it, expect } from 'vitest';
import { getAncestors } from './hierarchy';
import { WorkItem } from '../types';

describe('hierarchy / getAncestors', () => {
  const createItem = (id: string, parentId?: string): WorkItem => ({
    id,
    type: 'task',
    title: `Item ${id}`,
    content: '',
    status: 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileName: `${id}.md`,
    parentId,
  });

  it('should return an empty array if the item has no parent', () => {
    const itemA = createItem('A');
    const allItems = [itemA];

    const ancestors = getAncestors(itemA, allItems);
    expect(ancestors).toEqual([]);
  });

  it('should return an array with one ancestor for a single parent', () => {
    const itemA = createItem('A');
    const itemB = createItem('B', 'A');
    const allItems = [itemA, itemB];

    const ancestors = getAncestors(itemB, allItems);
    expect(ancestors).toEqual([itemA]);
  });

  it('should return all ancestors in order (oldest to youngest parent) for multiple levels', () => {
    const itemA = createItem('A');
    const itemB = createItem('B', 'A');
    const itemC = createItem('C', 'B');
    const itemD = createItem('D', 'C');
    const allItems = [itemA, itemB, itemC, itemD];

    // ancestors of D should be A, B, C
    const ancestors = getAncestors(itemD, allItems);
    expect(ancestors).toEqual([itemA, itemB, itemC]);
  });

  it('should handle missing parent gracefully', () => {
    const itemC = createItem('C', 'B'); // parent B doesn't exist
    const allItems = [itemC];

    const ancestors = getAncestors(itemC, allItems);
    expect(ancestors).toEqual([]);
  });

  it('should handle partial ancestor chain if one ancestor is missing', () => {
    // A -> B -> C -> D, but B is missing
    const itemA = createItem('A');
    const itemC = createItem('C', 'B');
    const itemD = createItem('D', 'C');
    const allItems = [itemA, itemC, itemD]; // item B missing

    // ancestors of D should be just C, since B can't be found, traversal stops
    const ancestors = getAncestors(itemD, allItems);
    expect(ancestors).toEqual([itemC]);
  });

  it('should prevent infinite loops for circular references', () => {
    const itemA = createItem('A', 'B');
    const itemB = createItem('B', 'A');
    const allItems = [itemA, itemB];

    // ancestors of A should be B
    // B's parent is A, which we've already visited
    const ancestors = getAncestors(itemA, allItems);
    expect(ancestors).toEqual([itemB]);
  });

  it('should prevent infinite loops for self-referencing item', () => {
    const itemA = createItem('A', 'A');
    const allItems = [itemA];

    const ancestors = getAncestors(itemA, allItems);
    expect(ancestors).toEqual([itemA]); // It finds parent A, then next iter detects visited 'A'
  });
});
