export {};

declare global {
  interface Window {
    electronAPI: {
      openDirectory: () => Promise<string | null>;
      setWorkspace: (dirPath: string) => Promise<boolean>;
      readDir: (dirPath: string) => Promise<string[]>;
      readFile: (filePath: string) => Promise<string | null>;
      writeFile: (filePath: string, content: string) => Promise<boolean>;
    };
  }
}
