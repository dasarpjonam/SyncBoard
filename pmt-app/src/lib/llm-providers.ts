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

// ─── Streaming API ──────────────────────────────────────────────

export interface StreamLLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Stream text from an LLM provider, yielding chunks as they arrive.
 * Used by autofill for progressive ghost text rendering.
 * Does NOT support tool calls — text-only streaming.
 */
export async function* streamLLM(
  config: StreamLLMConfig,
  messages: LLMMessage[],
  systemPrompt?: string
): AsyncGenerator<string> {
  const { provider, apiKey, model, maxTokens = 500 } = config;
  const selectedModel = model || DEFAULT_MODELS[provider];

  switch (provider) {
    case 'claude':
      yield* streamClaude(apiKey, selectedModel, messages, systemPrompt, maxTokens);
      break;
    case 'chatgpt':
      yield* streamChatGPT(apiKey, selectedModel, messages, systemPrompt, maxTokens);
      break;
    case 'gemini':
      yield* streamGemini(apiKey, selectedModel, messages, systemPrompt, maxTokens);
      break;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// Parse SSE lines from a ReadableStream
async function* parseSSEStream(response: Response): AsyncGenerator<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on double newlines (SSE event boundary) or single newlines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          yield trimmed.slice(6);
        }
      }
    }

    // Flush remaining buffer
    if (buffer.trim().startsWith('data: ')) {
      yield buffer.trim().slice(6);
    }
  } finally {
    reader.releaseLock();
  }
}

// Claude streaming
async function* streamClaude(
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  systemPrompt?: string,
  maxTokens = 500
): AsyncGenerator<string> {
  const payload = convertMessagesToProvider(messages, 'claude', systemPrompt);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      ...payload,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Claude API error: ${response.status}`);
  }

  for await (const data of parseSSEStream(response)) {
    if (data === '[DONE]') break;
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        yield parsed.delta.text;
      }
    } catch {
      // Skip non-JSON lines (event types, etc.)
    }
  }
}

// ChatGPT streaming
async function* streamChatGPT(
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  systemPrompt?: string,
  maxTokens = 500
): AsyncGenerator<string> {
  const payload = convertMessagesToProvider(messages, 'chatgpt', systemPrompt);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      ...payload,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `ChatGPT API error: ${response.status}`);
  }

  for await (const data of parseSSEStream(response)) {
    if (data === '[DONE]') break;
    try {
      const parsed = JSON.parse(data);
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) {
        yield content;
      }
    } catch {
      // Skip non-JSON lines
    }
  }
}

// Gemini streaming
async function* streamGemini(
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  systemPrompt?: string,
  maxTokens = 500
): AsyncGenerator<string> {
  const payload = convertMessagesToProvider(messages, 'gemini', systemPrompt);

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
  }

  for await (const data of parseSSEStream(response)) {
    if (data === '[DONE]') break;
    try {
      const parsed = JSON.parse(data);
      const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        yield text;
      }
    } catch {
      // Skip non-JSON lines
    }
  }
}
