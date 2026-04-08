import yaml from 'js-yaml';
import { WorkItem, Comment } from '../types';

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
      parentId: frontmatter.parentId || undefined,
      comments: frontmatter.comments || [],
    };
  } catch (error) {
    console.error(`Error parsing YAML for ${fileName}:`, error);
    return null;
  }
}

export function serializeMarkdownItem(item: WorkItem): string {
  const { content, fileName, level, children, ...frontmatter } = item;
  const yamlString = yaml.dump(frontmatter);

  return `---\n${yamlString}---\n${content}`;
}

/**
 * Serialize work item to human-readable text for full-page editing
 * Format: YAML frontmatter + markdown content + comments section
 */
export function serializeWorkItemToText(item: Partial<WorkItem>): string {
  const yamlData: any = {
    id: item.id || '',
    title: item.title || '',
    type: item.type || 'Task',
    status: item.status || 'To Do',
  };

  if (item.assignee) yamlData.assignee = item.assignee;
  if (item.parentId) yamlData.parentId = item.parentId;
  if (item.createdAt) yamlData.createdAt = item.createdAt;
  if (item.updatedAt) yamlData.updatedAt = item.updatedAt;

  const yamlString = yaml.dump(yamlData, { lineWidth: -1 });
  
  let text = `---\n${yamlString}---\n\n`;
  text += `${item.content || ''}\n\n`;
  
  if (item.comments && item.comments.length > 0) {
    text += `---\n# Comments\n\n`;
    item.comments.forEach(comment => {
      text += `**${comment.author}** (${new Date(comment.createdAt).toLocaleString()}):\n`;
      text += `${comment.content}\n\n`;
    });
  }
  
  return text;
}

/**
 * Parse text back to work item structure
 */
export function parseTextToWorkItem(text: string, fileName?: string): Partial<WorkItem> | null {
  try {
    // Split into frontmatter and rest
    const frontmatterMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      return null;
    }

    const frontmatter = yaml.load(frontmatterMatch[1]) as Record<string, any>;
    const restContent = frontmatterMatch[2];

    // Split content and comments
    const commentsMatch = restContent.match(/^([\s\S]*?)\r?\n---\r?\n# Comments\r?\n\r?\n([\s\S]*)$/);
    
    let content = '';
    const comments: Comment[] = [];

    if (commentsMatch) {
      content = commentsMatch[1].trim();
      const commentsText = commentsMatch[2];
      
      // Parse comments - format: **Author** (date): content
      const commentRegex = /\*\*([^*]+)\*\*\s*\(([^)]+)\):\r?\n([^\n]*(?:\n(?!\*\*)[^\n]*)*)/g;
      let match;
      while ((match = commentRegex.exec(commentsText)) !== null) {
        comments.push({
          id: `comment-${Date.now()}-${comments.length}`,
          author: match[1].trim(),
          createdAt: new Date(match[2]).toISOString(),
          content: match[3].trim(),
          mentions: [],
        });
      }
    } else {
      content = restContent.trim();
    }

    const workItem: Partial<WorkItem> = {
      id: frontmatter.id,
      title: frontmatter.title,
      type: frontmatter.type,
      status: frontmatter.status,
      assignee: frontmatter.assignee,
      content: content,
      createdAt: frontmatter.createdAt,
      updatedAt: frontmatter.updatedAt,
      parentId: frontmatter.parentId,
      comments: comments,
    };

    if (fileName) {
      workItem.fileName = fileName;
    }

    return workItem;
  } catch (error) {
    console.error('Error parsing text to work item:', error);
    return null;
  }
}
