const fs = require('fs');

const filePath = 'pmt-app/src/views/WorkItemEditView.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add callLLM import
content = content.replace(
  "import { ArrowLeft, Save, Trash2, MessageSquare, User, Calendar, Tag, Folder, FileText, Layout } from 'lucide-react';",
  "import { ArrowLeft, Save, Trash2, MessageSquare, User, Calendar, Tag, Folder, FileText, Layout, Paperclip, Sparkles, X } from 'lucide-react';\nimport { callLLM, LLMMessage } from '../lib/llm-providers';"
);

// 2. Destructure llm properties
content = content.replace(
  "const { config, items, workspacePath, updateItem, deleteItem, addItem, currentUser } = useWorkspace();",
  "const { config, items, workspacePath, updateItem, deleteItem, addItem, currentUser, llmProvider, llmApiKeys, llmModel } = useWorkspace();"
);

// 3. Add state
content = content.replace(
  "const [textContent, setTextContent] = useState('');",
  "const [textContent, setTextContent] = useState('');\n  const [isExtracting, setIsExtracting] = useState(false);"
);

// 4. Add attachments array to new item defaults
content = content.replace(
  "comments: [],\n      };",
  "comments: [],\n        attachments: [],\n      };"
);

// 5. Add handlers
const handlers = `
  const handleExtractTasks = async () => {
    const apiKey = llmApiKeys?.[llmProvider];
    if (!apiKey) return alert('No LLM API key configured. Please configure it in Settings.');
    
    setIsExtracting(true);
    try {
      const systemPrompt = "You are an AI assistant. Extract actionable items from these meeting notes. Return ONLY a valid JSON array of objects with 'title' (short task title) and 'assignee' (username if clearly assigned). No markdown blocks around the JSON.";
      const messages: LLMMessage[] = [{ role: 'user', content: formData.content || '' }];
      
      const response = await callLLM({ provider: llmProvider, apiKey, model: llmModel || undefined }, messages, systemPrompt);
      
      let extracted = [];
      try {
        let text = response.content.trim();
        if (text.startsWith('\`\`\`json')) text = text.replace(/\`\`\`json/g, '');
        text = text.replace(/\`\`\`/g, '').trim();
        extracted = JSON.parse(text);
      } catch(e) {
         console.error(e);
         return alert('Failed to parse AI response. Response was: ' + response.content);
      }
      
      if (!Array.isArray(extracted) || extracted.length === 0) return alert('No tasks found');
      
      let createdCount = 0;
      for (const task of extracted) {
         if (!task.title) continue;
         const newItem: WorkItem = {
            id: generateWorkItemId(items),
            title: task.title,
            type: 'Task',
            status: config.statuses[0] || 'To Do',
            assignee: task.assignee || '',
            content: \`Extracted from Meeting Note: \${formData.title}\`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            fileName: '',
            parentId: existingItem?.id,
            comments: []
         };
         newItem.fileName = \`\${newItem.id}.md\`;
         
         const markdown = serializeMarkdownItem(newItem);
         await window.electronAPI.writeFile(\`\${workspacePath}/items/\${newItem.fileName}\`, markdown);
         addItem(newItem);
         createdCount++;
      }
      alert(\`Successfully created \${createdCount} tasks from the meeting notes.\`);
    } catch (error) {
       console.error(error);
       alert('Failed to extract tasks. See console for details.');
    } finally {
       setIsExtracting(false);
    }
  };

  const handleAddAttachment = async () => {
    if (!workspacePath) return;
    const filePath = await window.electronAPI.openFile();
    if (!filePath) return;
    
    // Require saving the item first to have a valid ID directory
    if (!existingItem) {
      alert("Please save this new item first before adding attachments.");
      return;
    }
    
    const fileNameMatch = filePath.match(/[^\\\\/]+$/);
    const fileName = fileNameMatch ? fileNameMatch[0] : 'attachment.file';
    
    const relativeDestPath = \`attachments/\${existingItem.id}/\${fileName}\`;
    const absoluteDestPath = \`\${workspacePath}/.syncboard/\${relativeDestPath}\`;
    
    const success = await window.electronAPI.copyFile(filePath, absoluteDestPath);
    if (success) {
      const newAttachments = [...(formData.attachments || []), relativeDestPath];
      setFormData({ ...formData, attachments: newAttachments });
      // Trigger autosave
      handleAutoSave({ ...formData, attachments: newAttachments });
    } else {
      alert("Failed to copy attachment file.");
    }
  };

  const handleOpenAttachment = async (attachmentPath: string) => {
    if (!workspacePath) return;
    const absolutePath = \`\${workspacePath}/.syncboard/\${attachmentPath}\`;
    await window.electronAPI.openPath(absolutePath);
  };
  
  const handleRemoveAttachment = (indexToRemove: number) => {
    const newAttachments = formData.attachments?.filter((_, i) => i !== indexToRemove) || [];
    setFormData({ ...formData, attachments: newAttachments });
    handleAutoSave({ ...formData, attachments: newAttachments });
  };
`;

content = content.replace(
  "if (!formData.title && !isNewItem && !existingItem)",
  handlers + "\n  if (!formData.title && !isNewItem && !existingItem)"
);

// 6. UI Additions
// Extract action items button next to AutoSaveIndicator
const extractButtonUI = `
          {formData.type === 'Meeting Note' && !isNewItem && (
            <button
              onClick={handleExtractTasks}
              disabled={isExtracting}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50"
            >
              <Sparkles size={16} />
              {isExtracting ? 'Extracting...' : 'Extract Tasks'}
            </button>
          )}
`;

content = content.replace(
  "{!isNewItem && <AutoSaveIndicator status={autoSaveStatus} lastSavedAt={lastSavedAt} error={autoSaveError} />}",
  "{!isNewItem && <AutoSaveIndicator status={autoSaveStatus} lastSavedAt={lastSavedAt} error={autoSaveError} />}" + extractButtonUI
);

// Attachments UI after Comments section
const attachmentsUI = `
          {/* Attachments */}
          <div className="mb-12 border-t border-gray-100 pt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Paperclip size={18} />
                Attachments
                {formData.attachments && formData.attachments.length > 0 && (
                  <span className="text-gray-400 font-normal">({formData.attachments.length})</span>
                )}
              </h2>
              <button
                onClick={handleAddAttachment}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                + Add File
              </button>
            </div>

            {formData.attachments && formData.attachments.length > 0 ? (
              <div className="flex flex-col gap-2">
                {formData.attachments.map((attachment, index) => {
                  const filename = attachment.split(/[\\\\/]/).pop() || attachment;
                  return (
                    <div key={index} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg group">
                      <button 
                        onClick={() => handleOpenAttachment(attachment)}
                        className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors text-left flex-1"
                      >
                        <FileText size={16} className="text-gray-400" />
                        <span className="text-sm font-medium truncate max-w-md">{filename}</span>
                      </button>
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-all"
                        title="Remove attachment"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No files attached yet</p>
            )}
          </div>
`;

content = content.replace(
  "{/* Metadata - Subtle Footer */}",
  attachmentsUI + "\n          {/* Metadata - Subtle Footer */}"
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('WorkItemEditView.tsx patched successfully');
