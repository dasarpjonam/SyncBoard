# LLM Autofill - Quick Start Guide

## What is it?

AI-powered text completion that helps you write faster. The AI reads what you've written and generates relevant continuations.

## Setup (One-time)

1. Click **Settings** in the sidebar
2. Scroll to **LLM Configuration**
3. Choose your AI provider:
   - **Claude (Anthropic)** - Most creative
   - **ChatGPT (OpenAI)** - Balanced
   - **Gemini (Google)** - Fast and efficient
4. Enter your API key
5. (Optional) Select a specific model

## How to Use

### Method 1: Keyboard Shortcut ⌨️
1. Type some text
2. Put your cursor where you want AI to continue
3. Press **Cmd + K** (Mac) or **Ctrl + K** (Windows/Linux)
4. Wait 1-3 seconds for completion
5. Keep or edit the generated text

### Method 2: Button Click 🖱️
1. Type some text
2. Put your cursor where you want AI to continue
3. Click the **✨ Autofill** button at the top
4. Wait for completion
5. Keep or edit the generated text

## Tips for Best Results

### ✅ Good Examples

**Continuing a thought:**
```
I think we should focus on improving performance because [CURSOR]
```
→ AI might complete: "users are reporting slow load times and this impacts retention"

**Writing lists:**
```
Next steps:
- Review the design
- [CURSOR]
```
→ AI might complete: "Implement core features\n- Test with users"

**Expanding ideas:**
```
The main challenge is [CURSOR]
```
→ AI might complete: "balancing feature complexity with user experience"

### ❌ Avoid These

- Empty documents (AI needs context)
- Very beginning of document (write 1-2 sentences first)
- Mid-word (put cursor at word boundary)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Button is greyed out | Go to Settings and add your API key |
| "Please configure your LLM API key" | Add API key in Settings |
| "Autofill failed" error | Check your API key is valid and has credits |
| Nothing happens | Check internet connection, try again |
| Completion doesn't make sense | Provide more context before the cursor |

## Works In Both Modes

- **🎨 Rich Text**: Full formatting, images, links
- **📝 Markdown**: Plain text, markdown syntax

Same keyboard shortcut and button in both!

## Privacy & Security

- Your API key stays on your device
- Only the text in your editor is sent to the AI
- No work item metadata is shared
- Works offline-first (only AI call needs internet)

## Getting API Keys

### Claude (Anthropic)
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create new key
5. Copy and paste into SyncBoard Settings

### ChatGPT (OpenAI)
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Go to API Keys section
4. Create new secret key
5. Copy and paste into SyncBoard Settings

### Gemini (Google)
1. Go to https://aistudio.google.com/
2. Sign up or log in
3. Get API key
4. Copy and paste into SyncBoard Settings

## Cost Considerations

- Each autofill uses ~500 tokens (very cheap)
- Example costs (approximate):
  - Claude: $0.001 - $0.003 per autofill
  - ChatGPT: $0.0005 - $0.0015 per autofill
  - Gemini: $0.0001 - $0.0003 per autofill
- 1000 autofills ≈ $0.50 - $3.00 depending on provider

## Keyboard Shortcuts Reference

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Autofill | Cmd + K | Ctrl + K |
| Cancel error | Wait 5 sec | Wait 5 sec |

---

**Need help?** Check the full documentation at [docs/features/LLM_AUTOFILL.md](LLM_AUTOFILL.md)
