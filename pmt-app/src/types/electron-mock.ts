// Mock for browser environment
if (!window.electronAPI) {
  console.log('[DEV MODE] Using electron API mock - auto-loading demo workspace');
  
  window.electronAPI = {
    openDirectory: async () => {
      const mockPath = '/demo/syncboard-workspace';
      // Auto-set in localStorage for dev convenience
      localStorage.setItem('workspacePath', mockPath);
      return mockPath;
    },
    setWorkspace: async (path) => {
      console.log('[DEV MODE] Workspace set to:', path);
      localStorage.setItem('workspacePath', path);
      return true;
    },
    readDir: async (path, recursive) => {
      // If reading items folder, return item files
      if (path.includes('/items')) {
        return ['ITEM-0001.md', 'ITEM-0002.md', 'ITEM-0003.md'];
      }
      // Otherwise return workspace contents
      return recursive ? ['items/ITEM-0001.md', 'items/ITEM-0002.md', 'items/ITEM-0003.md'] : ['items', 'config.yaml'];
    },
    readFile: async (path) => {
      if (path.includes('config.yaml')) {
        return `types: ['Task', 'Bug', 'Feature', 'Epic']\nstatuses: ['To Do', 'In Progress', 'In Review', 'Done']\nusers: ['Alice', 'Bob', 'Charlie']`;
      }
      if (path.includes('ITEM-0001.md')) {
        return `---\nid: ITEM-0001\ntitle: Design the application architecture\ntype: Task\nstatus: In Progress\nassignee: Alice\ncreatedAt: '2023-10-25T10:00:00.000Z'\nupdatedAt: '2023-10-26T12:00:00.000Z'\nfileName: ITEM-0001.md\n---\nWe need to design the core architecture for the new Syncboard application.`;
      }
      if (path.includes('ITEM-0002.md')) {
        return `---\nid: ITEM-0002\ntitle: Fix crash on load\ntype: Bug\nstatus: To Do\nassignee: Bob\ncreatedAt: '2023-10-26T09:00:00.000Z'\nupdatedAt: '2023-10-26T09:30:00.000Z'\nfileName: ITEM-0002.md\n---\nThe app crashes when loading a workspace with invalid YAML files.`;
      }
      if (path.includes('ITEM-0003.md')) {
        return `---\nid: ITEM-0003\ntitle: Implement AI Assistant\ntype: Feature\nstatus: Done\nassignee: Charlie\ncreatedAt: '2023-10-20T14:00:00.000Z'\nupdatedAt: '2023-10-27T16:00:00.000Z'\nfileName: ITEM-0003.md\n---\nAdd a chat interface using @ai-sdk/react`;
      }
      return null;
    },
    writeFile: async () => true,
    deleteFile: async () => true,
    ensureDir: async () => true,
    isDirectory: async () => false,
    
    // Git integration
    gitGetUserInfo: async () => ({
      name: 'Demo User',
      email: 'demo@example.com',
      github: 'demouser'
    }),
    
    // Authentication - persist mock state in localStorage for consistency
    authCheckWorkspaceAuth: async (workspacePath: string) => {
      const authKey = `mock_auth_${workspacePath}`;
      const authData = localStorage.getItem(authKey);
      if (!authData) return null;
      return JSON.parse(authData);
    },
    authSetWorkspacePassword: async (workspacePath: string, passwordHash: string, salt: string) => {
      const authKey = `mock_auth_${workspacePath}`;
      localStorage.setItem(authKey, JSON.stringify({
        enabled: true,
        requirePassword: true,
        passwordHash,
        salt
      }));
      return true;
    },
    authVerifyWorkspacePassword: async (workspacePath: string, passwordHash: string) => {
      const authKey = `mock_auth_${workspacePath}`;
      const authData = localStorage.getItem(authKey);
      if (!authData) return false;
      const parsed = JSON.parse(authData);
      return parsed.passwordHash === passwordHash;
    },
    authGetPasswordSalt: async (workspacePath: string) => {
      const authKey = `mock_auth_${workspacePath}`;
      const authData = localStorage.getItem(authKey);
      if (!authData) return null;
      const parsed = JSON.parse(authData);
      return parsed.salt || null;
    },
    authDisableWorkspaceAuth: async (workspacePath: string) => {
      const authKey = `mock_auth_${workspacePath}`;
      localStorage.removeItem(authKey);
      return true;
    },
  };
  
  // Auto-initialize workspace in dev mode
  if (!localStorage.getItem('workspacePath')) {
    console.log('[DEV MODE] No workspace found - setting demo workspace');
    localStorage.setItem('workspacePath', '/demo/syncboard-workspace');
  }
}
