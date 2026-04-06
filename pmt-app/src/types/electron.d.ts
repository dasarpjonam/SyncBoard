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
    };
  }
}
