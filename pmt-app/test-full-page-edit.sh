#!/bin/bash

# Test script for full-page editing feature
echo "🧪 Testing Full-Page Work Item Editing Feature"
echo "=============================================="
echo ""

# Build the application
echo "📦 Building application..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build successful"
echo ""

# Check if key files exist
echo "📁 Checking file structure..."
FILES=(
  "src/views/WorkItemEditView.tsx"
  "src/views/WorkspaceView.tsx"
  "src/App.tsx"
  "src/components/BoardSection.tsx"
  "src/components/ListSection.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file exists"
  else
    echo "❌ $file missing"
    exit 1
  fi
done
echo ""

# Check routes in App.tsx
echo "🔍 Verifying routes in App.tsx..."
if grep -q "path=\"/workspace/item/:itemId\"" src/App.tsx; then
  echo "✅ Edit route configured"
else
  echo "❌ Edit route missing"
  exit 1
fi

if grep -q "WorkItemEditView" src/App.tsx; then
  echo "✅ WorkItemEditView imported"
else
  echo "❌ WorkItemEditView not imported"
  exit 1
fi
echo ""

# Check navigation in WorkspaceView
echo "🔍 Verifying navigation in WorkspaceView.tsx..."
if grep -q "navigate" src/views/WorkspaceView.tsx; then
  echo "✅ Navigation logic present"
else
  echo "❌ Navigation logic missing"
  exit 1
fi

if ! grep -q "WorkItemModal" src/views/WorkspaceView.tsx; then
  echo "✅ Modal removed (using full-page view)"
else
  echo "⚠️  Modal still present (might need cleanup)"
fi
echo ""

# Check WorkItemEditView structure
echo "🔍 Verifying WorkItemEditView.tsx..."
if grep -q "useNavigate" src/views/WorkItemEditView.tsx; then
  echo "✅ Uses navigation"
else
  echo "❌ Missing navigation hook"
  exit 1
fi

if grep -q "useParams" src/views/WorkItemEditView.tsx; then
  echo "✅ Uses route params"
else
  echo "❌ Missing params hook"
  exit 1
fi

if grep -q "RichEditor" src/views/WorkItemEditView.tsx; then
  echo "✅ Rich editor integrated"
else
  echo "❌ Rich editor missing"
  exit 1
fi

if grep -q "Comments" src/views/WorkItemEditView.tsx || grep -q "comments" src/views/WorkItemEditView.tsx; then
  echo "✅ Comments section present"
else
  echo "⚠️  Comments might be missing"
fi
echo ""

echo "=============================================="
echo "✅ All checks passed!"
echo ""
echo "📝 Manual Testing Steps:"
echo "1. Run: npm run dev"
echo "2. Open a workspace"
echo "3. Click 'New Item' - should navigate to /workspace/item/new"
echo "4. Fill in details and save"
echo "5. Click on an existing item - should navigate to /workspace/item/{id}"
echo "6. Edit and save"
echo "7. Add comments in the integrated section"
echo "8. Verify back button returns to workspace"
echo ""
