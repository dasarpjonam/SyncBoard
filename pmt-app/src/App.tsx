import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { WorkspaceView } from './views/WorkspaceView';
import { WorkItemEditView } from './views/WorkItemEditView';
import { SettingsView } from './views/SettingsView';
import { useWorkspace } from './store/WorkspaceContext';
import { parseMarkdownItem } from './lib/markdown';
import { ITEMS_FOLDER } from './lib/constants';
import { WorkItem } from './types';

function AppContent() {
  const { workspacePath, setItems, loadWorkspace } = useWorkspace();

  console.log('[App] Rendering with workspacePath:', workspacePath);

  useEffect(() => {
    console.log('[App] Init effect - workspacePath:', workspacePath);
    // If we have a saved path, load it on startup
    const initWorkspace = async () => {
      if (workspacePath) {
        console.log('[App] Loading workspace:', workspacePath);
        await window.electronAPI.setWorkspace(workspacePath);
        loadWorkspace(workspacePath);
      } else {
        console.log('[App] No workspace path - showing empty state');
      }
    };
    initWorkspace();
  }, []);

  useEffect(() => {
    console.log('[App] Workspace changed, loading items. Path:', workspacePath);
    // Load all work items when workspace changes
    const loadItems = async () => {
      if (!workspacePath) {
        console.log('[App] No workspace, clearing items');
        setItems([]);
        return;
      }

      try {
        const itemsPath = `${workspacePath}/${ITEMS_FOLDER}`;
        console.log('[App] Reading items directory:', itemsPath);
        
        // Ensure items directory exists
        await window.electronAPI.ensureDir(itemsPath);
        
        const files = await window.electronAPI.readDir(itemsPath);
        console.log('[App] Found files:', files);
        const parsedItems: WorkItem[] = [];

        for (const file of files) {
          const content = await window.electronAPI.readFile(`${itemsPath}/${file}`);
          if (content) {
            const item = parseMarkdownItem(file, content);
            if (item) {
              parsedItems.push(item);
            }
          }
        }

        console.log('[App] Loaded items:', parsedItems.length);
        setItems(parsedItems);
      } catch (e) {
        console.error('[App] Failed to load items', e);
      }
    };

    loadItems();
  }, [workspacePath, setItems]);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-full overflow-hidden font-sans">
        <Sidebar />

        <main className="flex-1 flex flex-col relative overflow-hidden">
          <Routes>
            <Route path="/" element={<WorkspaceView />} />
            <Route path="/workspace" element={<WorkspaceView />} />
            <Route path="/workspace/item/:itemId" element={<WorkItemEditView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </main>

        <ChatInterface />
      </div>
    </BrowserRouter>
  );
}

export default AppContent;
