# New Features Added

## 1. Auto-Save for Work Items

### Description
Work items now automatically save as you edit them, eliminating the need to manually save after every change.

### How It Works
- **Auto-save delay**: 2 seconds after you stop typing
- **Visual indicator**: Shows "Saving..." → "Saved X seconds ago" in the top left of the edit page
- **Only for existing items**: New items still require manual save (using the Save button)
- **Prevents data loss**: All changes are automatically persisted to disk

### Where to See It
1. Navigate to any existing work item by clicking it from the workspace
2. Start editing the title, description, properties, or comments
3. Watch the top-left corner for the auto-save indicator
4. Stop typing and wait 2 seconds - you'll see "Saving..." then "Saved just now"

### Technical Implementation
- Uses `useAutoSave` hook from `AutoSaveIndicator.tsx`
- Debounced save function with 2-second delay
- Updates the Markdown file and context automatically
- Non-blocking: continues to work while saving in background

---

## 2. @Mentions in Description and Comments

### Description
You can now mention team members in work item descriptions and comments using the `@` symbol.

### How It Works
- Type `@` in the rich text editor (description field)
- A dropdown menu appears with available users from your workspace configuration
- Select a user from the list or continue typing to filter
- The mention is highlighted in blue with a light blue background
- Mentions are stored in the Markdown format as `@username`

### Where to See It
1. Edit or create a work item
2. In the description editor, type `@`
3. A popup menu shows all configured users
4. Click a user or press Enter to insert the mention
5. The mentioned user appears highlighted

### Configuration
- Users are defined in `config.yaml` in your workspace
- Add users to the `users` array to make them available for mentions
- Example in `config.yaml`:
  ```yaml
  users:
    - Alice
    - Bob
    - Charlie
  ```

### Technical Implementation
- Uses TipTap's `Mention` extension
- Custom suggestion rendering with dropdown UI
- Styled with `mention` class: blue text on light blue background
- Works in both description and comment fields

---

## 3. User Selection in Workspace

### Description
You can now select which user you represent in the workspace, and this identity is used throughout the application.

### How It Works
- **User selector**: Located in the workspace header next to "Workspace" title
- **Persistent**: Your selection is saved in localStorage and persists across sessions
- **Used for comments**: When you add a comment, it's automatically attributed to your selected user
- **Default**: If no user is selected, comments are attributed to "Anonymous"

### Where to See It
1. Open the workspace view
2. Look for the user selector button in the top-left (next to "Workspace" title)
3. Click it to see a dropdown of available users
4. Select your user - it will be saved automatically
5. The button shows your current user or "Select user" if none chosen

### User-Specific Features
- **Comment attribution**: All comments you add show your selected username
- **Future features**: Can be extended for filtering "My Items", task assignments, etc.

### Configuration
Same as mentions - users must be configured in `config.yaml`:
```yaml
users:
  - Alice
  - Bob
  - Charlie
```

### Technical Implementation
- New `currentUser` state in `WorkspaceContext`
- Persisted to localStorage as `'currentUser'`
- Accessible via `useWorkspace()` hook throughout the app
- User selector component in `WorkspaceView.tsx`

---

## Testing the Features

### Test Auto-Save:
1. Open an existing work item
2. Edit the title or description
3. Wait 2 seconds without typing
4. See "Saved just now" indicator
5. Refresh the page - changes should persist

### Test @Mentions:
1. Configure users in `config.yaml` if not already done
2. Edit a work item description
3. Type `@` and see the dropdown
4. Select a user
5. See the mention highlighted in blue

### Test User Selection:
1. Click the user selector in workspace header
2. Choose your user from the dropdown
3. Edit a work item and add a comment
4. Verify the comment shows your selected username
5. Close and reopen the app - your user should still be selected

---

## Example Workflow

1. **Set your identity**: Click user selector → Choose "Alice"
2. **Create/Edit a work item**: Add a description with "@Bob please review this"
3. **Edit continues**: Make more changes to title or content
4. **Auto-save works**: See "Saved 3s ago" - no manual save needed
5. **Add a comment**: Type "Ready for review" → Comment shows "Alice" as author
6. **Collaborate**: Bob sees the mention and your comment with attribution

---

## Files Modified

### Core Changes:
- `src/store/WorkspaceContext.tsx`: Added `currentUser` state and `setCurrentUser` function
- `src/views/WorkItemEditView.tsx`: Added auto-save with indicator, updated comment author
- `src/views/WorkspaceView.tsx`: Added user selector dropdown in header
- `src/components/AutoSaveIndicator.tsx`: Updated `useAutoSave` to accept nullable values
- `src/components/RichEditor.tsx`: Already had mention support configured

### UI Components:
- User selector dropdown with icon and chevron
- Auto-save indicator with status (saving/saved/error)
- Mention dropdown with user suggestions

---

## Future Enhancements

### Possible additions:
- **Notification on mention**: Alert users when they're mentioned
- **My work filter**: Show only items assigned to current user
- **Mention extraction**: Parse and list all mentions in a work item
- **Comment threading**: Reply to specific comments
- **Rich mentions**: Show user avatar next to mention
- **@channel or @everyone**: Mention entire team
- **Auto-save conflicts**: Detect if multiple users edit same item
