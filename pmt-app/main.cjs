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
      return true;
    }
    return false;
  });

  ipcMain.handle('fs:readDir', async (event, dirPath) => {
    try {
      if (!currentWorkspacePath || !isPathInside(currentWorkspacePath, dirPath) && currentWorkspacePath !== dirPath) {
        throw new Error('Unauthorized directory access');
      }
      if (!fs.existsSync(dirPath)) return [];
      const files = fs.readdirSync(dirPath);
      return files.filter((f) => f.endsWith('.md'));
    } catch (error) {
      console.error('Error reading directory:', error);
      return [];
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
