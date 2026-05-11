import { ToolRegistry } from '../tool-registry';
import { searchToolDefinition, searchToolHandler } from './search';
import { summaryToolDefinition, summaryToolHandler } from './summary';
import { detailToolDefinition, detailToolHandler } from './detail';
import { createToolDefinition, createToolHandler } from './create';
import { updateToolDefinition, updateToolHandler } from './update';
import { listToolDefinition, listToolHandler } from './list';
import { autofillToolDefinition, autofillToolHandler } from './autofill';
import { createPersonalNoteToolDefinition, createPersonalNoteToolHandler, updatePersonalNoteToolDefinition, updatePersonalNoteToolHandler } from './notes';
import { 
  listTodosToolDefinition, 
  listTodosToolHandler, 
  createTodoToolDefinition, 
  createTodoToolHandler, 
  updateTodoToolDefinition, 
  updateTodoToolHandler, 
  deleteTodoToolDefinition, 
  deleteTodoToolHandler 
} from './todos-tool';
import {
  viewSettingsToolDefinition,
  viewSettingsToolHandler,
  updateSettingsToolDefinition,
  updateSettingsToolHandler,
  listUsersToolDefinition,
  listUsersToolHandler,
  setCurrentUserToolDefinition,
  setCurrentUserToolHandler,
} from './settings-tool';

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
  registry.register(autofillToolDefinition, autofillToolHandler);
  registry.register(createPersonalNoteToolDefinition, createPersonalNoteToolHandler);
  registry.register(updatePersonalNoteToolDefinition, updatePersonalNoteToolHandler);
  
  // Personal Todos
  registry.register(listTodosToolDefinition, listTodosToolHandler);
  registry.register(createTodoToolDefinition, createTodoToolHandler);
  registry.register(updateTodoToolDefinition, updateTodoToolHandler);
  registry.register(deleteTodoToolDefinition, deleteTodoToolHandler);

  // Settings
  registry.register(viewSettingsToolDefinition, viewSettingsToolHandler);
  registry.register(updateSettingsToolDefinition, updateSettingsToolHandler);
  registry.register(listUsersToolDefinition, listUsersToolHandler);
  registry.register(setCurrentUserToolDefinition, setCurrentUserToolHandler);

  return registry;
}
