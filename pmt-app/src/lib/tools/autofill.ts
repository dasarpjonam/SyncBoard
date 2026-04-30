import { ToolDefinition, ToolHandler, ToolResult } from '../../types/chat';

/**
 * Custom event interface for editor ↔ chat bridge.
 * Dispatched by the chat tool, listened to by RichEditor.
 */
export interface RewriteEventDetail {
  action: 'rewrite';
}

export const autofillToolDefinition: ToolDefinition = {
  name: 'rewrite_editor',
  description:
    'Trigger AI to rewrite the description of the currently open work item. Only works when a work item is open in the editor.',
  slashCommand: 'rewrite',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['rewrite'],
        description: 'The action to perform. Always use "rewrite".',
      },
    },
    required: ['action'],
  },
};

export const autofillToolHandler: ToolHandler = async (args, _context) => {
  const action = args.action || 'rewrite';

  if (action !== 'rewrite') {
    return {
      summary: `Invalid action "${action}". Only "rewrite" is supported.`,
      richContent: [
        {
          type: 'error' as const,
          message: `Invalid action "${action}". Only "rewrite" is supported.`,
        },
      ],
    };
  }

  // Dispatch a custom event that RichEditor listens for
  const event = new CustomEvent<RewriteEventDetail>('syncboard:rewrite', {
    detail: { action: 'rewrite' },
  });
  window.dispatchEvent(event);

  return {
    summary: 'Rewriting the description...',
    richContent: [
      {
        type: 'markdown' as const,
        content: `✨ **Rewriting the description...**\n\nThe AI is rewriting the content directly in the editor. Switch to the editor tab to see the result.`,
      },
    ],
  };
};
