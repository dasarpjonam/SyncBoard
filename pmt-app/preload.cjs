const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  setWorkspace: (dirPath) => ipcRenderer.invoke('fs:setWorkspace', dirPath),
  readDir: (dirPath, recursive) => ipcRenderer.invoke('fs:readDir', dirPath, recursive),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke('fs:deleteFile', filePath),
  ensureDir: (dirPath) => ipcRenderer.invoke('fs:ensureDir', dirPath),
  isDirectory: (filePath) => ipcRenderer.invoke('fs:isDirectory', filePath),
  
  // Git integration
  gitGetUserInfo: () => ipcRenderer.invoke('git:getUserInfo'),
  
  // Authentication
  authCheckWorkspaceAuth: (workspacePath) => ipcRenderer.invoke('auth:checkWorkspaceAuth', workspacePath),
  authSetWorkspacePassword: (workspacePath, passwordHash, salt) => ipcRenderer.invoke('auth:setWorkspacePassword', workspacePath, passwordHash, salt),
  authVerifyWorkspacePassword: (workspacePath, passwordHash) => ipcRenderer.invoke('auth:verifyWorkspacePassword', workspacePath, passwordHash),
  authGetPasswordSalt: (workspacePath) => ipcRenderer.invoke('auth:getPasswordSalt', workspacePath),
  authDisableWorkspaceAuth: (workspacePath) => ipcRenderer.invoke('auth:disableWorkspaceAuth', workspacePath),
});
