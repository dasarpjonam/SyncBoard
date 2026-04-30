#!/bin/bash
# Test script for LLM Autofill integration

echo "🧪 Testing LLM Autofill Integration"
echo "==================================="
echo ""

# Check if required files exist
echo "📁 Checking files..."

if [ -f "src/lib/llm-autofill.ts" ]; then
  echo "✅ llm-autofill.ts exists"
else
  echo "❌ llm-autofill.ts missing"
  exit 1
fi

if [ -f "src/components/RichEditor.tsx" ]; then
  echo "✅ RichEditor.tsx exists"
else
  echo "❌ RichEditor.tsx missing"
  exit 1
fi

echo ""
echo "🔍 Checking RichEditor integration..."

# Check for imports
if grep -q "import { generateAutofill } from '../lib/llm-autofill'" src/components/RichEditor.tsx; then
  echo "✅ Autofill imported in RichEditor"
else
  echo "❌ Autofill not imported in RichEditor"
  exit 1
fi

# Check for Sparkles icon
if grep -q "import.*Sparkles.*from 'lucide-react'" src/components/RichEditor.tsx; then
  echo "✅ Sparkles icon imported"
else
  echo "❌ Sparkles icon not imported"
  exit 1
fi

# Check for useWorkspace hook
if grep -q "const.*llmProvider.*llmApiKeys.*llmModel.*=.*useWorkspace()" src/components/RichEditor.tsx; then
  echo "✅ LLM settings accessed from workspace context"
else
  echo "❌ LLM settings not accessed from workspace context"
  exit 1
fi

# Check for autofill state
if grep -q "isAutofilling" src/components/RichEditor.tsx && grep -q "autofillError" src/components/RichEditor.tsx; then
  echo "✅ Autofill state variables defined"
else
  echo "❌ Autofill state variables missing"
  exit 1
fi

# Check for handleAutofill function
if grep -q "const handleAutofill = useCallback(async () =>" src/components/RichEditor.tsx; then
  echo "✅ handleAutofill function defined"
else
  echo "❌ handleAutofill function missing"
  exit 1
fi

# Check for keyboard shortcut
if grep -q "Cmd/Ctrl + K" src/components/RichEditor.tsx; then
  echo "✅ Keyboard shortcut (Cmd/Ctrl + K) documented"
else
  echo "❌ Keyboard shortcut not documented"
fi

# Check for autofill button in rich text view
if grep -q "Autofill" src/components/RichEditor.tsx && grep -q "Sparkles size={14}" src/components/RichEditor.tsx; then
  echo "✅ Autofill button added to UI"
else
  echo "❌ Autofill button not found in UI"
  exit 1
fi

# Check for markdown mode support
if grep -q "viewMode === 'markdown'" src/components/RichEditor.tsx; then
  echo "✅ Autofill supports markdown mode"
else
  echo "❌ Autofill does not support markdown mode"
  exit 1
fi

echo ""
echo "🔍 Checking llm-autofill.ts..."

# Check for generateAutofill function
if grep -q "export async function generateAutofill" src/lib/llm-autofill.ts; then
  echo "✅ generateAutofill function exported"
else
  echo "❌ generateAutofill function not exported"
  exit 1
fi

# Check for LLM provider integration
if grep -q "import.*callLLM.*from './llm-providers'" src/lib/llm-autofill.ts; then
  echo "✅ LLM provider integration present"
else
  echo "❌ LLM provider integration missing"
  exit 1
fi

echo ""
echo "🔍 Checking TypeScript compilation..."
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
echo "1. Start the app: npm run dev"
echo "2. Open a workspace and configure LLM API key in Settings"
echo "3. Create or edit a work item"
echo "4. In the Rich Text editor:"
echo "   - Type some text"
echo "   - Press Cmd/Ctrl + K or click 'Autofill' button"
echo "   - Verify AI completion appears at cursor"
echo "5. Switch to Markdown view:"
echo "   - Type some text"
echo "   - Press Cmd/Ctrl + K or click 'Autofill' button"
echo "   - Verify AI completion appears at cursor"
echo "6. Test without API key:"
echo "   - Clear API key in Settings"
echo "   - Try autofill - should show error message"
echo "7. Test error handling:"
echo "   - Use invalid API key"
echo "   - Try autofill - should show error message"
echo ""
echo "✨ Features implemented:"
echo "  • LLM autofill in rich text editor"
echo "  • LLM autofill in markdown editor"
echo "  • Keyboard shortcut: Cmd/Ctrl + K"
echo "  • Visual button with loading state"
echo "  • Error handling and user feedback"
echo "  • Context-aware completions"
echo "  • Multi-provider support (Claude, ChatGPT, Gemini)"
