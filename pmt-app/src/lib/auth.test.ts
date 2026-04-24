import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkspaceAuthManager } from './auth';
import { User } from '../types';

describe('WorkspaceAuthManager', () => {
  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('createSession', () => {
    it('should create a session with authenticated user and workspace path', () => {
      const user: User = {
        id: 'test@example.com',
        displayName: 'Test User',
        email: 'test@example.com',
        githubHandle: 'testuser',
      };

      const session = WorkspaceAuthManager.createSession(user, '/test/workspace');

      expect(session.isAuthenticated).toBe(true);
      expect(session.user).toEqual(user);
      expect(session.workspacePath).toBe('/test/workspace');
      expect(session.lockedAt).toBeUndefined();
    });

    it('should store session in sessionStorage', () => {
      const user: User = {
        id: 'test@example.com',
        displayName: 'Test User',
      };

      WorkspaceAuthManager.createSession(user, '/test/workspace');

      const stored = sessionStorage.getItem('workspace_auth_session');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.isAuthenticated).toBe(true);
      expect(parsed.user.displayName).toBe('Test User');
      expect(parsed.workspacePath).toBe('/test/workspace');
    });
  });

  describe('getSession', () => {
    it('should return null when no session exists', () => {
      const session = WorkspaceAuthManager.getSession();
      expect(session).toBeNull();
    });

    it('should retrieve existing session', () => {
      const user: User = {
        id: 'test@example.com',
        displayName: 'Test User',
      };

      WorkspaceAuthManager.createSession(user, '/test/workspace');
      const retrieved = WorkspaceAuthManager.getSession();

      expect(retrieved).toBeTruthy();
      expect(retrieved?.isAuthenticated).toBe(true);
      expect(retrieved?.user?.displayName).toBe('Test User');
      expect(retrieved?.workspacePath).toBe('/test/workspace');
    });

    it('should handle corrupted session data gracefully', () => {
      sessionStorage.setItem('workspace_auth_session', 'invalid json');
      const session = WorkspaceAuthManager.getSession();
      expect(session).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('should remove session from storage', () => {
      const user: User = {
        id: 'test@example.com',
        displayName: 'Test User',
      };

      WorkspaceAuthManager.createSession(user, '/test/workspace');
      expect(sessionStorage.getItem('workspace_auth_session')).toBeTruthy();

      WorkspaceAuthManager.clearSession();
      expect(sessionStorage.getItem('workspace_auth_session')).toBeNull();
    });
  });

  describe('lockWorkspace', () => {
    it('should set isAuthenticated to false', () => {
      const user: User = {
        id: 'test@example.com',
        displayName: 'Test User',
      };

      WorkspaceAuthManager.createSession(user, '/test/workspace');
      WorkspaceAuthManager.lockWorkspace();

      const session = WorkspaceAuthManager.getSession();
      expect(session?.isAuthenticated).toBe(false);
      expect(session?.lockedAt).toBeTruthy();
    });

    it('should preserve user information when locked', () => {
      const user: User = {
        id: 'test@example.com',
        displayName: 'Test User',
        email: 'test@example.com',
      };

      WorkspaceAuthManager.createSession(user, '/test/workspace');
      WorkspaceAuthManager.lockWorkspace();

      const session = WorkspaceAuthManager.getSession();
      expect(session?.user?.displayName).toBe('Test User');
    });
  });

  describe('unlockWorkspace', () => {
    it('should create new authenticated session', () => {
      const user: User = {
        id: 'test@example.com',
        displayName: 'Test User',
      };

      const session = WorkspaceAuthManager.unlockWorkspace(user);

      expect(session.isAuthenticated).toBe(true);
      expect(session.user).toEqual(user);
    });
  });

  describe('createUserFromGit', () => {
    it('should create user from complete git info', () => {
      const gitUser = {
        name: 'Alice Smith',
        email: 'alice@example.com',
        github: 'alice-dev',
      };

      const user = WorkspaceAuthManager.createUserFromGit(gitUser);

      expect(user.id).toBe('alice@example.com');
      expect(user.displayName).toBe('Alice Smith');
      expect(user.email).toBe('alice@example.com');
      expect(user.githubHandle).toBe('alice-dev');
    });

    it('should handle missing github handle', () => {
      const gitUser = {
        name: 'Bob Jones',
        email: 'bob@example.com',
      };

      const user = WorkspaceAuthManager.createUserFromGit(gitUser);

      expect(user.displayName).toBe('Bob Jones');
      expect(user.githubHandle).toBeUndefined();
    });

    it('should use name as id when email is missing', () => {
      const gitUser = {
        name: 'Charlie',
        email: '',
      };

      const user = WorkspaceAuthManager.createUserFromGit(gitUser);

      expect(user.id).toBe('Charlie');
      expect(user.displayName).toBe('Charlie');
    });
  });

  describe('hashPassword', () => {
    it('should generate hash and salt', async () => {
      const password = 'testPassword123';
      const result = await WorkspaceAuthManager.hashPassword(password);

      expect(result.hash).toBeTruthy();
      expect(result.salt).toBeTruthy();
      expect(result.hash.length).toBeGreaterThan(32);
      expect(result.salt.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate different salts for same password', async () => {
      const password = 'testPassword123';
      const result1 = await WorkspaceAuthManager.hashPassword(password);
      const result2 = await WorkspaceAuthManager.hashPassword(password);

      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should use provided salt if given', async () => {
      const password = 'testPassword123';
      const customSalt = 'abcdef1234567890abcdef1234567890';
      
      const result1 = await WorkspaceAuthManager.hashPassword(password, customSalt);
      const result2 = await WorkspaceAuthManager.hashPassword(password, customSalt);

      expect(result1.salt).toBe(customSalt);
      expect(result2.salt).toBe(customSalt);
      expect(result1.hash).toBe(result2.hash);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const { hash, salt } = await WorkspaceAuthManager.hashPassword(password);

      const isValid = await WorkspaceAuthManager.verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const { hash, salt } = await WorkspaceAuthManager.hashPassword(password);

      const isValid = await WorkspaceAuthManager.verifyPassword('wrongPassword', hash, salt);
      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'TestPassword123';
      const { hash, salt } = await WorkspaceAuthManager.hashPassword(password);

      const isValid = await WorkspaceAuthManager.verifyPassword('testpassword123', hash, salt);
      expect(isValid).toBe(false);
    });
  });

  describe('generateSalt', () => {
    it('should generate salt of correct length', () => {
      const salt = WorkspaceAuthManager.generateSalt();
      expect(salt.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique salts', () => {
      const salt1 = WorkspaceAuthManager.generateSalt();
      const salt2 = WorkspaceAuthManager.generateSalt();
      const salt3 = WorkspaceAuthManager.generateSalt();

      expect(salt1).not.toBe(salt2);
      expect(salt2).not.toBe(salt3);
      expect(salt1).not.toBe(salt3);
    });
  });

  describe('setupAutoLock', () => {
    it('should call onLock after specified time', async () => {
      let lockCalled = false;
      const onLock = () => { lockCalled = true; };

      // Setup auto-lock with 100ms timeout
      const cleanup = WorkspaceAuthManager.setupAutoLock(0.001667, onLock); // ~0.1 seconds

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(lockCalled).toBe(true);
      cleanup();
    });

    it('should return cleanup function', () => {
      const onLock = () => {};
      const cleanup = WorkspaceAuthManager.setupAutoLock(1, onLock);

      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });
});
