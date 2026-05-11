const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openDirectoryPicker: () => ipcRenderer.invoke('dialog:openDirectory'),
  setWorkspace: (dirPath) => ipcRenderer.invoke('fs:setWorkspace', dirPath),
  readDir: (dirPath, recursive) => ipcRenderer.invoke('fs:readDir', dirPath, recursive),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke('fs:deleteFile', filePath),
  ensureDir: (dirPath) => ipcRenderer.invoke('fs:ensureDir', dirPath),
  isDirectory: (filePath) => ipcRenderer.invoke('fs:isDirectory', filePath),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openJsonFile: () => ipcRenderer.invoke('dialog:openJsonFile'),
  copyFile: (src, dest) => ipcRenderer.invoke('fs:copyFile', src, dest),
  openPath: (path) => ipcRenderer.invoke('fs:openPath', path),

  // Global personal storage (home directory)
  getHomePath: () => ipcRenderer.invoke('app:getHomePath'),
  readHomePath: (relativePath) => ipcRenderer.invoke('app:readHomePath', relativePath),
  writeHomePath: (relativePath, content) => ipcRenderer.invoke('app:writeHomePath', relativePath, content),
  deleteHomePath: (relativePath) => ipcRenderer.invoke('app:deleteHomePath', relativePath),
  ensureHomePath: (relativePath) => ipcRenderer.invoke('app:ensureHomePath', relativePath),
  readHomeDir: (relativePath) => ipcRenderer.invoke('app:readHomeDir', relativePath),

  // App userData storage (workspace registry, app settings)
  readUserData: (filename) => ipcRenderer.invoke('app:readUserData', filename),
  writeUserData: (filename, content) => ipcRenderer.invoke('app:writeUserData', filename, content),

  // Git integration
  gitGetUserInfo: () => ipcRenderer.invoke('git:getUserInfo'),

  // Authentication
  authCheckWorkspaceAuth: (workspacePath) => ipcRenderer.invoke('auth:checkWorkspaceAuth', workspacePath),
  authSetWorkspacePassword: (workspacePath, passwordHash, salt) => ipcRenderer.invoke('auth:setWorkspacePassword', workspacePath, passwordHash, salt),
  authVerifyWorkspacePassword: (workspacePath, passwordHash) => ipcRenderer.invoke('auth:verifyWorkspacePassword', workspacePath, passwordHash),
  authGetPasswordSalt: (workspacePath) => ipcRenderer.invoke('auth:getPasswordSalt', workspacePath),
  authDisableWorkspaceAuth: (workspacePath) => ipcRenderer.invoke('auth:disableWorkspaceAuth', workspacePath),
});
