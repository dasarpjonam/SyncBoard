# User Selection & @Mentions - Debug Guide

## Issues Reported
1. User selection is not working
2. @mentions do not work

## Fixes Applied

### 1. Fixed Mention Configuration (RichEditor.tsx)
**Problem:** The mention popup wasn't positioned correctly and keyboard navigation wasn't working.

**Solution:**
- Fixed popup positioning to use absolute positioning with proper coordinates
- Added keyboard navigation (Up/Down arrows to navigate, Enter to select, Escape to close)
- Added visual feedback for selected item (blue background)
- Fixed the items function to always return an array (even if onMention is not provided)
- Improved error handling when no users are found

### 2. User Selector Implementation (WorkspaceView.tsx)
**Status:** Implementation looks correct. The user selector:
- Shows  in the workspace header
- Displays a dropdown with all configured users
- Saves selection to localStorage
- Updates currentUser in WorkspaceContext

**Possible Issues:**
- User might not have configured users in config.yaml
- Dropdown might be hidden behind other elements (z-index issue)

### 3. Current User in Comments (WorkItemEditView.tsx)
**Status:** Correctly implemented
- Uses `currentUser` from context
- Falls back to 'Anonymous' if no user selected

## Testing Instructions

### Setup Test Environment

1. **Create a test workspace with users:**
   ```bash
   cd /Users/dasarpjonam/Documents/JulesApps/SyncBoard/pmt-app
   ./test-user-mentions.sh
   ```

   Test workspace will be created at: `/tmp/syncboard-test-[timestamp]`

2. **Start the application:**
   ```bash
   cd /Users/dasarpjonam/Documents/JulesApps/SyncBoard/pmt-app
   npm run dev
   ```

### Test 1: User Selection

1. Open the app
2. Click "Select Workspace" and choose: `/tmp/syncboard-test-[timestamp]`
3. Look at the workspace header (top-left, after "Workspace" title)
4. You should see a button with 👤 icon and "Select user" text
5. Click the button
6. **Expected:** Dropdown appears with 4 users: Alice, Bob, Charlie, Diana
7. Click on "Alice"
8. **Expected:** Button now shows "Alice" instead of "Select user"
9. Click the button again
10. **Expected:** Dropdown shows Alice with blue background (indicating selected)

**If it doesn't work:**
- Check browser console (F12) for errors
- Verify config.yaml has users array
- Check if dropdown is appearing but hidden (inspect element, look for div with class "absolute top-full")

### Test 2: @Mentions in Description

1. From the workspace, click on "Sample Work Item"
2. Click in the description editor (the large text area)
3. Type `@` (at symbol)
4. **Expected:** A dropdown appears below the cursor showing all 4 users
5. Type `a` (so you have `@a`)
6. **Expected:** Dropdown filters to show only "Alice"
7. Press ↓ (Down arrow)
8. **Expected:** Selection moves to next item (if multiple)
9. Press Enter
10. **Expected:** `@Alice` is inserted with blue background and blue text

**If dropdown doesn't appear:**
- Check browser console for errors
- Verify that `onMention` prop is being passed to RichEditor
- Check if the popup div is being created (inspect element, look for "mention-suggestions" class)
- Try clicking exactly where you typed `@` to ensure focus is in the editor

**If mention doesn't insert:**
- Check if Enter key is being captured
- Look for console errors about "command"
- Verify TipTap editor is properly initialized

### Test 3: @Mentions Filtering

1. In the description editor, type `@b`
2. **Expected:** Shows "Bob"
3. Type `@bo`
4. **Expected:** Still shows "Bob"
5. Type `@x`
6. **Expected:** Shows "No users found"

### Test 4: Comment Author

1. Make sure "Alice" is selected in the user selector
2. Scroll down to Comments section
3. Type a comment: "Test from Alice"
4. Press Enter or click the → button
5. **Expected:** New comment appears with "Alice" as author
6. Go back to workspace (click "Back to Workspace")
7. Click user selector and change to "Bob"
8. Go back to the same work item
9. Add another comment: "Test from Bob"
10. **Expected:** This comment shows "Bob" as author

### Test 5: Auto-Save

1. Open an existing work item
2. Change the title
3. Wait 2 seconds without typing
4. **Expected:** Top-left corner shows "Saving..." then "Saved just now"

## Debugging Tips

### Check if users are loaded:
Open browser console (F12) and type:
```javascript
// Check workspace context
const workspace = JSON.parse(localStorage.getItem('workspacePath'));
console.log('Workspace:', workspace);

// Check current user
const user = localStorage.getItem('currentUser');
console.log('Current user:', user);
```

### Check config.yaml:
```bash
cat /tmp/syncboard-test-*/config.yaml
```

### Check if mention extension is loaded:
In browser console:
```javascript
// This will show if TipTap editor is initialized
document.querySelector('.ProseMirror')
```

### Force reload:
1. Clear localStorage: In console, run `localStorage.clear()`
2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Restart the app

## Common Issues & Solutions

### Issue: User selector doesn't show any users
**Cause:** config.yaml doesn't have users or hasn't loaded
**Solution:** 
- Check config.yaml exists in workspace
- Verify `users:` array is present
- Reload workspace

### Issue: @mention dropdown doesn't appear
**Cause:** onMention prop not passed or users array empty
**Solution:**
- Check browser console for errors
- Verify config.users is not empty
- Check if RichEditor received onMention prop

### Issue: @mention dropdown appears but in wrong position
**Cause:** Positioning logic might have issues with scroll or parent containers
**Solution:**
- Check if editor is inside scrollable container
- Verify `position: absolute` is working
- May need to adjust positioning logic

### Issue: Auto-save not showing
**Cause:** Only works for existing items, not new ones
**Solution:**
- Make sure you're editing an existing item, not creating new
- Check if `isNewItem` is false

### Issue: Comments show "Anonymous"
**Cause:** No user selected in workspace
**Solution:**
- Go to workspace and select a user from dropdown
- Verify selection persists (localStorage.getItem('currentUser'))

## Code Locations

- **Mention Configuration:** `src/components/RichEditor.tsx` lines 148-250
- **User Selector UI:** `src/views/WorkspaceView.tsx` lines 105-145
- **User Context:** `src/store/WorkspaceContext.tsx` lines 10-20
- **Auto-Save:** `src/views/WorkItemEditView.tsx` lines 35-50
- **Comment Author:** `src/views/WorkItemEditView.tsx` lines 152-158

## Next Steps If Still Not Working

1. **Enable verbose logging:**
   - Add `console.log` statements in mention render function
   - Log when onMention is called
   - Log config.users value

2. **Check TipTap version:**
   ```bash
   npm list @tiptap/react
   ```

3. **Verify all dependencies installed:**
   ```bash
   npm install
   ```

4. **Rebuild:**
   ```bash
   npm run build
   ```

5. **Check for TypeScript errors:**
   ```bash
   npm run build
   ```
