#!/bin/bash

echo "==================================="
echo "Testing User Selection & @Mentions"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test workspace path
TEST_WORKSPACE="/tmp/syncboard-test-$(date +%s)"

echo "1. Creating test workspace: $TEST_WORKSPACE"
mkdir -p "$TEST_WORKSPACE"

# Create config.yaml with users
echo "2. Creating config.yaml with test users..."
cat > "$TEST_WORKSPACE/config.yaml" << 'EOF'
types:
  - Task
  - Bug
  - Feature
  - Epic
statuses:
  - To Do
  - In Progress
  - In Review
  - Done
users:
  - Alice
  - Bob
  - Charlie
  - Diana
EOF

if [ -f "$TEST_WORKSPACE/config.yaml" ]; then
  echo -e "${GREEN}✓${NC} config.yaml created with 4 users"
  echo "Users configured:"
  cat "$TEST_WORKSPACE/config.yaml" | grep -A 4 "users:"
else
  echo -e "${RED}✗${NC} Failed to create config.yaml"
  exit 1
fi

echo ""
echo "3. Creating sample work item..."
cat > "$TEST_WORKSPACE/ITEM-sample.md" << 'EOF'
---
id: ITEM-001
title: "Sample Work Item"
type: Task
status: "To Do"
createdAt: "2026-04-06T00:00:00.000Z"
updatedAt: "2026-04-06T00:00:00.000Z"
---

# Sample Work Item

This is a test work item. Try mentioning @Alice or @Bob in the description!

You can also add comments and mention users there.
EOF

if [ -f "$TEST_WORKSPACE/ITEM-sample.md" ]; then
  echo -e "${GREEN}✓${NC} Sample work item created"
else
  echo -e "${RED}✗${NC} Failed to create sample work item"
  exit 1
fi

echo ""
echo "==================================="
echo "Test Workspace Ready!"
echo "==================================="
echo ""
echo "Workspace path: $TEST_WORKSPACE"
echo ""
echo -e "${YELLOW}Manual Testing Steps:${NC}"
echo ""
echo "1. ${GREEN}USER SELECTION TEST:${NC}"
echo "   a. Open the app and load workspace: $TEST_WORKSPACE"
echo "   b. Look for the user selector in the workspace header (next to 'Workspace' title)"
echo "   c. Click on the user selector dropdown"
echo "   d. You should see: Alice, Bob, Charlie, Diana"
echo "   e. Select 'Alice'"
echo "   f. The button should now show 'Alice' instead of 'Select user'"
echo "   g. Click again - Alice should be highlighted in blue"
echo ""
echo "2. ${GREEN}@MENTION TEST IN DESCRIPTION:${NC}"
echo "   a. Click on the 'Sample Work Item' to open it"
echo "   b. Click in the description editor area"
echo "   c. Type '@' (at symbol)"
echo "   d. A dropdown should appear showing all 4 users"
echo "   e. You can type to filter: '@a' should show Alice"
echo "   f. Click on a user or press Enter to insert"
echo "   g. The mention should appear in blue with light blue background"
echo "   h. Try navigation: Up/Down arrows to select, Enter to insert"
echo ""
echo "3. ${GREEN}@MENTION TEST IN COMMENTS:${NC}"
echo "   a. Scroll down to the Comments section"
echo "   b. In the comment input field, type '@'"
echo "   c. Note: Comments use plain text, not rich text"
echo "   d. You can manually type '@Bob' - mentions in comments are plain text"
echo ""
echo "4. ${GREEN}COMMENT AUTHOR TEST:${NC}"
echo "   a. Make sure Alice is selected as current user"
echo "   b. Add a new comment: 'Test comment from Alice'"
echo "   c. Press Enter or click the arrow button"
echo "   d. The new comment should show 'Alice' as the author"
echo "   e. Change user to Bob in workspace header"
echo "   f. Add another comment"
echo "   g. This comment should show 'Bob' as the author"
echo ""
echo "5. ${GREEN}AUTO-SAVE TEST:${NC}"
echo "   a. Edit the title or description"
echo "   b. Stop typing and wait 2 seconds"
echo "   c. Look at top-left corner for auto-save indicator"
echo "   d. Should see 'Saving...' then 'Saved just now'"
echo ""
echo "==================================="
echo "Expected Results:"
echo "==================================="
echo ""
echo -e "${GREEN}✓${NC} User selector shows all 4 users"
echo -e "${GREEN}✓${NC} Selected user persists across page navigation"
echo -e "${GREEN}✓${NC} @mention dropdown appears when typing '@' in description"
echo -e "${GREEN}✓${NC} Mention dropdown can be navigated with arrow keys"
echo -e "${GREEN}✓${NC} Selected mention is inserted and highlighted in blue"
echo -e "${GREEN}✓${NC} Comments show the correct author (selected user)"
echo -e "${GREEN}✓${NC} Auto-save indicator shows in top-left corner"
echo ""
echo "==================================="
echo "Code Verification:"
echo "==================================="
echo ""

# Check if the relevant files have the necessary code
echo "Checking RichEditor.tsx for mention configuration..."
if grep -q "Mention.configure" pmt-app/src/components/RichEditor.tsx; then
  echo -e "${GREEN}✓${NC} Mention extension configured in RichEditor"
else
  echo -e "${RED}✗${NC} Missing Mention configuration"
fi

echo ""
echo "Checking WorkspaceView.tsx for user selector..."
if grep -q "setCurrentUser" pmt-app/src/views/WorkspaceView.tsx; then
  echo -e "${GREEN}✓${NC} User selector implemented in WorkspaceView"
else
  echo -e "${RED}✗${NC} Missing user selector code"
fi

echo ""
echo "Checking WorkspaceContext.tsx for currentUser state..."
if grep -q "currentUser" pmt-app/src/store/WorkspaceContext.tsx; then
  echo -e "${GREEN}✓${NC} currentUser state in WorkspaceContext"
else
  echo -e "${RED}✗${NC} Missing currentUser in context"
fi

echo ""
echo "Checking WorkItemEditView.tsx for auto-save..."
if grep -q "useAutoSave" pmt-app/src/views/WorkItemEditView.tsx; then
  echo -e "${GREEN}✓${NC} Auto-save hook implemented"
else
  echo -e "${RED}✗${NC} Missing auto-save implementation"
fi

echo ""
echo "==================================="
echo "Ready to Test!"
echo "==================================="
echo ""
echo "Run: cd pmt-app && npm run dev"
echo "Then load workspace: $TEST_WORKSPACE"
echo ""
