import path from 'path';

/**
 * Get the full file path for a work item based on folder structure
 */
export function getItemPath(workspacePath: string, itemType: string, fileName: string): string {
  return path.join(workspacePath, itemType, fileName);
}

/**
 * Get the folder path for a given item type
 */
export function getTypeFolderPath(workspacePath: string, itemType: string): string {
  return path.join(workspacePath, itemType);
}

/**
 * Extract folder structure from workspace
 */
export interface FolderInfo {
  name: string;
  path: string;
  itemCount: number;
}

/**
 * Parse file path to extract type from folder structure
 */
export function getTypeFromPath(workspacePath: string, filePath: string): string | null {
  const relativePath = filePath.replace(workspacePath + path.sep, '');
  const parts = relativePath.split(path.sep);
  
  // If file is in a subdirectory, first part is the type
  if (parts.length > 1) {
    return parts[0];
  }
  
  return null;
}

/**
 * Detect if workspace uses folder structure or flat structure
 */
export async function detectWorkspaceStructure(
  workspacePath: string,
  readDir: (path: string) => Promise<string[]>
): Promise<'folders' | 'flat'> {
  const files = await readDir(workspacePath);
  
  // Check if there are subdirectories with markdown files
  const hasFolders = files.some(file => !file.endsWith('.md') && !file.startsWith('.'));
  
  return hasFolders ? 'folders' : 'flat';
}

/**
 * Migrate flat workspace to folder structure
 */
export interface MigrationResult {
  success: boolean;
  moved: number;
  errors: string[];
}

export async function migrateFlatToFolders(
  workspacePath: string,
  items: Array<{ fileName: string; type: string }>,
  readFile: (path: string) => Promise<string | null>,
  writeFile: (path: string, content: string) => Promise<boolean>,
  ensureDir: (path: string) => Promise<boolean>,
  deleteFile: (path: string) => Promise<boolean>
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    moved: 0,
    errors: [],
  };
  
  try {
    // Group items by type
    const byType = new Map<string, Array<{ fileName: string; type: string }>>();
    
    items.forEach(item => {
      if (!byType.has(item.type)) {
        byType.set(item.type, []);
      }
      byType.get(item.type)!.push(item);
    });
    
    // Create folders and move files
    for (const [type, typeItems] of byType) {
      const folderPath = getTypeFolderPath(workspacePath, type);
      
      // Ensure folder exists
      await ensureDir(folderPath);
      
      // Move each file
      for (const item of typeItems) {
        try {
          const oldPath = path.join(workspacePath, item.fileName);
          const newPath = getItemPath(workspacePath, type, item.fileName);
          
          // Read content from old location
          const content = await readFile(oldPath);
          
          if (content) {
            // Write to new location
            const written = await writeFile(newPath, content);
            
            if (written) {
              // Delete old file
              await deleteFile(oldPath);
              result.moved++;
            } else {
              result.errors.push(`Failed to write ${item.fileName} to new location`);
            }
          } else {
            result.errors.push(`Failed to read ${item.fileName}`);
          }
        } catch (error) {
          result.errors.push(`Error migrating ${item.fileName}: ${error}`);
        }
      }
    }
    
    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    result.errors.push(`Migration failed: ${error}`);
  }
  
  return result;
}

/**
 * Get all markdown files recursively from workspace
 */
export async function getAllMarkdownFiles(
  workspacePath: string,
  readDir: (path: string) => Promise<string[]>,
  isDirectory?: (path: string) => Promise<boolean>
): Promise<Array<{ filePath: string; type: string | null }>> {
  const results: Array<{ filePath: string; type: string | null }> = [];
  
  async function scan(dir: string, type: string | null = null): Promise<void> {
    const files = await readDir(dir);
    
    for (const file of files) {
      // Skip hidden files and config
      if (file.startsWith('.') || file === 'config.yaml') {
        continue;
      }
      
      const fullPath = path.join(dir, file);
      
      // Check if it's a directory
      if (!file.endsWith('.md')) {
        // Assume it's a directory, scan recursively
        await scan(fullPath, file);
      } else {
        // It's a markdown file
        results.push({
          filePath: fullPath.replace(workspacePath + path.sep, ''),
          type: type
        });
      }
    }
  }
  
  await scan(workspacePath);
  return results;
}

/**
 * Generate unique filename for work item
 */
export function generateFileName(title: string, id: string): string {
  // Sanitize title for filename
  const sanitized = title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 50);
    
  return `${id}-${sanitized}.md`;
}
