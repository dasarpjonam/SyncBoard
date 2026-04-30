import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { WorkspaceView } from './views/WorkspaceView';
import { WorkItemEditView } from './views/WorkItemEditView';
import { SettingsView } from './views/SettingsView';
import { LockScreen } from './components/LockScreen';
import { useWorkspace } from './store/WorkspaceContext';
import { parseMarkdownItem } from './lib/markdown';
import { ITEMS_FOLDER } from './lib/constants';
import { WorkItem, User } from './types';

// Wrapper component to access route context for ChatInterface
function ChatWithContext() {
  const location = useLocation();
  const { items } = useWorkspace();
  
  // Extract item ID from path if we're on a work item page
  const match = location.pathname.match(/\/workspace\/item\/([^/]+)/);
  const itemId = match ? match[1] : null;
  
  // Find the current work item if we have an ID
  const currentWorkItem = itemId && itemId !== 'new' 
    ? items.find(item => item.id === itemId) 
    : undefined;
  
  return <ChatInterface currentWorkItem={currentWorkItem} />;
}

function AppContent() {
  const { 
    workspacePath, setItems, loadWorkspace, 
    isLocked, unlockWorkspace, checkWorkspaceAuth 
  } = useWorkspace();
  const [authRequired, setAuthRequired] = useState<boolean | null>(null);
  const [requirePassword, setRequirePassword] = useState(false);

  console.log('[App] Rendering with workspacePath:', workspacePath);

  // Check if workspace requires authentication
  useEffect(() => {
    const checkAuth = async () => {
      if (!workspacePath) {
        setAuthRequired(false);
        return;
      }

      const authConfig = await checkWorkspaceAuth(workspacePath);
      if (authConfig && authConfig.enabled) {
        setAuthRequired(true);
        setRequirePassword(authConfig.requirePassword);
      } else {
        setAuthRequired(false);
      }
    };

    checkAuth();
  }, [workspacePath, checkWorkspaceAuth]);

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

  const handleUnlock = (user: User) => {
    unlockWorkspace(user);
  };

  // Show lock screen if workspace requires auth and is locked, OR if auth state is still loading (null)
  // This prevents briefly showing unlocked content before auth check completes
  if (workspacePath && (authRequired === null || (authRequired && isLocked))) {
    return (
      <div className="h-screen w-full">
        <LockScreen
          workspacePath={workspacePath}
          requirePassword={requirePassword}
          onUnlock={handleUnlock}
        />
      </div>
    );
  }

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

        <ChatWithContext />
      </div>
    </BrowserRouter>
  );
}

export default AppContent;
