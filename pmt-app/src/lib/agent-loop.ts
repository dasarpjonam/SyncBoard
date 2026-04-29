import { AgentStep, ToolContext } from '../types/chat';
import { ToolRegistry } from './tool-registry';
import { callLLM, LLMConfig, LLMMessage } from './llm-providers';

/**
 * Run the agentic loop: send a prompt to the LLM, execute any tool calls,
 * feed results back, and repeat until the LLM produces a final text response.
 *
 * Yields AgentStep objects so the UI can show progress in real-time.
 *
 * @param llmConfig - Provider config (provider, apiKey, model)
 * @param messages - Conversation history
 * @param systemPrompt - System instruction for the LLM
 * @param registry - Tool registry for executing tool calls
 * @param toolContext - Workspace state passed to tool handlers
 * @param maxSteps - Max tool-calling iterations to prevent infinite loops (default 5)
 */
export async function* runAgentLoop(
  llmConfig: LLMConfig,
  messages: LLMMessage[],
  systemPrompt: string,
  registry: ToolRegistry,
  toolContext: ToolContext,
  maxSteps: number = 5
): AsyncGenerator<AgentStep> {
  // Work with a copy so we don't mutate the caller's array
  const conversationMessages = [...messages];
  let stepCount = 0;

  while (stepCount < maxSteps) {
    stepCount++;

    yield {
      type: 'progress',
      message: stepCount === 1 ? 'Thinking...' : 'Continuing...',
    };

    let response;
    try {
      response = await callLLM(
        llmConfig,
        conversationMessages,
        systemPrompt,
        registry.getDefinitions()
      );
    } catch (err: any) {
      yield {
        type: 'error',
        message: err.message || 'Failed to communicate with LLM API',
      };
      return;
    }

    // If no tool calls, yield the final text and stop
    if (!response.toolCalls || response.toolCalls.length === 0) {
      if (response.content) {
        yield { type: 'text', content: response.content };
      }
      return;
    }

    // If there's text alongside tool calls, yield it first
    if (response.content) {
      yield { type: 'text', content: response.content };
    }

    // Execute each tool call
    for (const toolCall of response.toolCalls) {
      yield {
        type: 'tool_call',
        toolName: toolCall.name,
        args: toolCall.args,
      };

      try {
        const result = await registry.execute(
          toolCall.name,
          toolCall.args,
          toolContext
        );

        yield {
          type: 'tool_result',
          toolName: toolCall.name,
          summary: result.summary,
          richContent: result.richContent,
        };

        // Append the tool interaction to conversation so the LLM
        // can see what it called and what came back
        conversationMessages.push({
          role: 'assistant',
          content: `I called the ${toolCall.name} tool with arguments: ${JSON.stringify(toolCall.args)}`,
        });
        conversationMessages.push({
          role: 'user',
          content: `Tool "${toolCall.name}" returned:\n${result.summary}`,
        });
      } catch (err: any) {
        const errorMsg = `Tool "${toolCall.name}" failed: ${err.message}`;
        yield { type: 'error', message: errorMsg };

        // Still append the error so the LLM knows what happened
        conversationMessages.push({
          role: 'assistant',
          content: `I called the ${toolCall.name} tool with arguments: ${JSON.stringify(toolCall.args)}`,
        });
        conversationMessages.push({
          role: 'user',
          content: `Tool "${toolCall.name}" returned an error: ${err.message}`,
        });
      }
    }

    // Loop continues — the LLM will see the tool results and can
    // decide to call more tools or produce a final response
  }

  // Max steps reached
  yield {
    type: 'text',
    content: 'I reached the maximum number of steps. Here is what I found so far.',
  };
}
