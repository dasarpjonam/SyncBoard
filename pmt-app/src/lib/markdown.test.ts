import { describe, it, expect, vi } from 'vitest';
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

  it('should return null for malformed YAML frontmatter', () => {
    const fileContent = `---
id: TASK-123: : :
title: Build Login
---
This is the description.
`;
    // Suppress console.error for this test as we expect a parsing error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = parseMarkdownItem('TASK-123.md', fileContent);
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should return null for missing frontmatter delimiters', () => {
    const fileContent = `
id: TASK-123
title: Build Login
This is the description.
`;
    const result = parseMarkdownItem('TASK-123.md', fileContent);
    expect(result).toBeNull();
  });

  it('should return a WorkItem with default values when optional fields are missing', () => {
    const fileContent = `---
title: Minimal Task
---
Description only.
`;
    const result = parseMarkdownItem('MINIMAL.md', fileContent);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('MINIMAL');
    expect(result?.title).toBe('Minimal Task');
    expect(result?.type).toBe('Task');
    expect(result?.status).toBe('To Do');
    expect(result?.content).toBe('Description only.');
  });
});
