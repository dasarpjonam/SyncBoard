import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAgentLoop } from '../lib/agent-loop';
import { callLLM, LLMConfig } from '../lib/llm-providers';
import { ToolRegistry } from '../lib/tool-registry';
import { ToolContext } from '../types/chat';

// Mock callLLM
vi.mock('../lib/llm-providers', () => ({
  callLLM: vi.fn(),
}));

describe('runAgentLoop', () => {
  let mockRegistry: ToolRegistry;
  let mockToolContext: ToolContext;
  let mockLLMConfig: LLMConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRegistry = {
      getDefinitions: vi.fn().mockReturnValue([]),
      execute: vi.fn(),
      register: vi.fn(),
      hasTool: vi.fn().mockReturnValue(true),
    } as unknown as ToolRegistry;

    mockToolContext = {
      items: [],
      addItems: vi.fn(),
      updateItem: vi.fn(),
      addComment: vi.fn(),
    } as unknown as ToolContext;

    mockLLMConfig = {
      provider: 'chatgpt',
      apiKey: 'test-key',
      model: 'gpt-4',
    };
  });

  const runGenerator = async (gen: AsyncGenerator<unknown>) => {
    const results = [];
    for await (const val of gen) {
      results.push(val);
    }
    return results;
  };

  it('yields progress and text when LLM returns content without tool calls', async () => {
    vi.mocked(callLLM).mockResolvedValueOnce({
      content: 'Hello world',
      toolCalls: [],
    });

    const gen = runAgentLoop(mockLLMConfig, [], 'system prompt', mockRegistry, mockToolContext);
    const results = await runGenerator(gen);

    expect(results).toEqual([
      { type: 'progress', message: 'Thinking...' },
      { type: 'text', content: 'Hello world' },
    ]);
    expect(callLLM).toHaveBeenCalledTimes(1);
  });

  it('yields error when callLLM throws', async () => {
    vi.mocked(callLLM).mockRejectedValueOnce(new Error('API failure'));

    const gen = runAgentLoop(mockLLMConfig, [], 'system prompt', mockRegistry, mockToolContext);
    const results = await runGenerator(gen);

    expect(results).toEqual([
      { type: 'progress', message: 'Thinking...' },
      { type: 'error', message: 'API failure' },
    ]);
  });

  it('handles tool execution successfully', async () => {
    vi.mocked(callLLM)
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [{ name: 'test_tool', args: { arg1: 'value' } }],
      })
      .mockResolvedValueOnce({
        content: 'Tool finished successfully',
        toolCalls: [],
      });

    vi.mocked(mockRegistry.execute).mockResolvedValueOnce({
      summary: 'Tool success',
      richContent: undefined,
    });

    const gen = runAgentLoop(mockLLMConfig, [], 'system prompt', mockRegistry, mockToolContext);
    const results = await runGenerator(gen);

    expect(results).toEqual([
      { type: 'progress', message: 'Thinking...' },
      { type: 'tool_call', toolName: 'test_tool', args: { arg1: 'value' } },
      { type: 'tool_result', toolName: 'test_tool', summary: 'Tool success', richContent: undefined },
      { type: 'progress', message: 'Continuing...' },
      { type: 'text', content: 'Tool finished successfully' },
    ]);

    expect(callLLM).toHaveBeenCalledTimes(2);
    expect(mockRegistry.execute).toHaveBeenCalledWith('test_tool', { arg1: 'value' }, mockToolContext);
  });

  it('handles tool execution failure and continues', async () => {
    vi.mocked(callLLM)
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [{ name: 'test_tool', args: { arg1: 'value' } }],
      })
      .mockResolvedValueOnce({
        content: 'I saw an error',
        toolCalls: [],
      });

    vi.mocked(mockRegistry.execute).mockRejectedValueOnce(new Error('Tool failed internally'));

    const gen = runAgentLoop(mockLLMConfig, [], 'system prompt', mockRegistry, mockToolContext);
    const results = await runGenerator(gen);

    expect(results).toEqual([
      { type: 'progress', message: 'Thinking...' },
      { type: 'tool_call', toolName: 'test_tool', args: { arg1: 'value' } },
      { type: 'error', message: 'Tool "test_tool" failed: Tool failed internally' },
      { type: 'progress', message: 'Continuing...' },
      { type: 'text', content: 'I saw an error' },
    ]);

    expect(callLLM).toHaveBeenCalledTimes(2);
  });

  it('stops when reaching max steps', async () => {
    vi.mocked(callLLM).mockImplementation(async () => ({
      content: '',
      toolCalls: [{ name: 'test_tool', args: {} }],
    }));

    vi.mocked(mockRegistry.execute).mockResolvedValue({
      summary: 'Tool success',
    });

    // Run with maxSteps = 2
    const gen = runAgentLoop(mockLLMConfig, [], 'system prompt', mockRegistry, mockToolContext, 2);
    const results = await runGenerator(gen);

    expect(results.length).toBeGreaterThan(0);
    expect(results[results.length - 1]).toEqual({
      type: 'text',
      content: 'I reached the maximum number of steps. Here is what I found so far.',
    });
    expect(callLLM).toHaveBeenCalledTimes(2);
  });
});
