const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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

  // Git user info handlers
  ipcMain.handle('git:getUserInfo', async () => {
    const { execSync } = require('child_process');
    try {
      const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
      const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
      
      // Try to get GitHub username from git config
      let github = null;
      try {
        github = execSync('git config github.user', { encoding: 'utf-8' }).trim();
      } catch (e) {
        // GitHub username not configured
      }
      
      return { name, email, github };
    } catch (error) {
      console.error('Error reading git config:', error);
      return null;
    }
  });

  // Auth handlers
  ipcMain.handle('auth:checkWorkspaceAuth', async (event, workspacePath) => {
    try {
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
      
      fs.writeFileSync(authPath, JSON.stringify(authData, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Error setting workspace password:', error);
      return false;
    }
  });

  ipcMain.handle('auth:verifyWorkspacePassword', async (event, workspacePath, passwordHash) => {
    try {
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
