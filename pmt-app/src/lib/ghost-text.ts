/**
 * Ghost Text — Tiptap/ProseMirror extension for inline AI completions.
 *
 * Renders a translucent suggestion at the cursor position.
 * User presses Tab to accept (single transaction for clean undo),
 * Escape or any keystroke to dismiss.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// ─── Plugin State ──────────────────────────────────────────────

interface GhostTextState {
  text: string;
  pos: number; // cursor position where the ghost text appears
  streaming: boolean; // true while tokens are still arriving
}

const ghostTextKey = new PluginKey<GhostTextState | null>('ghostText');

// ─── Helper Functions (exported for RichEditor) ────────────────

/**
 * Set or update the ghost text suggestion at the current cursor position.
 */
export function setSuggestion(
  view: import('@tiptap/pm/view').EditorView,
  text: string,
  streaming = true
): void {
  const { state } = view;
  const pos = state.selection.from;
  view.dispatch(
    state.tr.setMeta(ghostTextKey, { text, pos, streaming } as GhostTextState)
  );
}

/**
 * Accept the current ghost text suggestion.
 * Inserts the text as a single transaction so Cmd+Z reverts it all at once.
 */
export function acceptSuggestion(
  view: import('@tiptap/pm/view').EditorView
): boolean {
  const ghostState = ghostTextKey.getState(view.state);
  if (!ghostState || !ghostState.text) return false;

  const { tr } = view.state;
  // Insert the text at the stored position
  tr.insertText(ghostState.text, ghostState.pos);
  // Clear the ghost text meta
  tr.setMeta(ghostTextKey, null);
  view.dispatch(tr);
  return true;
}

/**
 * Clear/dismiss the ghost text suggestion.
 */
export function clearSuggestion(
  view: import('@tiptap/pm/view').EditorView
): void {
  view.dispatch(view.state.tr.setMeta(ghostTextKey, null));
}

/**
 * Check if there's an active ghost text suggestion.
 */
export function hasSuggestion(
  view: import('@tiptap/pm/view').EditorView
): boolean {
  const state = ghostTextKey.getState(view.state);
  return !!state && !!state.text;
}

// ─── Tiptap Extension ─────────────────────────────────────────

export const GhostText = Extension.create({
  name: 'ghostText',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: ghostTextKey,

        state: {
          init(): GhostTextState | null {
            return null;
          },
          apply(tr, value): GhostTextState | null {
            // Check for explicit meta update
            const meta = tr.getMeta(ghostTextKey);
            if (meta !== undefined) {
              return meta; // null clears, object sets
            }

            // If the document changed (user typed something), clear the ghost
            if (tr.docChanged && value) {
              return null;
            }

            return value;
          },
        },

        props: {
          // Render the ghost text as a decoration widget
          decorations(state) {
            const ghostState = ghostTextKey.getState(state);
            if (!ghostState || !ghostState.text) return DecorationSet.empty;

            const widget = Decoration.widget(ghostState.pos, () => {
              const span = document.createElement('span');
              span.className = ghostState.streaming
                ? 'ghost-text ghost-text-streaming'
                : 'ghost-text';
              span.textContent = ghostState.text;
              // Prevent the widget from being selectable
              span.contentEditable = 'false';
              return span;
            }, { side: 1 }); // side: 1 puts it after the cursor

            return DecorationSet.create(state.doc, [widget]);
          },

          // Handle keydown events for Tab (accept) and Escape (reject)
          handleKeyDown(view, event) {
            const ghostState = ghostTextKey.getState(view.state);
            if (!ghostState || !ghostState.text) return false;

            if (event.key === 'Tab') {
              event.preventDefault();
              acceptSuggestion(view);
              return true;
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              clearSuggestion(view);
              return true;
            }

            // Any other key dismisses the ghost text
            // (the plugin state's apply() handles this via docChanged)
            return false;
          },
        },
      }),
    ];
  },
});
