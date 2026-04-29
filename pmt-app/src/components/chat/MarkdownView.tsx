import React, { useMemo } from 'react';
import MarkdownIt from 'markdown-it';

// Shared markdown-it instance with safe defaults
const md = new MarkdownIt({
  html: false,        // Disable raw HTML for security
  linkify: true,      // Auto-convert URLs to links
  typographer: true,  // Enable smart quotes, dashes, etc.
  breaks: true,       // Convert \n to <br>
});

interface MarkdownViewProps {
  content: string;
  className?: string;
}

/**
 * Renders a markdown string as formatted HTML.
 * Uses markdown-it (already a project dependency via tiptap-markdown).
 */
export function MarkdownView({ content, className = '' }: MarkdownViewProps) {
  const html = useMemo(() => md.render(content), [content]);

  return (
    <div
      className={`markdown-chat-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
