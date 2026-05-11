import { ToolDefinition, ToolHandler, ToolResult } from '../../types/chat';
import { LLMProvider } from '../llm-providers';

/**
 * View current settings (API key, LLM provider, model, current user)
 */
export const viewSettingsToolDefinition: ToolDefinition = {
  name: 'view_settings',
  description: 'View current workspace settings including LLM provider, model, and active user.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const viewSettingsToolHandler: ToolHandler = async (args, context) => {
  const hasApiKey = !!(context.llmApiKeys && Object.values(context.llmApiKeys).some(key => key));
  
  return {
    summary: 'Current workspace settings',
    richContent: [
      {
        type: 'markdown',
        content: `**Workspace Settings:**
- LLM Provider: ${context.llmProvider || 'Not configured'}
- LLM Model: ${context.llmModel || 'Not configured'}
- API Key: ${hasApiKey ? '✓ Set' : '⚠️ Not set'}
- Current User: ${context.currentUser || 'No user selected'}`,
      },
    ],
    data: {
      llmProvider: context.llmProvider,
      llmModel: context.llmModel,
      hasApiKey,
      currentUser: context.currentUser,
    },
  };
};

/**
 * Update workspace settings (API key, LLM provider, model)
 */
export const updateSettingsToolDefinition: ToolDefinition = {
  name: 'update_settings',
  description: 'Update workspace settings like LLM provider, model, or API key.',
  parameters: {
    type: 'object',
    properties: {
      llmProvider: {
        type: 'string',
        enum: ['anthropic', 'openai', 'google'],
        description: 'LLM provider to use',
      },
      llmModel: {
        type: 'string',
        description: 'Model name for the provider (e.g., claude-opus, gpt-4)',
      },
      apiKey: {
        type: 'string',
        description: 'API key for the LLM provider',
      },
    },
    required: [],
  },
};

export const updateSettingsToolHandler: ToolHandler = async (args, context) => {
  const { llmProvider, llmModel, apiKey } = args;

  if (!context.setLLMProvider && !context.setLLMModel && !context.setApiKey) {
    return {
      summary: 'Settings update not available',
      richContent: [
        {
          type: 'error',
          message: 'Settings update handlers are not available in this context',
        },
      ],
    };
  }

  const changes: string[] = [];

  if (llmProvider && context.setLLMProvider) {
    context.setLLMProvider(llmProvider as LLMProvider);
    changes.push(`✓ LLM Provider set to ${llmProvider}`);
  }

  if (llmModel && context.setLLMModel) {
    context.setLLMModel(llmModel);
    changes.push(`✓ LLM Model set to ${llmModel}`);
  }

  if (apiKey && context.setApiKey) {
    context.setApiKey(llmProvider || context.llmProvider || 'anthropic', apiKey);
    changes.push(`✓ API Key updated for ${llmProvider || context.llmProvider}`);
  }

  if (changes.length === 0) {
    return {
      summary: 'No settings were updated',
      richContent: [
        {
          type: 'markdown',
          content: '⚠️ No settings provided to update',
        },
      ],
    };
  }

  return {
    summary: `Updated ${changes.length} setting(s)`,
    richContent: [
      {
        type: 'markdown',
        content: `**Settings Updated:**\n${changes.join('\n')}`,
      },
    ],
  };
};

/**
 * List available users
 */
export const listUsersToolDefinition: ToolDefinition = {
  name: 'list_users',
  description: 'List all available users in the workspace.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const listUsersToolHandler: ToolHandler = async (args, context) => {
  const users = context.availableUsers || [];
  const currentUser = context.currentUser;

  if (users.length === 0) {
    return {
      summary: 'No users found',
      richContent: [
        {
          type: 'markdown',
          content: '⚠️ No users available. Configure git user.name or add users in settings.',
        },
      ],
    };
  }

  const userList = users
    .map(u => `${u === currentUser ? '✓' : '·'} ${u}`)
    .join('\n');

  return {
    summary: `Found ${users.length} user(s)`,
    richContent: [
      {
        type: 'markdown',
        content: `**Available Users:**\n${userList}`,
      },
    ],
    data: { users, currentUser },
  };
};

/**
 * Set the current active user
 */
export const setCurrentUserToolDefinition: ToolDefinition = {
  name: 'set_current_user',
  description: 'Switch the active user for the workspace.',
  parameters: {
    type: 'object',
    properties: {
      user: {
        type: 'string',
        description: 'The user name to switch to',
      },
    },
    required: ['user'],
  },
};

export const setCurrentUserToolHandler: ToolHandler = async (args, context) => {
  const { user } = args;

  if (!user || typeof user !== 'string') {
    return {
      summary: 'Invalid user',
      richContent: [
        {
          type: 'error',
          message: 'User name must be a non-empty string',
        },
      ],
    };
  }

  if (!context.setCurrentUser) {
    return {
      summary: 'Cannot switch user',
      richContent: [
        {
          type: 'error',
          message: 'User switching is not available in this context',
        },
      ],
    };
  }

  // Validate user is in available list
  const availableUsers = context.availableUsers || [];
  if (availableUsers.length > 0 && !availableUsers.includes(user)) {
    return {
      summary: `User "${user}" not found`,
      richContent: [
        {
          type: 'markdown',
          content: `❌ User "${user}" not found. Available users: ${availableUsers.join(', ')}`,
        },
      ],
    };
  }

  await context.setCurrentUser(user);

  return {
    summary: `Switched to user: ${user}`,
    richContent: [
      {
        type: 'markdown',
        content: `✓ Active user changed to **${user}**`,
      },
    ],
  };
};
