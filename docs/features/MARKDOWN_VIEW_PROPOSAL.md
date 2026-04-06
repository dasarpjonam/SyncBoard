# Markdown View + Rich Editor Implementation Proposal

## Current Setup
- **Rich Editor**: TipTap with Markdown extension (already converts both ways)
- **Location**: WorkItemEditView for description, potentially for comments
- **Content Storage**: Always stored as Markdown in files

## 🎯 Recommended Approach: **Toggle View with Tabs**

### Why This Approach?
✅ Industry standard (GitHub, GitLab, Notion all use this)
✅ Clean UX - only one view visible at a time
✅ Easy to implement with existing TipTap Markdown extension
✅ Minimal layout changes needed for your ultra-minimal design

---

## Implementation Options

### **Option 1: Simple Toggle (Recommended) ⭐**

**UI Design:**
```
┌─────────────────────────────────────────────┐
│  [ 🎨 Rich Text ] [ 📝 Markdown ]          │  ← Tab switcher
├─────────────────────────────────────────────┤
│                                             │
│   Editor content here                       │
│   (either rich or markdown)                 │
│                                             │
└─────────────────────────────────────────────┘
```

**Implementation:**
```tsx
// 1. Add state to RichEditor
const [viewMode, setViewMode] = useState<'rich' | 'markdown'>('rich');
const [markdownContent, setMarkdownContent] = useState(content);

// 2. Add tab toggle UI
<div className="flex gap-2 mb-4">
  <button 
    onClick={() => setViewMode('rich')}
    className={viewMode === 'rich' ? 'active' : ''}
  >
    🎨 Rich Text
  </button>
  <button 
    onClick={() => setViewMode('markdown')}
    className={viewMode === 'markdown' ? 'active' : ''}
  >
    📝 Markdown
  </button>
</div>

// 3. Conditional rendering
{viewMode === 'rich' ? (
  <EditorContent editor={editor} />
) : (
  <textarea 
    value={markdownContent}
    onChange={(e) => {
      setMarkdownContent(e.target.value);
      // Update TipTap editor content
      editor?.commands.setContent(e.target.value);
    }}
    className="w-full h-full font-mono"
  />
)}
```

**Pros:**
- Simple to implement (< 100 lines of code)
- Matches your minimal design aesthetic
- Users familiar with this pattern
- No additional dependencies

**Cons:**
- Basic markdown editor (no syntax highlighting)
- Can add Monaco/CodeMirror later if needed

**Time to implement:** ~1 hour

---

### **Option 2: Split View (Side-by-Side)**

**UI Design:**
```
┌──────────────────────┬──────────────────────┐
│  🎨 Rich Text        │  📝 Markdown         │
├──────────────────────┼──────────────────────┤
│                      │                      │
│  Rich editor         │  # Title             │
│  with formatting     │  **bold**            │
│                      │  - list item         │
│                      │                      │
└──────────────────────┴──────────────────────┘
```

**Implementation:**
```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <h3>Rich Text</h3>
    <EditorContent editor={editor} />
  </div>
  <div>
    <h3>Markdown</h3>
    <textarea 
      value={editor?.storage.markdown.getMarkdown()}
      onChange={(e) => editor?.commands.setContent(e.target.value)}
      className="font-mono h-full"
    />
  </div>
</div>
```

**Pros:**
- See both views simultaneously
- Great for learning markdown
- Real-time sync between views

**Cons:**
- Takes more screen space
- May not fit your minimal design
- More complex on mobile

**Time to implement:** ~2 hours

---

### **Option 3: Toggle with Preview Mode**

**UI Design:**
```
┌─────────────────────────────────────────────┐
│  [ Edit ] [ Preview ] [ Markdown ]         │  ← 3 modes
├─────────────────────────────────────────────┤
│                                             │
│   Content in selected mode                  │
│                                             │
└─────────────────────────────────────────────┘
```

**Modes:**
1. **Edit**: Rich text editor (current)
2. **Preview**: Rendered markdown (read-only)
3. **Markdown**: Raw markdown editor

**Pros:**
- Most flexible
- Preview mode is useful
- Matches GitHub's approach

**Cons:**
- More complex (3 views instead of 2)
- May be overkill for your use case

**Time to implement:** ~3 hours

---

### **Option 4: Enhanced Toggle with Monaco Editor**

**Same as Option 1, but with Monaco Editor for markdown view**

**Additional Features:**
- Syntax highlighting for markdown
- Line numbers
- Minimap
- Search/replace
- Multiple cursors

**Additional Dependencies:**
```bash
npm install @monaco-editor/react
```

**Implementation:**
```tsx
import Editor from '@monaco-editor/react';

{viewMode === 'markdown' && (
  <Editor
    height="400px"
    language="markdown"
    value={markdownContent}
    onChange={(value) => {
      setMarkdownContent(value || '');
      editor?.commands.setContent(value || '');
    }}
    options={{
      minimap: { enabled: false },
      lineNumbers: 'on',
      wordWrap: 'on',
    }}
  />
)}
```

**Pros:**
- Professional markdown editing experience
- VS Code-like interface (familiar to developers)
- Great syntax highlighting

**Cons:**
- Larger bundle size (~500KB)
- More complex setup
- May be overkill for simple notes

**Time to implement:** ~2 hours (including setup)

---

## 💡 My Recommendation: **Start with Option 1, Upgrade to Option 4 Later**

### Phase 1: Simple Toggle (Option 1)
**Implement now:**
- Tab toggle between Rich and Markdown
- Simple textarea for markdown
- Syncs via TipTap's Markdown extension

**Benefits:**
- Quick to implement
- Validates user demand for markdown view
- Keeps bundle size small
- Fits your minimal design

### Phase 2: Enhanced (Optional, if users request)
**Add later if needed:**
- Monaco Editor for better markdown experience
- Syntax highlighting
- Or split view mode

---

## 📋 Implementation Checklist (Option 1)

### 1. Modify `RichEditor.tsx`
```tsx
// Add new prop
interface Props {
  // ... existing props
  defaultView?: 'rich' | 'markdown';
  enableMarkdownView?: boolean;
}

// Add state
const [viewMode, setViewMode] = useState<'rich' | 'markdown'>(defaultView || 'rich');

// Add tab switcher UI above editor
// Add markdown textarea (conditional)
// Sync between views
```

### 2. Update `WorkItemEditView.tsx`
```tsx
<RichEditor
  content={formData.content || ''}
  onChange={content => setFormData({...formData, content})}
  onMention={...}
  enableMarkdownView={true}  // Enable the toggle
  placeholder="Write something..."
  workspacePath={workspacePath || undefined}
/>
```

### 3. Add Styling
```css
/* Markdown textarea styling */
.markdown-editor {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  min-height: 400px;
  resize: vertical;
}

/* Tab button styling */
.editor-tab {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.editor-tab.active {
  border-bottom: 2px solid #3b82f6;
  color: #3b82f6;
  font-weight: 600;
}
```

### 4. Handle Edge Cases
- [ ] Sync content when switching views
- [ ] Preserve cursor position when possible
- [ ] Handle empty content gracefully
- [ ] Test with mentions, images, code blocks
- [ ] Ensure auto-save works in both modes

---

## 🎨 UI Mockup (Recommended Option 1)

### Rich Text View
```
┌──────────────────────────────────────────────────┐
│  🎨 Rich Text    📝 Markdown                     │ ← Tabs
├──────────────────────────────────────────────────┤
│  [B] [I] [U] [Link] [Code] ...                  │ ← Toolbar
├──────────────────────────────────────────────────┤
│                                                  │
│  This is **bold** text                           │ ← Rich content
│  • List item                                     │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Markdown View
```
┌──────────────────────────────────────────────────┐
│  🎨 Rich Text    📝 Markdown                     │ ← Tabs
├──────────────────────────────────────────────────┤
│  1  This is **bold** text                        │ ← Raw markdown
│  2  - List item                                  │
│  3                                               │
│  4                                               │
└──────────────────────────────────────────────────┘
```

---

## 🔄 Content Sync Strategy

TipTap's Markdown extension handles this automatically:

**Rich → Markdown:**
```typescript
const markdown = editor.storage.markdown.getMarkdown();
```

**Markdown → Rich:**
```typescript
editor.commands.setContent(markdownString);
```

**Real-time sync:**
```typescript
// When markdown textarea changes
const handleMarkdownChange = (newMarkdown: string) => {
  setMarkdownContent(newMarkdown);
  editor?.commands.setContent(newMarkdown);
  onChange(newMarkdown); // Notify parent
};

// When rich editor changes
editor.on('update', ({ editor }) => {
  const markdown = editor.storage.markdown.getMarkdown();
  setMarkdownContent(markdown);
  onChange(markdown); // Notify parent
});
```

---

## 🚀 Quick Start Code (Option 1)

Here's a complete, minimal implementation you can copy-paste:

```tsx
// In RichEditor.tsx, add this state and UI
export function RichEditor({ /* props */ }: Props) {
  const [viewMode, setViewMode] = useState<'rich' | 'markdown'>('rich');
  const [markdownText, setMarkdownText] = useState(content);

  // Sync markdown when editor updates
  useEffect(() => {
    if (editor && viewMode === 'rich') {
      const md = editor.storage.markdown.getMarkdown();
      setMarkdownText(md);
    }
  }, [editor?.state.doc, viewMode]);

  return (
    <div className={`overflow-hidden bg-transparent ${className}`}>
      {/* Tab Toggle */}
      <div className="flex items-center gap-1 mb-4 border-b">
        <button
          onClick={() => setViewMode('rich')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'rich'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🎨 Rich Text
        </button>
        <button
          onClick={() => {
            setViewMode('markdown');
            // Get latest markdown from editor
            if (editor) {
              setMarkdownText(editor.storage.markdown.getMarkdown());
            }
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'markdown'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📝 Markdown
        </button>
      </div>

      {viewMode === 'rich' ? (
        <>
          {/* Existing Rich Editor */}
          <div className="flex items-center justify-between mb-4">
            <EditorToolbar editor={editor} />
            {autoSave && <AutoSaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />}
          </div>
          <div className="relative">
            <EditorContent editor={editor} className="min-h-[200px]" />
            {editor && <BubbleMenuToolbar editor={editor} />}
            {/* ... slash menu ... */}
          </div>
        </>
      ) : (
        /* Markdown View */
        <textarea
          value={markdownText}
          onChange={(e) => {
            const newMarkdown = e.target.value;
            setMarkdownText(newMarkdown);
            editor?.commands.setContent(newMarkdown);
            onChange(newMarkdown);
          }}
          className="w-full min-h-[400px] p-4 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          placeholder="Write markdown here..."
        />
      )}
    </div>
  );
}
```

---

## 🧪 Testing Checklist

After implementation, test:

- [ ] **Switch between views**: Content syncs properly
- [ ] **Type in markdown**: Updates rich view when switching back
- [ ] **Format in rich**: Updates markdown view
- [ ] **Images**: Show as `![alt](url)` in markdown
- [ ] **Code blocks**: Preserve language and content
- [ ] **@Mentions**: Show as `@username` in markdown
- [ ] **Lists**: Numbered and bulleted sync correctly
- [ ] **Links**: Format as `[text](url)` in markdown
- [ ] **Headings**: Show with `#` markers
- [ ] **Auto-save**: Works in both modes
- [ ] **Mobile**: Responsive on small screens

---

## 📦 File Changes Summary

**Files to modify:**
1. `src/components/RichEditor.tsx` - Add toggle and markdown view
2. `src/views/WorkItemEditView.tsx` - Optional: pass enableMarkdownView prop
3. `src/index.css` - Add markdown editor styles (optional)

**Files to create:**
- None (all in existing files)

**Dependencies to add:**
- None for Option 1
- `@monaco-editor/react` for Option 4 (optional, later)

---

## ⚡ Performance Considerations

**Concern**: Does having two views impact performance?

**Answer**: No, because:
- Only one view renders at a time (toggle approach)
- TipTap's markdown conversion is very fast
- Textarea is lightweight (no extra rendering)
- Content syncs only when switching or typing (debounced)

---

## 🎯 Next Steps

1. **Choose your option** (I recommend Option 1)
2. **I can implement it for you** - Just say "implement Option 1"
3. **Or follow the code above** - Copy into RichEditor.tsx
4. **Test thoroughly** - Use the checklist above
5. **Gather feedback** - See if users want Monaco/split view later

---

## Questions to Consider

1. **Where else?** Just description, or also comments?
   - Recommendation: Description only for now
   
2. **Default view?** Start with rich or markdown?
   - Recommendation: Rich (users expect WYSIWYG by default)
   
3. **Persist preference?** Remember user's last choice?
   - Recommendation: Not initially (keep it simple)
   
4. **Keyboard shortcut?** Like `Cmd+Shift+M` to toggle?
   - Recommendation: Nice to have, add later

---

## 🚀 Ready to Implement?

Just let me know which option you prefer, and I can:
1. Implement the code changes
2. Add the necessary styling
3. Test it with your existing features
4. Create documentation

**Estimated time:**
- Option 1: 30 minutes
- Option 4 (with Monaco): 1 hour
