import { ToolRegistry } from '../tool-registry';
import { searchToolDefinition, searchToolHandler } from './search';
import { summaryToolDefinition, summaryToolHandler } from './summary';
import { detailToolDefinition, detailToolHandler } from './detail';
import { createToolDefinition, createToolHandler } from './create';
import { updateToolDefinition, updateToolHandler } from './update';
import { listToolDefinition, listToolHandler } from './list';

/**
 * Create and populate the tool registry with all available tools.
 */
export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register(searchToolDefinition, searchToolHandler);
  registry.register(summaryToolDefinition, summaryToolHandler);
  registry.register(detailToolDefinition, detailToolHandler);
  registry.register(createToolDefinition, createToolHandler);
  registry.register(updateToolDefinition, updateToolHandler);
  registry.register(listToolDefinition, listToolHandler);

  return registry;
}
