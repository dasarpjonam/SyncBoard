import { describe, it, expect } from 'vitest';
import { parseMarkdownItem, serializeMarkdownItem } from './markdown';
import { WorkItem } from '../types';

describe('Markdown Parsing and Serialization', () => {
  it('should correctly parse markdown with frontmatter', () => {
    const fileContent = `---
id: TASK-123
title: Build Login
type: Feature
status: To Do
assignee: Alice
createdAt: '2023-10-01T12:00:00.000Z'
updatedAt: '2023-10-01T12:00:00.000Z'
---
This is the description.
`;

    const result = parseMarkdownItem('TASK-123.md', fileContent);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('TASK-123');
    expect(result?.title).toBe('Build Login');
    expect(result?.status).toBe('To Do');
    expect(result?.content).toBe('This is the description.');
  });

  it('should serialize a work item back into markdown with frontmatter', () => {
    const item: WorkItem = {
      id: 'BUG-456',
      title: 'Fix crashing',
      type: 'Bug',
      status: 'In Progress',
      createdAt: '2023-10-01T12:00:00.000Z',
      updatedAt: '2023-10-01T12:00:00.000Z',
      content: 'App crashes on load',
      fileName: 'BUG-456.md',
    };

    const serialized = serializeMarkdownItem(item);

    expect(serialized).toContain('id: BUG-456');
    expect(serialized).toContain('type: Bug');
    expect(serialized).toContain('---');
    expect(serialized).toContain('App crashes on load');
  });
});
