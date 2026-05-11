const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

let authorizedPaths = new Set();
let currentWorkspacePath = null;
const configPath = path.join(app.getPath('userData'), 'authorized_paths.json');

function loadAuthorizedPaths() {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      authorizedPaths = new Set(data);
    }
  } catch (error) {
    console.error('Failed to load authorized paths:', error);
  }
}

function saveAuthorizedPaths() {
  try {
    fs.writeFileSync(configPath, JSON.stringify([...authorizedPaths]), 'utf-8');
  } catch (error) {
    console.error('Failed to save authorized paths:', error);
  }
}

function isPathInside(parent, child) {
  if (!parent || !child) return false;
  const relative = path.relative(parent, child);
  return !relative.startsWith('..') && !path.isAbsolute(relative) && relative !== '';
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  loadAuthorizedPaths();
  // IPC handlers for file system operations
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (canceled) return null;
    const dirPath = filePaths[0];
    authorizedPaths.add(dirPath);
    saveAuthorizedPaths();
    currentWorkspacePath = dirPath;
    return dirPath;
  });

  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
    });
    if (canceled) return null;
    return filePaths[0];
  });

  ipcMain.handle('fs:setWorkspace', async (event, dirPath) => {
    if (authorizedPaths.has(dirPath)) {
      currentWorkspacePath = dirPath;
      
      // Ensure items directory exists
      const itemsDir = path.join(dirPath, 'items');
      if (!fs.existsSync(itemsDir)) {
        fs.mkdirSync(itemsDir, { recursive: true });
      }
      
      return true;
    }
    return false;
  });

  ipcMain.handle('fs:readDir', async (event, dirPath, recursive = false) => {
    try {
      if (!currentWorkspacePath || !isPathInside(currentWorkspacePath, dirPath) && currentWorkspacePath !== dirPath) {
        throw new Error('Unauthorized directory access');
      }
      if (!fs.existsSync(dirPath)) return [];
      
      if (!recursive) {
        // Non-recursive: return all files and directories
        const files = fs.readdirSync(dirPath);
        return files;
      } else {
        // Recursive: scan all subdirectories for markdown files
        const results = [];
        
        function scanDir(dir) {
          const files = fs.readdirSync(dir);
          
          for (const file of files) {
            // Skip hidden files and config
            if (file.startsWith('.') || file === 'config.yaml') {
              continue;
            }
            
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              // Recursively scan subdirectory
              scanDir(fullPath);
            } else if (file.endsWith('.md')) {
              // Add markdown file with relative path
              const relativePath = fullPath.replace(dirPath + path.sep, '');
              results.push(relativePath);
            }
          }
        }
        
        scanDir(dirPath);
        return results;
      }
    } catch (error) {
      console.error('Error reading directory:', error);
      return [];
    }
  });

  ipcMain.handle('fs:isDirectory', async (event, filePath) => {
    try {
      if (!currentWorkspacePath || !isPathInside(currentWorkspacePath, filePath)) {
        throw new Error('Unauthorized file access');
      }
      if (!fs.existsSync(filePath)) return false;
      return fs.statSync(filePath).isDirectory();
    } catch (error) {
      console.error('Error checking if directory:', error);
      return false;
    }
  });

  ipcMain.handle('fs:readFile', async (event, filePath) => {
    try {
      if (!currentWorkspacePath || !isPathInside(currentWorkspacePath, filePath)) {
        throw new Error('Unauthorized file access');
      }
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    }
  });

  ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
    try {
      if (!currentWorkspacePath || !isPathInside(currentWorkspacePath, filePath)) {
        throw new Error('Unauthorized file write');
      }
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error('Error writing file:', error);
      return false;
    }
  });

  ipcMain.handle('fs:deleteFile', async (event, filePath) => {
    try {
      if (!currentWorkspacePath || !isPathInside(currentWorkspacePath, filePath)) {
        throw new Error('Unauthorized file delete');
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  });

  ipcMain.handle('fs:ensureDir', async (event, dirPath) => {
    try {
      if (!currentWorkspacePath || !isPathInside(currentWorkspacePath, dirPath)) {
        throw new Error('Unauthorized directory creation');
      }
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error('Error creating directory:', error);
      return false;
    }
  });

  ipcMain.handle('fs:copyFile', async (event, sourcePath, destPath) => {
    try {
      if (!currentWorkspacePath || !isPathInside(currentWorkspacePath, destPath)) {
        throw new Error('Unauthorized destination for copy');
      }
      // Ensure destination dir exists
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(sourcePath, destPath);
      return true;
    } catch (error) {
      console.error('Error copying file:', error);
      return false;
    }
  });

  ipcMain.handle('fs:openPath', async (event, targetPath) => {
    try {
      if (!currentWorkspacePath || !isPathInside(currentWorkspacePath, targetPath)) {
        throw new Error('Unauthorized file path');
      }
      if (fs.existsSync(targetPath)) {
        await shell.openPath(targetPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error opening file path:', error);
      return false;
    }
  });

  // ─── App & Home Path Handlers ──────────────────────────────────
  ipcMain.handle('app:getHomePath', () => app.getPath('home'));

  ipcMain.handle('app:readUserData', (_, filename) => {
    try {
      const filePath = path.join(app.getPath('userData'), filename);
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, 'utf-8');
    } catch (e) { console.error('readUserData error:', e); return null; }
  });

  ipcMain.handle('app:writeUserData', (_, filename, content) => {
    try {
      const filePath = path.join(app.getPath('userData'), filename);
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (e) { console.error('writeUserData error:', e); return false; }
  });

  // Home-relative file ops (for personal notes/todos stored in ~/.syncboard/)
  const homeSyncboardBase = () => path.join(app.getPath('home'), '.syncboard');

  ipcMain.handle('app:ensureHomePath', (_, relativePath) => {
    try {
      const fullPath = path.join(homeSyncboardBase(), relativePath);
      if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
      return true;
    } catch (e) { console.error('ensureHomePath error:', e); return false; }
  });

  ipcMain.handle('app:readHomePath', (_, relativePath) => {
    try {
      const fullPath = path.join(homeSyncboardBase(), relativePath);
      if (!fs.existsSync(fullPath)) return null;
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (e) { console.error('readHomePath error:', e); return null; }
  });

  ipcMain.handle('app:writeHomePath', (_, relativePath, content) => {
    try {
      const fullPath = path.join(homeSyncboardBase(), relativePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');
      return true;
    } catch (e) { console.error('writeHomePath error:', e); return false; }
  });

  ipcMain.handle('app:deleteHomePath', (_, relativePath) => {
    try {
      const fullPath = path.join(homeSyncboardBase(), relativePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      return true;
    } catch (e) { console.error('deleteHomePath error:', e); return false; }
  });

  ipcMain.handle('app:readHomeDir', (_, relativePath) => {
    try {
      const fullPath = path.join(homeSyncboardBase(), relativePath);
      if (!fs.existsSync(fullPath)) return [];
      return fs.readdirSync(fullPath);
    } catch (e) { console.error('readHomeDir error:', e); return []; }
  });

  // JSON file picker (for todo import)
  ipcMain.handle('dialog:openJsonFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled) return null;
    try {
      return fs.readFileSync(filePaths[0], 'utf-8');
    } catch (e) { return null; }
  });

  // Git user info handlers
  ipcMain.handle('git:getUserInfo', async () => {
    const { execSync } = require('child_process');
    try {
      const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
      const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
      
      // Try to get GitHub username from git config
      let github;
      try {
        github = execSync('git config github.user', { encoding: 'utf-8' }).trim();
      } catch (e) {
        // GitHub username not configured
      }
      
      return { name, email, ...(github ? { github } : {}) };
    } catch (error) {
      console.error('Error reading git config:', error);
      return null;
    }
  });

  // Auth handlers
  ipcMain.handle('auth:checkWorkspaceAuth', async (event, workspacePath) => {
    try {
      // Security: verify path is in authorized paths (less strict than other auth handlers)
      // This is a read-only check operation needed during workspace loading
      if (!authorizedPaths.has(workspacePath)) {
        console.warn('Attempted to check auth for unauthorized workspace:', workspacePath);
        return null;
      }
      
      const authPath = path.join(workspacePath, '.syncboard', '.auth');
      if (!fs.existsSync(authPath)) {
        return null;
      }
      const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
      return {
        enabled: authData.enabled || false,
        requirePassword: authData.requirePassword || false,
      };
    } catch (error) {
      console.error('Error checking workspace auth:', error);
      return null;
    }
  });

  ipcMain.handle('auth:setWorkspacePassword', async (event, workspacePath, passwordHash, salt) => {
    try {
      // Security: verify path is within current workspace
      if (!currentWorkspacePath || workspacePath !== currentWorkspacePath) {
        throw new Error('Unauthorized workspace access');
      }
      
      const syncboardDir = path.join(workspacePath, '.syncboard');
      if (!fs.existsSync(syncboardDir)) {
        fs.mkdirSync(syncboardDir, { recursive: true });
      }
      
      const authPath = path.join(syncboardDir, '.auth');
      const authData = {
        enabled: true,
        requirePassword: true,
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
      };
      
      // Security: write with restrictive permissions (0o600) on POSIX
      fs.writeFileSync(authPath, JSON.stringify(authData, null, 2), { 
        encoding: 'utf-8',
        mode: 0o600 
      });
      return true;
    } catch (error) {
      console.error('Error setting workspace password:', error);
      return false;
    }
  });

  ipcMain.handle('auth:verifyWorkspacePassword', async (event, workspacePath, passwordHash) => {
    try {
      // Security: verify path is in authorized paths (needed during unlock flow)
      if (!authorizedPaths.has(workspacePath)) {
        console.warn('Attempted to verify password for unauthorized workspace:', workspacePath);
        return false;
      }
      
      const authPath = path.join(workspacePath, '.syncboard', '.auth');
      if (!fs.existsSync(authPath)) {
        return false;
      }
      
      const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
      return authData.passwordHash === passwordHash;
    } catch (error) {
      console.error('Error verifying workspace password:', error);
      return false;
    }
  });

  ipcMain.handle('auth:getPasswordSalt', async (event, workspacePath) => {
    try {
      // Security: verify path is in authorized paths (needed during unlock flow)
      if (!authorizedPaths.has(workspacePath)) {
        console.warn('Attempted to get salt for unauthorized workspace:', workspacePath);
        return null;
      }
      
      const authPath = path.join(workspacePath, '.syncboard', '.auth');
      if (!fs.existsSync(authPath)) {
        return null;
      }
      
      const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
      return authData.salt || null;
    } catch (error) {
      console.error('Error getting password salt:', error);
      return null;
    }
  });

  ipcMain.handle('auth:disableWorkspaceAuth', async (event, workspacePath) => {
    try {
      // Security: verify path is within current workspace
      if (!currentWorkspacePath || workspacePath !== currentWorkspacePath) {
        throw new Error('Unauthorized workspace access');
      }
      
      const authPath = path.join(workspacePath, '.syncboard', '.auth');
      if (fs.existsSync(authPath)) {
        fs.unlinkSync(authPath);
      }
      return true;
    } catch (error) {
      console.error('Error disabling workspace auth:', error);
      return false;
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
