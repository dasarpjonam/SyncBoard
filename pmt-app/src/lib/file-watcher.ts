import chokidar, { FSWatcher } from 'chokidar';

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  relativePath: string;
}

export type FileChangeHandler = (event: FileChangeEvent) => void;

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private workspacePath: string;
  private handlers: FileChangeHandler[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceDelay: number = 2000; // 2 seconds

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  /**
   * Start watching for file changes
   */
  start(): void {
    if (this.watcher) {
      return; // Already watching
    }

    this.watcher = chokidar.watch('**/*.md', {
      cwd: this.workspacePath,
      ignored: ['.syncboard/**', '**/node_modules/**', '**/.git/**'],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (path) => this.handleFileChange('add', path))
      .on('change', (path) => this.handleFileChange('change', path))
      .on('unlink', (path) => this.handleFileChange('unlink', path))
      .on('error', (error) => console.error('File watcher error:', error));
  }

  /**
   * Stop watching for file changes
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Clear any pending debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Add a handler for file change events
   */
  onChange(handler: FileChangeHandler): () => void {
    this.handlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index > -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  /**
   * Handle file change with debouncing
   */
  private handleFileChange(type: 'add' | 'change' | 'unlink', relativePath: string): void {
    // Clear existing debounce timer for this file
    const existingTimer = this.debounceTimers.get(relativePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(relativePath);
      
      const event: FileChangeEvent = {
        type,
        path: `${this.workspacePath}/${relativePath}`,
        relativePath,
      };

      // Notify all handlers
      this.handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in file change handler:', error);
        }
      });
    }, this.debounceDelay);

    this.debounceTimers.set(relativePath, timer);
  }

  /**
   * Check if currently watching
   */
  isWatching(): boolean {
    return this.watcher !== null;
  }
}

/**
 * Detect cloud service from workspace path
 */
export function detectCloudService(workspacePath: string): string | null {
  const lower = workspacePath.toLowerCase();
  
  if (lower.includes('dropbox')) {
    return 'Dropbox';
  }
  if (lower.includes('onedrive')) {
    return 'OneDrive';
  }
  if (lower.includes('google drive') || lower.includes('googledrive')) {
    return 'Google Drive';
  }
  
  return null;
}
