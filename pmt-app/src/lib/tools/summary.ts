import { ToolDefinition, ToolHandler } from '../../types/chat';
import { buildWorkspaceSummary } from '../context-builder';

export const summaryToolDefinition: ToolDefinition = {
  name: 'get_project_summary',
  description:
    'Get a comprehensive project status summary including total items, status distribution, type distribution, team workload, and recent activity.',
  slashCommand: 'summary',
  parameters: {
    type: 'object',
    properties: {},
  },
};

export const summaryToolHandler: ToolHandler = async (_args, context) => {
  const data = buildWorkspaceSummary(context.items);

  // Build formatted text for LLM
  const statusLines = Object.entries(data.byStatus)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');
  const typeLines = Object.entries(data.byType)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');
  const assigneeLines = Object.entries(data.byAssignee)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  const summary = [
    `Project Summary:`,
    `Total Items: ${data.totalItems} (${data.topLevelItems} top-level)`,
    ``,
    `Status Distribution:`,
    statusLines || '  (none)',
    ``,
    `Type Distribution:`,
    typeLines || '  (none)',
    ``,
    `Assignee Workload:`,
    assigneeLines || '  (no assignments)',
    ``,
    `Team: ${data.activeAssignees.join(', ') || 'No team members'}`,
    `Recent Updates (24h): ${data.updatesLast24h}`,
    `Last Updated: ${data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString() : 'Never'}`,
  ].join('\n');

  return {
    summary,
    richContent: [{ type: 'summary', data }],
  };
};
