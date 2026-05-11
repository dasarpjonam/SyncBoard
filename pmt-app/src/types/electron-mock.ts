// Mock for browser environment
if (!window.electronAPI) {
  console.log('[DEV MODE] Using electron API mock - auto-loading demo workspace');

  const MOCK_HOME = '/mock/home';

  window.electronAPI = {
    openDirectory: async () => {
      const mockPath = '/demo/syncboard-workspace';
      localStorage.setItem('workspacePath', mockPath);
      return mockPath;
    },
    openDirectoryPicker: async () => {
      const mockPath = '/demo/syncboard-workspace';
      localStorage.setItem('workspacePath', mockPath);
      return mockPath;
    },
    setWorkspace: async (path) => {
      console.log('[DEV MODE] Workspace set to:', path);
      localStorage.setItem('workspacePath', path);
      return true;
    },
    readDir: async (path, _recursive) => {
      if (path.includes('/items')) {
        return ['ITEM-0001.md', 'ITEM-0002.md', 'ITEM-0003.md'];
      }
      return ['items', 'config.yaml'];
    },
    readFile: async (path) => {
      if (path.includes('config.yaml')) {
        return `types:\n  - Task\n  - Bug\n  - Feature\n  - Epic\n  - Meeting Note\nstatuses:\n  - To Do\n  - In Progress\n  - In Review\n  - Done\nusers:\n  - Alice\n  - Bob\n  - Charlie`;
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
    openFile: async () => '/demo/mock-file.pdf',
    openJsonFile: async () => {
      return JSON.stringify([
        { id: 'TODO-IMPORT-1', text: 'Imported todo example', done: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ]);
    },
    copyFile: async () => true,
    openPath: async () => true,

    // Global personal storage (home directory) — backed by localStorage in dev
    getHomePath: async () => MOCK_HOME,
    readHomePath: async (relativePath: string) => {
      return localStorage.getItem(`home_${relativePath}`) || null;
    },
    writeHomePath: async (relativePath: string, content: string) => {
      localStorage.setItem(`home_${relativePath}`, content);
      return true;
    },
    deleteHomePath: async (relativePath: string) => {
      localStorage.removeItem(`home_${relativePath}`);
      return true;
    },
    ensureHomePath: async () => true,
    readHomeDir: async (relativePath: string) => {
      const prefix = `home_${relativePath}/`;
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      return [...new Set(keys.map(k => k.replace(prefix, '').split('/')[0]))];
    },

    // App userData storage — backed by localStorage in dev
    readUserData: async (filename: string) => {
      return localStorage.getItem(`userData_${filename}`) || null;
    },
    writeUserData: async (filename: string, content: string) => {
      localStorage.setItem(`userData_${filename}`, content);
      return true;
    },

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
      localStorage.setItem(authKey, JSON.stringify({ enabled: true, requirePassword: true, passwordHash, salt }));
      return true;
    },
    authVerifyWorkspacePassword: async (workspacePath: string, passwordHash: string) => {
      const authKey = `mock_auth_${workspacePath}`;
      const authData = localStorage.getItem(authKey);
      if (!authData) return false;
      return JSON.parse(authData).passwordHash === passwordHash;
    },
    authGetPasswordSalt: async (workspacePath: string) => {
      const authKey = `mock_auth_${workspacePath}`;
      const authData = localStorage.getItem(authKey);
      if (!authData) return null;
      return JSON.parse(authData).salt || null;
    },
    authDisableWorkspaceAuth: async (workspacePath: string) => {
      localStorage.removeItem(`mock_auth_${workspacePath}`);
      return true;
    },
  };

  // Auto-initialize workspace in dev mode
  if (!localStorage.getItem('workspacePath')) {
    console.log('[DEV MODE] No workspace found - setting demo workspace');
    localStorage.setItem('workspacePath', '/demo/syncboard-workspace');
  }
}
