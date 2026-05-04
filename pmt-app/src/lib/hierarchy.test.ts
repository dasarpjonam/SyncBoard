import { describe, it, expect } from 'vitest';
import { flattenTree } from './hierarchy';
import { WorkItem } from '../types';

describe('flattenTree', () => {
  const createMockItem = (id: string, children?: WorkItem[]): WorkItem => ({
    id,
    title: `Item ${id}`,
    type: 'task',
    status: 'todo',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    content: '',
    fileName: `${id}-item-${id}.md`,
    ...(children ? { children } : {}),
  });

  it('should return empty array for empty input', () => {
    const input: WorkItem[] = [];
    const result = flattenTree(input);
    expect(result).toEqual([]);
  });

  it('should flatten a single level array without children', () => {
    const input: WorkItem[] = [
      createMockItem('1'),
      createMockItem('2'),
    ];
    const result = flattenTree(input);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
    expect(result[0]).not.toHaveProperty('children');
    expect(result[1]).not.toHaveProperty('children');
  });

  it('should flatten deeply nested trees', () => {
    const input: WorkItem[] = [
      createMockItem('1', [
        createMockItem('1.1', [
          createMockItem('1.1.1'),
        ]),
        createMockItem('1.2'),
      ]),
      createMockItem('2', [
        createMockItem('2.1'),
      ]),
    ];
    const result = flattenTree(input);

    // Expected order (pre-order traversal): 1, 1.1, 1.1.1, 1.2, 2, 2.1
    expect(result).toHaveLength(6);
    expect(result.map(i => i.id)).toEqual(['1', '1.1', '1.1.1', '1.2', '2', '2.1']);

    // None of the items should have children property
    result.forEach(item => {
      expect(item).not.toHaveProperty('children');
    });
  });

  it('should handle explicitly empty children arrays', () => {
    const input: WorkItem[] = [
      createMockItem('1', []),
      createMockItem('2', []),
    ];
    const result = flattenTree(input);
    expect(result).toHaveLength(2);
    expect(result.map(i => i.id)).toEqual(['1', '2']);
    result.forEach(item => {
      expect(item).not.toHaveProperty('children');
    });
  });

  it('should handle wide and deep mixed hierarchy', () => {
    const input: WorkItem[] = [
      createMockItem('1'), // No children
      createMockItem('2', [ // One child
        createMockItem('2.1')
      ]),
      createMockItem('3', [ // Nested children
        createMockItem('3.1', [
          createMockItem('3.1.1')
        ])
      ]),
      createMockItem('4', []) // Empty children array
    ];

    const result = flattenTree(input);
    expect(result).toHaveLength(7);
    expect(result.map(i => i.id)).toEqual(['1', '2', '2.1', '3', '3.1', '3.1.1', '4']);
    result.forEach(item => {
      expect(item).not.toHaveProperty('children');
    });
  });
});
