import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WorkItem, WorkspaceConfig } from '../types';
import { buildTree, getDescendants } from '../lib/hierarchy';
import { LLMProvider } from '../lib/llm-providers';
import { ITEMS_FOLDER } from '../lib/constants';
import yaml from 'js-yaml';

interface WorkspaceContextProps {
  workspacePath: string | null;
  items: WorkItem[];
  itemsTree: WorkItem[];
  config: WorkspaceConfig;
  apiKey: string | null; // Legacy - kept for backward compatibility
  llmProvider: LLMProvider;
  llmApiKeys: Record<LLMProvider, string>;
  llmModel: string | null;
  currentUser: string | null;
  setWorkspacePath: (path: string | null) => void;
  setItems: (items: WorkItem[]) => void;
  addItem: (item: WorkItem, parentId?: string) => void;
  updateItem: (item: WorkItem) => void;
  deleteItem: (id: string, deletecascade?: boolean) => Promise<boolean>;
  changeParent: (itemId: string, newParentId: string | null) => Promise<boolean>;
  setConfig: (config: WorkspaceConfig) => void;
  setApiKey: (key: string | null) => void; // Legacy
  setLLMProvider: (provider: LLMProvider) => void;
  setLLMApiKey: (provider: LLMProvider, key: string) => void;
  setLLMModel: (model: string | null) => void;
  setCurrentUser: (user: string | null) => void;
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
  const [itemsTree, setItemsTree] = useState<WorkItem[]>([]);
  const [config, setConfig] = useState<WorkspaceConfig>(DEFAULT_CONFIG);
  const [apiKey, setApiKeyState] = useState<string | null>(localStorage.getItem('geminiApiKey'));
  const [llmProvider, setLLMProviderState] = useState<LLMProvider>(() => {
    return (localStorage.getItem('llmProvider') as LLMProvider) || 'gemini';
  });
  const [llmApiKeys, setLLMApiKeys] = useState<Record<LLMProvider, string>>(() => {
    return {
      claude: localStorage.getItem('llmApiKey_claude') || '',
      chatgpt: localStorage.getItem('llmApiKey_chatgpt') || '',
      gemini: localStorage.getItem('llmApiKey_gemini') || localStorage.getItem('geminiApiKey') || ''
    };
  });
  const [llmModel, setLLMModelState] = useState<string | null>(localStorage.getItem('llmModel'));
  const [currentUser, setCurrentUserState] = useState<string | null>(localStorage.getItem('currentUser'));

  // Update tree whenever items change
  useEffect(() => {
    setItemsTree(buildTree(items));
  }, [items]);

  const setApiKey = (key: string | null) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem('geminiApiKey', key);
      // Also update the llmApiKeys for gemini
      setLLMApiKey('gemini', key);
    } else {
      localStorage.removeItem('geminiApiKey');
    }
  };

  const setLLMProvider = (provider: LLMProvider) => {
    setLLMProviderState(provider);
    localStorage.setItem('llmProvider', provider);
  };

  const setLLMApiKey = (provider: LLMProvider, key: string) => {
    setLLMApiKeys(prev => {
      const updated = { ...prev, [provider]: key };
      localStorage.setItem(`llmApiKey_${provider}`, key);
      return updated;
    });
  };

  const setLLMModel = (model: string | null) => {
    setLLMModelState(model);
    if (model) {
      localStorage.setItem('llmModel', model);
    } else {
      localStorage.removeItem('llmModel');
    }
  };

  const setCurrentUser = (user: string | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('currentUser', user);
    } else {
      localStorage.removeItem('currentUser');
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

  const addItem = (item: WorkItem, parentId?: string) => {
    const newItem = parentId ? { ...item, parentId } : item;
    setItems(prev => [...prev, newItem]);
  };
  
  const updateItem = (item: WorkItem) => setItems(prev => prev.map(i => i.id === item.id ? item : i));
  
  const deleteItem = async (id: string, cascade: boolean = true): Promise<boolean> => {
    if (!workspacePath) return false;
    const item = items.find(i => i.id === id);
    if (!item) return false;
    
    try {
      // Get all items to delete (item + descendants if cascade)
      const itemsToDelete: string[] = [id];
      
      if (cascade) {
        const tree = buildTree(items);
        const findInTree = (items: WorkItem[]): WorkItem | undefined => {
          for (const i of items) {
            if (i.id === id) return i;
            if (i.children) {
              const found = findInTree(i.children);
              if (found) return found;
            }
          }
          return undefined;
        };
        
        const itemInTree = findInTree(tree);
        if (itemInTree) {
          const descendants = getDescendants(itemInTree);
          itemsToDelete.push(...descendants.map(d => d.id));
        }
      }
      
      // Delete all files
      const deletePromises = itemsToDelete.map(async (itemId) => {
        const itemToDelete = items.find(i => i.id === itemId);
        if (itemToDelete) {
          const filePath = `${workspacePath}/${ITEMS_FOLDER}/${itemToDelete.fileName}`;
          return window.electronAPI.deleteFile(filePath);
        }
        return false;
      });
      
      const results = await Promise.all(deletePromises);
      const allSucceeded = results.every(r => r);
      
      if (allSucceeded) {
        setItems(prev => prev.filter(i => !itemsToDelete.includes(i.id)));
      }
      
      return allSucceeded;
    } catch (error) {
      console.error('Failed to delete item', error);
      return false;
    }
  };

  const changeParent = async (itemId: string, newParentId: string | null): Promise<boolean> => {
    if (!workspacePath) return false;
    const item = items.find(i => i.id === itemId);
    if (!item) return false;
    
    try {
      const updatedItem: WorkItem = {
        ...item,
        parentId: newParentId || undefined,
        updatedAt: new Date().toISOString()
      };
      
      const { serializeMarkdownItem } = await import('../lib/markdown');
      const content = serializeMarkdownItem(updatedItem);
      const filePath = `${workspacePath}/${ITEMS_FOLDER}/${item.fileName}`;
      const success = await window.electronAPI.writeFile(filePath, content);
      
      if (success) {
        updateItem(updatedItem);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to change parent', error);
      return false;
    }
  };

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
      await window.electronAPI.setWorkspace(path);
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
      workspacePath, items, itemsTree, config, apiKey, currentUser,
      llmProvider, llmApiKeys, llmModel,
      setWorkspacePath: setWorkspacePathPersist, setItems, addItem, updateItem, deleteItem, changeParent,
      setConfig, setApiKey, setCurrentUser, saveConfig, loadWorkspace,
      setLLMProvider, setLLMApiKey, setLLMModel
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
