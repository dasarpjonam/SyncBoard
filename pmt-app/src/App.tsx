import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { BoardView } from './views/BoardView';
import { SettingsView } from './views/SettingsView';
import { useWorkspace } from './store/WorkspaceContext';
import { parseMarkdownItem } from './lib/markdown';
import { WorkItem } from './types';

function AppContent() {
  const { workspacePath, setItems, loadWorkspace } = useWorkspace();

  useEffect(() => {
    // If we have a saved path, load it on startup
    if (workspacePath) {
      loadWorkspace(workspacePath);
    }
  }, []);

  useEffect(() => {
    // Load all work items when workspace changes
    const loadItems = async () => {
      if (!workspacePath) {
        setItems([]);
        return;
      }

      try {
        const files = await window.electronAPI.readDir(workspacePath);
        const parsedItems: WorkItem[] = [];

        for (const file of files) {
          const content = await window.electronAPI.readFile(`${workspacePath}/${file}`);
          if (content) {
            const item = parseMarkdownItem(file, content);
            if (item) {
              parsedItems.push(item);
            }
          }
        }

        setItems(parsedItems);
      } catch (e) {
        console.error('Failed to load items', e);
      }
    };

    loadItems();
  }, [workspacePath, setItems]);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-full overflow-hidden font-sans">
        <Sidebar />

        <main className="flex-grow flex relative">
          <Routes>
            <Route path="/" element={<BoardView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </main>

        <ChatInterface />
      </div>
    </BrowserRouter>
  );
}

export default AppContent;
