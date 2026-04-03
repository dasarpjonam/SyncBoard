import yaml from 'js-yaml';
import { WorkItem } from '../types';

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

export function parseMarkdownItem(fileName: string, fileContent: string): WorkItem | null {
  const match = fileContent.match(FRONTMATTER_REGEX);
  if (!match) return null;

  try {
    const frontmatter = yaml.load(match[1]) as Record<string, any>;
    const content = match[2];

    return {
      id: frontmatter.id || fileName.replace('.md', ''),
      title: frontmatter.title || 'Untitled',
      type: frontmatter.type || 'Task',
      status: frontmatter.status || 'To Do',
      assignee: frontmatter.assignee,
      createdAt: frontmatter.createdAt || new Date().toISOString(),
      updatedAt: frontmatter.updatedAt || new Date().toISOString(),
      content: content.trim(),
      fileName,
    };
  } catch (error) {
    console.error(`Error parsing YAML for ${fileName}:`, error);
    return null;
  }
}

export function serializeMarkdownItem(item: WorkItem): string {
  const { content, fileName, ...frontmatter } = item;
  const yamlString = yaml.dump(frontmatter);

  return `---\n${yamlString}---\n${content}`;
}
