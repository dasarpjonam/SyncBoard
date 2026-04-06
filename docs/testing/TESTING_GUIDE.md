# Rich Text Editor - Manual Testing Guide

## 🧪 How to Test All New Features

### Prerequisites
1. Build and run the application:
   ```bash
   cd pmt-app
   npm install
   npm run dev
   ```

2. Open a workspace and create or edit a work item

---

## Test 1: Slash Commands ✅

**Steps:**
1. Open WorkItemModal (click "New Item" or edit existing)
2. Click in the Description field
3. Type `/`
4. ✅ **Expected**: Command menu appears with 10 options
5. Type `h1`
6. ✅ **Expected**: Menu filters to show "Heading 1"
7. Press `Enter` or click the command
8. ✅ **Expected**: Heading 1 formatting applied, slash command removed

**Test All Commands:**
- `/h1`, `/h2`, `/h3` → Headings
- `/bullet`, `/ul` → Bullet list
- `/numbered`, `/ol` → Numbered list
- `/todo`, `/check` → Task list with checkboxes
- `/code` → Code block
- `/quote` → Blockquote
- `/hr`, `/divider` → Horizontal rule

---

## Test 2: Floating Bubble Menu ✅

**Steps:**
1. Type some text in the description: "This is a test sentence"
2. Select part of the text (click and drag)
3. ✅ **Expected**: Floating toolbar appears above selection
4. Click **Bold** button
5. ✅ **Expected**: Text becomes bold
6. Click **Italic** button
7. ✅ **Expected**: Text becomes italic
8. Click a highlight color (yellow)
9. ✅ **Expected**: Text background becomes yellow

**Test All Bubble Menu Features:**
- Bold, Italic, Strikethrough, Code buttons
- Link button (prompts for URL)
- Highlight colors (Yellow, Green, Blue, Pink, Remove)
- "Turn into" dropdown (Paragraph, H1, H2, H3)

---

## Test 3: Image Upload ✅

**Method 1: Drag and Drop**
1. Find an image file on your computer
2. Drag it into the description editor
3. ✅ **Expected**: Image appears inline in editor
4. ✅ **Expected**: Image saved to `.syncboard/attachments/`

**Method 2: Paste**
1. Copy an image (Cmd+C from Preview, browser, etc.)
2. Paste into editor (Cmd+V)
3. ✅ **Expected**: Image appears inline

**Method 3: Slash Command**
1. Type `/image`
2. Press Enter
3. ✅ **Expected**: File picker opens
4. Select an image
5. ✅ **Expected**: Image inserted

---

## Test 4: Code Blocks with Syntax Highlighting ✅

**Steps:**
1. Type `/code` in description
2. Press Enter
3. ✅ **Expected**: Code block appears with dark background
4. Type this code:
   ```javascript
   function greet(name) {
     return `Hello, ${name}!`;
   }
   ```
5. ✅ **Expected**: Syntax highlighting applied (keywords, strings, etc. in different colors)
6. Check the following are colored:
   - `function` → pink
   - `greet`, `name` → blue/cyan
   - Strings (`Hello, ${name}!`) → green
   - Braces and parentheses → white/gray

**Test with Different Languages:**
- Python: `def hello():`
- HTML: `<div class="test">Content</div>`
- CSS: `.button { color: blue; }`

---

## Test 5: Auto-save Indicator ✅

**Note:** Auto-save is currently integrated but may not show indicator by default. To test:

**Steps:**
1. Edit a work item description
2. Type some content
3. Look for auto-save indicator in top-right of editor
4. ✅ **Expected (if enabled)**: Shows "Saving..." then "Saved Xs ago"
5. Wait 5 seconds and check again
6. ✅ **Expected**: Timestamp updates ("Saved 5s ago")

**Manual Save Test:**
1. Make changes
2. Click "Save" button
3. ✅ **Expected**: No errors, modal closes
4. Reopen item
5. ✅ **Expected**: Your content is preserved with all formatting

---

## Test 6: Keyboard Shortcuts ✅

**Bold/Italic Test:**
1. Type "test text"
2. Select the text
3. Press `Cmd+B` (Mac) or `Ctrl+B` (Windows/Linux)
4. ✅ **Expected**: Text becomes bold
5. Press `Cmd+I`
6. ✅ **Expected**: Text becomes italic

**Undo/Redo Test:**
1. Make some changes
2. Press `Cmd+Z`
3. ✅ **Expected**: Last change undone
4. Press `Cmd+Shift+Z`
5. ✅ **Expected**: Change redone

**List Shortcuts:**
1. Type at start of line: `- ` (dash + space)
2. ✅ **Expected**: Converts to bullet list
3. Type at start of line: `1. ` (number + dot + space)
4. ✅ **Expected**: Converts to numbered list

**Heading Shortcuts:**
1. Type at start of line: `# ` (hash + space)
2. ✅ **Expected**: Converts to Heading 1
3. Try `## ` and `### ` for H2 and H3

---

## Test 7: Text Highlighting ✅

**Steps:**
1. Type "Important text to highlight"
2. Select "Important text"
3. Floating toolbar appears
4. Click yellow highlight square
5. ✅ **Expected**: Text background becomes yellow
6. Select again and try other colors (green, blue, pink)
7. To remove: select highlighted text, click ✕ button
8. ✅ **Expected**: Highlight removed

---

## Test 8: Mention Support ✅

**Steps:**
1. Ensure your workspace config has users defined
2. In description, type `@`
3. ✅ **Expected**: Mention dropdown appears with user list
4. Type to filter: `@alice`
5. ✅ **Expected**: List filters to matching users
6. Click or press Enter to select
7. ✅ **Expected**: `@alice` appears highlighted in blue

---

## Test 9: Blockquotes ✅

**Steps:**
1. Type `/quote` or use Quote button in toolbar
2. Press Enter
3. ✅ **Expected**: Blockquote formatting applied (left border, italic text)
4. Type a quote
5. ✅ **Expected**: Looks like a quoted section

**Alternative:**
- Type `> ` at start of line
- Should auto-convert to blockquote

---

## Test 10: Horizontal Divider ✅

**Steps:**
1. Type `/hr` or `/divider`
2. Press Enter  
3. ✅ **Expected**: Horizontal line appears
4. Try clicking above and below the line
5. ✅ **Expected**: Can type on both sides

**Alternative:**
- Use "Divider" slash command
- Look for horizontal rule button in toolbar

---

## Test 11: Task Lists ✅

**Steps:**
1. Type `/todo`
2. Press Enter
3. ✅ **Expected**: Checkbox appears
4. Type task text: "Complete documentation"
5. Press Enter
6. ✅ **Expected**: New task item created
7. Click checkbox
8. ✅ **Expected**: Checkbox toggles checked/unchecked
9. Press Enter at end of task
10. ✅ **Expected**: New task item below

**Nested Tasks:**
1. With cursor on a task, press Tab
2. ✅ **Expected**: Task indents (nested)
3. Press Shift+Tab
4. ✅ **Expected**: Task outdents

---

## Test 12: Link Editing ✅

**Steps:**
1. Type "Visit our website"
2. Select "website"
3. Bubble menu appears
4. Click Link button (chain icon)
5. ✅ **Expected**: Prompt appears asking for URL
6. Enter: `https://example.com`
7. Click OK
8. ✅ **Expected**: Text becomes clickable link (blue, underlined)

**Edit Link:**
1. Click on link text
2. Link button in bubble menu is highlighted
3. Click link button again
4. ✅ **Expected**: Current URL shown in prompt
5. Change URL or clear to remove link

---

## Test 13: Markdown Round-trip ✅

**Steps:**
1. Create a work item with this markdown:
   ```markdown
   # Heading
   
   **Bold text** and *italic text*
   
   - Bullet 1
   - Bullet 2
   
   [Link](https://example.com)
   
   > Quote
   
   ```javascript
   const x = 42;
   ```
   ```

2. Save and close
3. Reopen the item
4. ✅ **Expected**: All formatting preserved exactly
5. Edit, add more content, save again
6. ✅ **Expected**: Still renders correctly

---

## Test 14: Content Persistence ✅

**Steps:**
1. Create new work item
2. Add various content:
   - Headings, lists, code blocks, images, links
3. Save item
4. ✅ **Expected**: Modal closes without errors
5. Refresh browser (Cmd+R)
6. ✅ **Expected**: Application reloads
7. Open the same work item
8. ✅ **Expected**: ALL content and formatting intact

---

## Test 15: Edge Cases ✅

**Empty Content:**
1. Create item with no description
2. Save
3. ✅ **Expected**: Saves successfully

**Very Long Content:**
1. Paste 5000+ words into description
2. ✅ **Expected**: No lag, performs smoothly
3. Save
4. ✅ **Expected**: Saves successfully

**Special Characters:**
1. Type: `émojis 🎉 spëcial çhars <>&"`
2. Save and reopen
3. ✅ **Expected**: All characters preserved

**Multiple Images:**
1. Upload 5-10 images
2. ✅ **Expected**: All render inline
3. Save and reopen
4. ✅ **Expected**: All images still visible

---

## 🐛 What to Look For (Known Issues)

### ✅ Should Work:
- All formatting buttons
- Slash commands
- Keyboard shortcuts
- Image uploads
- Code highlighting
- Save and reload

### ⚠️ Limitations:
- Auto-save indicator may not show by default (needs prop configuration)
- Images stored locally in `.syncboard/attachments/`
- Large images not automatically resized (shows full size)

---

## 📊 Testing Checklist

Use this checklist while testing:

- [ ] Slash command menu appears and filters correctly
- [ ] All 10 slash commands work
- [ ] Floating bubble menu appears on text selection
- [ ] Bold, Italic, Strikethrough, Code formatting works
- [ ] Text highlighting works (4 colors + remove)
- [ ] Image drag-drop works
- [ ] Image paste works
- [ ] Code blocks show syntax highlighting
- [ ] Keyboard shortcuts work (Cmd+B, Cmd+I, Cmd+Z)
- [ ] Save and reload preserves all formatting
- [ ] Task lists checkable
- [ ] Links clickable and editable
- [ ] Blockquotes render correctly
- [ ] Horizontal rules display
- [ ] @mentions work (if users configured)
- [ ] No console errors
- [ ] No data loss on save/reload

---

## 🎯 Success Criteria

✅ **All features work without errors**  
✅ **Content persists after save and reload**  
✅ **UI is responsive and smooth**  
✅ **No data corruption or loss**  
✅ **Markdown round-trip works correctly**

If all tests pass, the rich text editor implementation is successful! 🎉
