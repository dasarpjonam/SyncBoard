import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WorkItem, WorkspaceConfig } from '../types';
import yaml from 'js-yaml';

interface WorkspaceContextProps {
  workspacePath: string | null;
  items: WorkItem[];
  config: WorkspaceConfig;
  apiKey: string | null;
  setWorkspacePath: (path: string | null) => void;
  setItems: (items: WorkItem[]) => void;
  addItem: (item: WorkItem) => void;
  updateItem: (item: WorkItem) => void;
  setConfig: (config: WorkspaceConfig) => void;
  setApiKey: (key: string | null) => void;
  saveConfig: (newConfig: WorkspaceConfig) => Promise<void>;
  loadWorkspace: (path: string) => Promise<void>;
}

const DEFAULT_CONFIG: WorkspaceConfig = {
  types: ['Task', 'Bug', 'Feature', 'Epic'],
  statuses: ['To Do', 'In Progress', 'In Review', 'Done'],
  users: [],
};

const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [workspacePath, setWorkspacePath] = useState<string | null>(localStorage.getItem('workspacePath'));
  const [items, setItems] = useState<WorkItem[]>([]);
  const [config, setConfig] = useState<WorkspaceConfig>(DEFAULT_CONFIG);
  const [apiKey, setApiKeyState] = useState<string | null>(localStorage.getItem('geminiApiKey'));

  const setApiKey = (key: string | null) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem('geminiApiKey', key);
    } else {
      localStorage.removeItem('geminiApiKey');
    }
  };

  const setWorkspacePathPersist = (path: string | null) => {
    setWorkspacePath(path);
    if (path) {
      localStorage.setItem('workspacePath', path);
    } else {
      localStorage.removeItem('workspacePath');
    }
  };

  const addItem = (item: WorkItem) => setItems(prev => [...prev, item]);
  const updateItem = (item: WorkItem) => setItems(prev => prev.map(i => i.id === item.id ? item : i));

  const saveConfig = async (newConfig: WorkspaceConfig) => {
    if (!workspacePath) return;
    try {
      const configYaml = yaml.dump(newConfig);
      await window.electronAPI.writeFile(`${workspacePath}/config.yaml`, configYaml);
      setConfig(newConfig);
    } catch (e) {
      console.error('Failed to save config', e);
    }
  };

  const loadWorkspace = async (path: string) => {
    try {
      setWorkspacePathPersist(path);

      // Load config
      const configContent = await window.electronAPI.readFile(`${path}/config.yaml`);
      if (configContent) {
        try {
          const loadedConfig = yaml.load(configContent) as WorkspaceConfig;
          setConfig({ ...DEFAULT_CONFIG, ...loadedConfig });
        } catch (e) {
          console.error('Invalid config.yaml', e);
          setConfig(DEFAULT_CONFIG);
        }
      } else {
        // Create default config
        await window.electronAPI.writeFile(`${path}/config.yaml`, yaml.dump(DEFAULT_CONFIG));
        setConfig(DEFAULT_CONFIG);
      }

      // We won't load items here directly to avoid circular deps with parsing, we will let the app root do it
    } catch (e) {
      console.error('Error loading workspace', e);
    }
  };

  return (
    <WorkspaceContext.Provider value={{
      workspacePath, items, config, apiKey,
      setWorkspacePath: setWorkspacePathPersist, setItems, addItem, updateItem,
      setConfig, setApiKey, saveConfig, loadWorkspace
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
};
