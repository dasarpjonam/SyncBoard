// Mock for browser environment
if (!window.electronAPI) {
  window.electronAPI = {
    openDirectory: async () => '/tmp/new-workspace-empty',
    readDir: async () => [],
    readFile: async (path) => {
      // Mock for empty workspace
      if (path.includes('new-workspace-empty')) {
        return null;
      }

      if (path.includes('config.yaml')) {
        return `types: ['Task', 'Bug', 'Feature', 'Epic']\nstatuses: ['To Do', 'In Progress', 'In Review', 'Done']\nusers: ['Alice', 'Bob', 'Charlie']`;
      }
      if (path.includes('TASK-1.md')) {
        return `---\nid: TASK-1\ntitle: Design the application architecture\ntype: Task\nstatus: In Progress\nassignee: Alice\ncreatedAt: '2023-10-25T10:00:00.000Z'\nupdatedAt: '2023-10-26T12:00:00.000Z'\nfileName: TASK-1.md\n---\nWe need to design the core architecture for the new Syncboard application.`;
      }
      if (path.includes('BUG-2.md')) {
        return `---\nid: BUG-2\ntitle: Fix crash on load\ntype: Bug\nstatus: To Do\nassignee: Bob\ncreatedAt: '2023-10-26T09:00:00.000Z'\nupdatedAt: '2023-10-26T09:30:00.000Z'\nfileName: BUG-2.md\n---\nThe app crashes when loading a workspace with invalid YAML files.`;
      }
      if (path.includes('FEAT-3.md')) {
        return `---\nid: FEAT-3\ntitle: Implement AI Assistant\ntype: Feature\nstatus: Done\nassignee: Charlie\ncreatedAt: '2023-10-20T14:00:00.000Z'\nupdatedAt: '2023-10-27T16:00:00.000Z'\nfileName: FEAT-3.md\n---\nAdd a chat interface using @ai-sdk/react`;
      }
      return null;
    },
    writeFile: async () => true,
  };
}
