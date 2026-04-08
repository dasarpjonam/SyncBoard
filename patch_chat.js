const fs = require('fs');
const path = 'pmt-app/src/components/ChatInterface.tsx';
let content = fs.readFileSync(path, 'utf8');

// Inject live context reading into chat system prompt
content = content.replace(/const workspaceContext = buildLLMContext\(items, config, query, 3000\);/,
`const workspaceContext = buildLLMContext(items, config, query, 3000);

        let liveContext = '';
        try {
          liveContext = await window.electronAPI.readFile(\`\${workspacePath}/project_context.md\`) || '';
        } catch(e) {}
`);

content = content.replace(/const systemPrompt = \`You are an AI Program Management assistant\./,
`const systemPrompt = \`You are an AI Program Management assistant.

\${liveContext}
`);

fs.writeFileSync(path, content);
console.log('ChatInterface patched');
