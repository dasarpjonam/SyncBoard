#!/bin/bash
# Test script for AI Assist and Work Item Context features

echo "🧪 Testing AI Assist & Work Item Context"
echo "========================================"
echo ""

# Check if required changes exist
echo "📁 Checking changes..."

echo ""
echo "1️⃣ Checking 'AI Assist' button renaming..."

if grep -q "'AI Assist'" src/components/RichEditor.tsx; then
  echo "✅ Button text changed to 'AI Assist'"
else
  echo "❌ Button text not changed"
  exit 1
fi

if grep -q 'title="AI Assist (Cmd/Ctrl + K)"' src/components/RichEditor.tsx; then
  echo "✅ Tooltip updated to 'AI Assist'"
else
  echo "❌ Tooltip not updated"
  exit 1
fi

# Count occurrences (should be 2 - one for rich text, one for markdown)
count=$(grep -c "'AI Assist'" src/components/RichEditor.tsx)
if [ "$count" -eq 2 ]; then
  echo "✅ Both editor modes updated (Rich Text + Markdown)"
else
  echo "⚠️  Expected 2 occurrences, found $count"
fi

echo ""
echo "2️⃣ Checking ChatInterface work item context..."

if grep -q "currentWorkItem?: WorkItem" src/components/ChatInterface.tsx; then
  echo "✅ ChatInterface accepts currentWorkItem prop"
else
  echo "❌ ChatInterface prop not added"
  exit 1
fi

if grep -q "CURRENTLY VIEWING WORK ITEM:" src/components/ChatInterface.tsx; then
  echo "✅ Work item context added to system prompt"
else
  echo "❌ Work item context not in system prompt"
  exit 1
fi

if grep -q "When the user asks about \"this item\"" src/components/ChatInterface.tsx; then
  echo "✅ Context awareness instruction added"
else
  echo "❌ Context awareness instruction missing"
  exit 1
fi

echo ""
echo "3️⃣ Checking App.tsx integration..."

if grep -q "function ChatWithContext" src/App.tsx; then
  echo "✅ ChatWithContext wrapper created"
else
  echo "❌ ChatWithContext wrapper not found"
  exit 1
fi

if grep -q "useLocation" src/App.tsx; then
  echo "✅ useLocation hook imported"
else
  echo "❌ useLocation hook not imported"
  exit 1
fi

if grep -q "currentWorkItem={currentWorkItem}" src/App.tsx; then
  echo "✅ currentWorkItem prop passed to ChatInterface"
else
  echo "❌ currentWorkItem prop not passed"
  exit 1
fi

echo ""
echo "4️⃣ Checking TypeScript compilation..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ TypeScript compiles without errors"
else
  echo "❌ TypeScript compilation errors detected"
  echo "   Run 'npm run build' to see details"
  exit 1
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "📋 Manual Testing Instructions:"
echo "================================"
echo ""
echo "Test 1: AI Assist Button Rename"
echo "--------------------------------"
echo "1. Start the app: npm run dev"
echo "2. Open or create a work item"
echo "3. Check Rich Text editor toolbar"
echo "   → Should see '✨ AI Assist' button (not 'Autofill')"
echo "4. Switch to Markdown view"
echo "   → Should also see '✨ AI Assist' button"
echo "5. Hover over button"
echo "   → Tooltip should say 'AI Assist (Cmd/Ctrl + K)'"
echo ""
echo "Test 2: Work Item Context in Chat"
echo "----------------------------------"
echo "1. Configure LLM API key in Settings (if not done)"
echo "2. Open an existing work item (not new)"
echo "3. Note the item's title, status, and content"
echo "4. Open chat interface (right sidebar)"
echo "5. Ask: 'What is this item about?'"
echo "   → Should describe the current work item"
echo "6. Ask: 'What's the status of this item?'"
echo "   → Should correctly state the status"
echo "7. Ask: 'Update this item to In Progress'"
echo "   → Should update the current work item (not create new)"
echo "8. Navigate to workspace view (no item open)"
echo "9. Ask in chat: 'What is this item?'"
echo "   → Should say no specific item is open"
echo ""
echo "Test 3: Context Switching"
echo "-------------------------"
echo "1. Open Work Item A"
echo "2. Ask in chat: 'Summarize this item'"
echo "   → Should summarize Item A"
echo "3. Navigate to Work Item B"
echo "4. Ask in chat: 'Summarize this item'"
echo "   → Should now summarize Item B (different content)"
echo "5. Create a new item"
echo "6. Chat should work but no 'current item' context"
echo ""
echo "✨ Changes implemented:"
echo "  • Button renamed: 'Autofill' → 'AI Assist'"
echo "  • Chat receives current work item context"
echo "  • Context includes: ID, title, type, status, assignee, content"
echo "  • Chat understands 'this item' references"
echo "  • Context updates automatically when switching items"
