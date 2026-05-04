import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.electronAPI for tests
if (typeof window !== 'undefined') {
  (global as any).DOMParser = window.DOMParser;
  (window as any).electronAPI = {
    ensureDir: async () => {},
    writeFile: async () => {},
    readFile: async () => new Uint8Array(),
    readDir: async () => [],
    isDirectory: async () => false,
  };
}
