// Multi-provider LLM support for Claude, ChatGPT, and Gemini

export type LLMProvider = 'claude' | 'chatgpt' | 'gemini';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
}

// Default models for each provider
export const DEFAULT_MODELS = {
  claude: 'claude-3-5-sonnet-20241022',
  chatgpt: 'gpt-4o',
  gemini: 'gemini-flash-latest'
};

// Convert messages to provider-specific format
function convertMessagesToProvider(messages: LLMMessage[], provider: LLMProvider, systemPrompt?: string): any {
  switch (provider) {
    case 'claude':
      return {
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'user' : m.role,
          content: m.content
        }))
      };
    
    case 'chatgpt':
      const chatGPTMessages = systemPrompt 
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages;
      return {
        messages: chatGPTMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      };
    
    case 'gemini':
      return {
        systemInstruction: systemPrompt ? {
          parts: [{ text: systemPrompt }]
        } : undefined,
        contents: messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }))
      };
  }
}

// Convert tools to provider-specific format
function convertToolsToProvider(tools: any, provider: LLMProvider): any {
  switch (provider) {
    case 'claude':
      return tools.functionDeclarations.map((func: any) => ({
        name: func.name,
        description: func.description,
        input_schema: func.parameters
      }));
    
    case 'chatgpt':
      return tools.functionDeclarations.map((func: any) => ({
        type: 'function',
        function: {
          name: func.name,
          description: func.description,
          parameters: func.parameters
        }
      }));
    
    case 'gemini':
      return [tools];
  }
}

// Call the appropriate LLM provider
export async function callLLM(
  config: LLMConfig,
  messages: LLMMessage[],
  systemPrompt?: string,
  tools?: any
): Promise<LLMResponse> {
  const { provider, apiKey, model } = config;
  const selectedModel = model || DEFAULT_MODELS[provider];

  switch (provider) {
    case 'claude':
      return await callClaude(apiKey, selectedModel, messages, systemPrompt, tools);
    
    case 'chatgpt':
      return await callChatGPT(apiKey, selectedModel, messages, systemPrompt, tools);
    
    case 'gemini':
      return await callGemini(apiKey, selectedModel, messages, systemPrompt, tools);
    
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// Claude (Anthropic) API
async function callClaude(
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  systemPrompt?: string,
  tools?: any
): Promise<LLMResponse> {
  const payload = convertMessagesToProvider(messages, 'claude', systemPrompt);
  
  const body: any = {
    model,
    max_tokens: 4096,
    ...payload
  };

  if (tools) {
    body.tools = convertToolsToProvider(tools, 'claude');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Claude API error: ${response.status}`);
  }

  const data = await response.json();
  
  let content = '';
  const toolCalls: Array<{ name: string; args: Record<string, any> }> = [];

  for (const block of data.content) {
    if (block.type === 'text') {
      content += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        name: block.name,
        args: block.input
      });
    }
  }

  return { content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}

// ChatGPT (OpenAI) API
async function callChatGPT(
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  systemPrompt?: string,
  tools?: any
): Promise<LLMResponse> {
  const payload = convertMessagesToProvider(messages, 'chatgpt', systemPrompt);
  
  const body: any = {
    model,
    ...payload
  };

  if (tools) {
    body.tools = convertToolsToProvider(tools, 'chatgpt');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `ChatGPT API error: ${response.status}`);
  }

  const data = await response.json();
  const message = data.choices[0]?.message;

  if (!message) {
    throw new Error('No response from ChatGPT');
  }

  const toolCalls = message.tool_calls?.map((tc: any) => ({
    name: tc.function.name,
    args: JSON.parse(tc.function.arguments)
  }));

  return {
    content: message.content || '',
    toolCalls
  };
}

// Gemini (Google) API
async function callGemini(
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  systemPrompt?: string,
  tools?: any
): Promise<LLMResponse> {
  const payload = convertMessagesToProvider(messages, 'gemini', systemPrompt);
  
  const body: any = {
    ...payload
  };

  if (tools) {
    body.tools = convertToolsToProvider(tools, 'gemini');
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0]?.content) {
    throw new Error('No response from Gemini');
  }

  const candidateContent = data.candidates[0].content;
  let content = '';
  const toolCalls: Array<{ name: string; args: Record<string, any> }> = [];

  for (const part of candidateContent.parts) {
    if (part.text) {
      content += part.text;
    } else if (part.functionCall) {
      toolCalls.push({
        name: part.functionCall.name,
        args: part.functionCall.args
      });
    }
  }

  return { content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}
