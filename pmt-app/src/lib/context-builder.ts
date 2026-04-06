import { WorkItem, WorkspaceConfig } from '../types';

export interface WorkspaceSummary {
  totalItems: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byAssignee: Record<string, number>;
  topLevelItems: number;
  activeAssignees: string[];
  lastUpdated: string | null;
  updatesLast24h: number;
}

export interface CompactItem {
  id: string;
  title: string;
  type: string;
  status: string;
  assignee?: string;
  parentId?: string;
  childCount: number;
  preview: string;
}

export interface TreeNode {
  id: string;
  title: string;
  status: string;
  owner?: string;
  children: number;
  progress?: string; 
}

/**
 * Build workspace summary for LLM context (renderer-compatible)
 */
export function buildWorkspaceSummary(items: WorkItem[]): WorkspaceSummary {
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byAssignee: Record<string, number> = {};
  const assignees = new Set<string>();
  
  items.forEach(item => {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    byType[item.type] = (byType[item.type] || 0) + 1;
    
    if (item.assignee) {
      byAssignee[item.assignee] = (byAssignee[item.assignee] || 0) + 1;
      assignees.add(item.assignee);
    }
  });
  
  const topLevel = items.filter(i => !i.parentId).length;
  const lastUpdated = items.length > 0 
    ? items.reduce((latest, item) => 
        item.updatedAt > latest ? item.updatedAt : latest, items[0].updatedAt)
    : null;
  
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const updatesLast24h = items.filter(i => i.updatedAt > last24h).length;
  
  return {
    totalItems: items.length,
    byStatus,
    byType,
    byAssignee,
    topLevelItems: topLevel,
    activeAssignees: Array.from(assignees),
    lastUpdated,
    updatesLast24h
  };
}

/**
 * Build compact metadata index
 */
export function buildCompactMetadata(items: WorkItem[]): Record<string, CompactItem> {
  const metadata: Record<string, CompactItem> = {};
  
  items.forEach(item => {
    const childCount = items.filter(i => i.parentId === item.id).length;
    const preview = item.content.substring(0, 50).replace(/\n/g, ' ').trim();
    
    metadata[item.id] = {
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      assignee: item.assignee,
      parentId: item.parentId,
      childCount,
      preview
    };
  });
  
  return metadata;
}

/**
 * Build tree structure for LLM context
 */
export function buildTreeStructure(items: WorkItem[]): TreeNode[] {
  const topLevel = items.filter(item => !item.parentId);
  
  const countDescendants = (itemId: string): number => {
    const children = items.filter(i => i.parentId === itemId);
    return children.length + children.reduce((sum, child) => 
      sum + countDescendants(child.id), 0);
  };
  
  const countCompleted = (itemId: string): number => {
    const children = items.filter(i => i.parentId === itemId);
    return children.filter(c => c.status === 'Done').length + 
           children.reduce((sum, child) => sum + countCompleted(child.id), 0);
  };
  
  return topLevel.map(item => {
    const descendants = countDescendants(item.id);
    const completed = countCompleted(item.id);
    
    return {
      id: item.id,
      title: item.title,
      status: item.status,
      owner: item.assignee,
      children: descendants,
      progress: descendants > 0 ? `${completed}/${descendants}` : undefined
    };
  });
}

/**
 * Build context optimized for LLM (token-efficient)
 */
export function buildLLMContext(
  items: WorkItem[],
  config: WorkspaceConfig,
  query?: string,
  maxTokens: number = 4000
): string {
  const summary = buildWorkspaceSummary(items);
  const tree = buildTreeStructure(items);
  
  // Build summary section (always included, ~200 tokens)
  let context = `WORKSPACE OVERVIEW:
Total Items: ${summary.totalItems} (${summary.topLevelItems} top-level)

STATUS DISTRIBUTION:
${Object.entries(summary.byStatus).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

TYPE DISTRIBUTION:
${Object.entries(summary.byType).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

TEAM: ${summary.activeAssignees.join(', ') || 'No assignments'}
Recent Activity: ${summary.updatesLast24h} updates in last 24h
Last Updated: ${summary.lastUpdated ? new Date(summary.lastUpdated).toLocaleDateString() : 'Never'}
`;

  let tokenCount = estimateTokens(context);
  
  // Add tree structure if budget allows (~300-500 tokens)
  if (tokenCount + 500 < maxTokens && tree.length > 0) {
    const treeContext = `\nTOP-LEVEL ITEMS:\n${tree.slice(0, 10).map(node => 
      `• [${node.id}] ${node.title} - ${node.status}${node.owner ? ` (@${node.owner})` : ''}${node.progress ? ` [${node.progress} complete]` : ''}`
    ).join('\n')}`;
    
    context += treeContext;
    tokenCount += estimateTokens(treeContext);
  }
  
  // If query mentions specific items, add them
  if (query) {
    const metadata = buildCompactMetadata(items);
    
    // Look for full IDs (e.g., ITEM-0001, ITEM-1234) or partial IDs (e.g., "ending 2894" or just "2894")
    const fullIdMatches = query.match(/ITEM-\d+/g) || [];
    const partialIdMatches = query.match(/ending\s+(\d+)|id\s+(\d+)|\b(\d{4})\b/gi) || [];
    
    const relevantItems: CompactItem[] = [];
    
    // Add items matched by full ID
    fullIdMatches.forEach(id => {
      if (metadata[id]) relevantItems.push(metadata[id]);
    });
    
    // Add items matched by partial ID (ending digits or 4-digit numbers)
    if (partialIdMatches.length > 0) {
      partialIdMatches.forEach(match => {
        const digits = match.replace(/\D/g, '');
        Object.values(metadata).forEach(item => {
          if ((item.id.endsWith(digits) || item.id.includes(digits)) && !relevantItems.find(i => i.id === item.id)) {
            relevantItems.push(item);
          }
        });
      });
    }
    
    if (relevantItems.length > 0 && tokenCount + 500 < maxTokens) {
      const itemsContext = `\nREFERENCED ITEMS:\n${relevantItems.map(item =>
        `[${item.id}] ${item.title}\n  Type: ${item.type} | Status: ${item.status}${item.assignee ? ` | Assigned: @${item.assignee}` : ''}\n  Preview: ${item.preview}`
      ).join('\n\n')}`;
      
      context += itemsContext;
    }
  }
  
  return context;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Search items by text (simple client-side search)
 */
export function searchItems(items: WorkItem[], query: string): WorkItem[] {
  const lowerQuery = query.toLowerCase();
  
  return items.filter(item =>
    item.title.toLowerCase().includes(lowerQuery) ||
    item.content.toLowerCase().includes(lowerQuery) ||
    item.id.toLowerCase().includes(lowerQuery) ||
    (item.assignee?.toLowerCase().includes(lowerQuery))
  );
}
