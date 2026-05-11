export {};

declare global {
  interface Window {
    electronAPI: {
      openDirectory: () => Promise<string | null>;
      setWorkspace: (dirPath: string) => Promise<boolean>;
      readDir: (dirPath: string, recursive?: boolean) => Promise<string[]>;
      readFile: (filePath: string) => Promise<string | null>;
      writeFile: (filePath: string, content: string) => Promise<boolean>;
      deleteFile: (filePath: string) => Promise<boolean>;
      ensureDir: (dirPath: string) => Promise<boolean>;
      isDirectory: (filePath: string) => Promise<boolean>;
      openFile: () => Promise<string | null>;
      copyFile: (src: string, dest: string) => Promise<boolean>;
      openPath: (path: string) => Promise<boolean>;
      
      // Git integration
      gitGetUserInfo: () => Promise<{ name: string; email: string; github?: string } | null>;
      
      // Authentication
      authCheckWorkspaceAuth: (workspacePath: string) => Promise<{ enabled: boolean; requirePassword: boolean } | null>;
      authSetWorkspacePassword: (workspacePath: string, passwordHash: string, salt: string) => Promise<boolean>;
      authVerifyWorkspacePassword: (workspacePath: string, passwordHash: string) => Promise<boolean>;
      authGetPasswordSalt: (workspacePath: string) => Promise<string | null>;
      authDisableWorkspaceAuth: (workspacePath: string) => Promise<boolean>;
    };
  }
}
