// LLM Autofill Utility for Rich Text and Markdown Editors
// Enhanced with streaming, context-awareness, and length control

import { callLLM, streamLLM, LLMProvider } from './llm-providers';

export interface WorkItemMetadata {
  title?: string;
  type?: string;
  status?: string;
  assignee?: string;
}

export interface AutofillOptions {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  contextBefore: string;
  contextAfter?: string;
  instruction?: string;
  maxTokens?: number;
  workItemMetadata?: WorkItemMetadata;
  completionLength?: 'short' | 'long';
}

/**
 * Detect the nearest section heading above the cursor to tailor the prompt.
 */
function detectSectionContext(contextBefore: string): string | null {
  // Look for the last markdown heading in the text before cursor
  const lines = contextBefore.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const headingMatch = lines[i].match(/^#{1,4}\s+(.+)/);
    if (headingMatch) {
      return headingMatch[1].trim();
    }
  }
  return null;
}

/**
 * Build section-specific instruction based on heading context.
 */
function getSectionInstruction(sectionName: string): string | null {
  const lower = sectionName.toLowerCase();

  if (lower.includes('steps to reproduce') || lower.includes('reproduction')) {
    return 'Write numbered reproduction steps that are specific and actionable';
  }
  if (lower.includes('acceptance criteria') || lower.includes('definition of done')) {
    return 'Write acceptance criteria in Given/When/Then format';
  }
  if (lower.includes('test') && (lower.includes('case') || lower.includes('plan'))) {
    return 'Write structured test cases with preconditions, steps, and expected results';
  }
  if (lower.includes('description') || lower.includes('overview') || lower.includes('summary')) {
    return 'Write clear, concise descriptive text';
  }
  if (lower.includes('impact') || lower.includes('risk')) {
    return 'Describe potential impacts and risks in a professional tone';
  }
  if (lower.includes('solution') || lower.includes('approach') || lower.includes('design')) {
    return 'Describe a technical solution approach with clear rationale';
  }
  return null;
}

/**
 * Build the system prompt with context-awareness.
 */
function buildSystemPrompt(options: AutofillOptions): string {
  const { instruction, workItemMetadata, contextBefore } = options;

  let prompt = `You are a helpful writing assistant that completes text based on context.

Rules:
- Generate natural, coherent text that flows from the context before the cursor
- Match the writing style and tone of the existing text
- Be concise and relevant
- Do NOT repeat the context that was already written
- Do NOT add explanations or meta-commentary
- Return ONLY the completion text, nothing else
- If context after cursor exists, ensure smooth transition to it`;

  // Add work item metadata context
  if (workItemMetadata) {
    const parts: string[] = [];
    if (workItemMetadata.type) parts.push(`a ${workItemMetadata.type}`);
    if (workItemMetadata.title) parts.push(`titled "${workItemMetadata.title}"`);
    if (workItemMetadata.status) parts.push(`with status "${workItemMetadata.status}"`);
    if (workItemMetadata.assignee) parts.push(`assigned to ${workItemMetadata.assignee}`);

    if (parts.length > 0) {
      prompt += `\n- You are writing content for ${parts.join(' ')}`;
      // Type-specific hints
      if (workItemMetadata.type?.toLowerCase() === 'bug') {
        prompt += '\n- Use technical, precise language appropriate for bug reports\n- Focus on reproduction steps, expected vs actual behavior, and impact';
      } else if (workItemMetadata.type?.toLowerCase() === 'feature') {
        prompt += '\n- Use clear requirements language appropriate for feature specifications\n- Focus on user value, acceptance criteria, and technical context';
      } else if (workItemMetadata.type?.toLowerCase() === 'epic') {
        prompt += '\n- Use strategic, high-level language appropriate for epics and initiatives\n- Focus on business goals, scope, and expected impact';
      } else if (workItemMetadata.type?.toLowerCase() === 'task') {
        prompt += '\n- Use clear, actionable language for tasks\n- Focus on specific steps and deliverables';
      }
    }
  }

  // Add section-specific instruction
  const sectionName = detectSectionContext(contextBefore);
  if (sectionName) {
    const sectionHint = getSectionInstruction(sectionName);
    if (sectionHint) {
      prompt += `\n- Current section: "${sectionName}" — ${sectionHint}`;
    }
  }

  // Add custom instruction
  if (instruction) {
    prompt += `\n- Additional instruction: ${instruction}`;
  }

  return prompt;
}

/**
 * Resolve the max token count from completion length setting.
 */
function resolveMaxTokens(options: AutofillOptions): number {
  if (options.maxTokens) return options.maxTokens;
  return options.completionLength === 'long' ? 500 : 150;
}

/**
 * Generate text completion using LLM (non-streaming, for fallback).
 */
export async function generateAutofill(options: AutofillOptions): Promise<string> {
  const { provider, apiKey, model, contextBefore, contextAfter = '' } = options;
  const systemPrompt = buildSystemPrompt(options);
  const maxTokens = resolveMaxTokens(options);

  let contextMessage = '';
  if (contextBefore.trim()) {
    contextMessage += `Text before cursor:\n${contextBefore}\n\n`;
  }
  if (contextAfter.trim()) {
    contextMessage += `Text after cursor:\n${contextAfter}\n\n`;
  }
  contextMessage += 'Complete the text at the cursor position:';

  const messages = [{ role: 'user' as const, content: contextMessage }];

  try {
    const response = await callLLM(
      { provider, apiKey, model },
      messages,
      systemPrompt
    );

    return cleanCompletion(response.content);
  } catch (error) {
    console.error('[Autofill] Failed to generate:', error);
    throw new Error(`Autofill failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stream text completion using LLM, yielding chunks progressively.
 * Used for ghost text rendering — tokens appear one-by-one.
 */
export async function* generateAutofillStream(
  options: AutofillOptions
): AsyncGenerator<string> {
  const { provider, apiKey, model, contextBefore, contextAfter = '' } = options;
  const systemPrompt = buildSystemPrompt(options);
  const maxTokens = resolveMaxTokens(options);

  let contextMessage = '';
  if (contextBefore.trim()) {
    contextMessage += `Text before cursor:\n${contextBefore}\n\n`;
  }
  if (contextAfter.trim()) {
    contextMessage += `Text after cursor:\n${contextAfter}\n\n`;
  }
  contextMessage += 'Complete the text at the cursor position:';

  const messages = [{ role: 'user' as const, content: contextMessage }];

  let isFirstChunk = true;

  try {
    for await (const chunk of streamLLM(
      { provider, apiKey, model, maxTokens },
      messages,
      systemPrompt
    )) {
      let cleaned = chunk;

      // Clean artifacts from the first chunk only
      if (isFirstChunk) {
        cleaned = cleaned.replace(/^["']/, '');
        cleaned = cleaned.replace(/^\[completion\]:?\s*/i, '');
        cleaned = cleaned.replace(/^completion:?\s*/i, '');
        isFirstChunk = false;
      }

      if (cleaned) {
        yield cleaned;
      }
    }
  } catch (error) {
    console.error('[Autofill] Stream failed:', error);
    throw new Error(`Autofill failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate autofill for a specific writing task.
 */
export async function generateTaskAutofill(
  taskType: 'continue' | 'summarize' | 'expand' | 'improve',
  options: Omit<AutofillOptions, 'instruction'>
): Promise<string> {
  const instructions: Record<typeof taskType, string> = {
    continue: 'Continue writing naturally from where the text left off',
    summarize: 'Provide a concise summary of the text before the cursor',
    expand: 'Expand on the ideas in the text before the cursor with more detail',
    improve: 'Rewrite and improve the text before the cursor for clarity and impact',
  };

  return generateAutofill({
    ...options,
    instruction: instructions[taskType],
  });
}

/**
 * Stream autofill for a specific writing task.
 */
export async function* streamTaskAutofill(
  taskType: 'continue' | 'summarize' | 'expand' | 'improve',
  options: Omit<AutofillOptions, 'instruction'>
): AsyncGenerator<string> {
  const instructions: Record<typeof taskType, string> = {
    continue: 'Continue writing naturally from where the text left off',
    summarize: 'Provide a concise summary of the text before the cursor',
    expand: 'Expand on the ideas in the text before the cursor with more detail',
    improve: 'Rewrite and improve the text before the cursor for clarity and impact',
  };

  yield* generateAutofillStream({
    ...options,
    instruction: instructions[taskType],
  });
}

/**
 * Clean up LLM completion artifacts.
 */
function cleanCompletion(text: string): string {
  let completion = text.trim();
  completion = completion.replace(/^["']|["']$/g, '');
  completion = completion.replace(/^\[completion\]:?\s*/i, '');
  completion = completion.replace(/^completion:?\s*/i, '');
  return completion;
}

/**
 * Extract meaningful context from editor content.
 * Limits context to avoid excessive tokens while preserving meaning.
 */
export function extractContext(
  fullText: string,
  cursorPosition: number,
  maxChars = 2000
): { before: string; after: string } {
  const beforeText = fullText.slice(0, cursorPosition);
  const before = beforeText.slice(-maxChars);

  const afterText = fullText.slice(cursorPosition);
  const after = afterText.slice(0, Math.floor(maxChars / 2));

  return { before, after };
}

/**
 * Rewrite description using work item title and metadata as context.
 * This is the specialized function for "AI Assist" - rewriting descriptions.
 */
export async function* generateDescriptionRewrite(
  options: AutofillOptions
): AsyncGenerator<string> {
  const { provider, apiKey, model, contextBefore } = options;
  const { title, type, assignee, status } = options.workItemMetadata || {};
  
  // Build a specialized prompt for description rewriting
  let systemPrompt = `You are a technical writing assistant helping to improve work item descriptions.

Your task is to rewrite and improve the description to be:
- Clear and concise
- Professionally written
- Focused on the key points
- Well-structured with proper formatting
- Free of redundancy

Work Item Context:
${title ? `- Title: "${title}"` : ''}
${type ? `- Type: ${type}` : ''}
${status ? `- Status: ${status}` : ''}
${assignee ? `- Assigned to: ${assignee}` : ''}

Rules:
- Rewrite the ENTIRE description, not just complete it
- Preserve all important information from the original
- Improve clarity, grammar, and professional tone
- Use markdown formatting for better readability
- Return ONLY the rewritten description, nothing else
- Do NOT add explanations or meta-commentary`;

  // Type-specific guidance
  if (type?.toLowerCase() === 'bug') {
    systemPrompt += `\n- Focus on: what broke, when it breaks, expected vs actual behavior, and impact
- Use clear, technical language
- Help identify root cause or reproduction steps if evident`;
  } else if (type?.toLowerCase() === 'feature') {
    systemPrompt += `\n- Focus on: user value, requirements, and acceptance criteria
- Make the feature benefit crystal clear
- Structure as user story if appropriate`;
  } else if (type?.toLowerCase() === 'epic') {
    systemPrompt += `\n- Focus on: business goals, scope, and strategic value
- Use high-level language
- Make the initiative's importance clear`;
  } else if (type?.toLowerCase() === 'task') {
    systemPrompt += `\n- Focus on: specific steps and deliverables
- Make it actionable and clear`;
  }

  const contextMessage = `Current description to improve:

${contextBefore}

Please rewrite this description to be clearer, more professional, and better structured.`;

  const messages = [{ role: 'user' as const, content: contextMessage }];

  let isFirstChunk = true;

  try {
    for await (const chunk of streamLLM(
      { provider, apiKey, model, maxTokens: 800 },
      messages,
      systemPrompt
    )) {
      let cleaned = chunk;

      // Clean artifacts from the first chunk only
      if (isFirstChunk) {
        cleaned = cleaned.replace(/^["']/, '');
        cleaned = cleaned.replace(/^\[description\]:?\s*/i, '');
        cleaned = cleaned.replace(/^description:?\s*/i, '');
        cleaned = cleaned.replace(/^rewritten?\s*:?\s*/i, '');
        isFirstChunk = false;
      }

      if (cleaned) {
        yield cleaned;
      }
    }
  } catch (error) {
    console.error('[Description Rewrite] Stream failed:', error);
    throw new Error(`Description rewrite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
