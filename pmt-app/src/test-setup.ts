import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.electronAPI for tests
(global as any).window = {
  ...(global as any).window,
  electronAPI: {
    ensureDir: async () => {},
    writeFile: async () => {},
    readFile: async () => new Uint8Array(),
    readDir: async () => [],
    isDirectory: async () => false,
  },
};
