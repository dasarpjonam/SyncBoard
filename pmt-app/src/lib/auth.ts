import { User, UserRole, WorkspacePermissions, AuthSession } from '../types';

export class WorkspaceAuthManager {
  private static SESSION_KEY = 'workspace_auth_session';
  private static LOCK_TIMEOUT_KEY = 'workspace_lock_timeout';
  
  /**
   * Get role-based permissions
   */
  static getPermissions(role: UserRole): WorkspacePermissions {
    switch (role) {
      case 'admin':
        return {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canManageUsers: true,
          canManageAuth: true,
        };
      case 'contributor':
        return {
          canCreate: true,
          canEdit: true,
          canDelete: false,
          canManageUsers: false,
          canManageAuth: false,
        };
      case 'viewer':
        return {
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canManageUsers: false,
          canManageAuth: false,
        };
    }
  }

  /**
   * Create an authenticated session
   */
  static createSession(user: User): AuthSession {
    const session: AuthSession = {
      isAuthenticated: true,
      user,
      permissions: this.getPermissions(user.role),
    };
    
    // Store in session storage (cleared on app close)
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    
    return session;
  }

  /**
   * Get current session
   */
  static getSession(): AuthSession | null {
    const stored = sessionStorage.getItem(this.SESSION_KEY);
    if (!stored) {
      return null;
    }
    
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  /**
   * Clear session (logout/lock)
   */
  static clearSession(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * Lock workspace
   */
  static lockWorkspace(): void {
    const session = this.getSession();
    if (session) {
      session.isAuthenticated = false;
      session.lockedAt = new Date().toISOString();
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    }
  }

  /**
   * Unlock workspace
   */
  static unlockWorkspace(user: User): AuthSession {
    return this.createSession(user);
  }

  /**
   * Setup auto-lock timer
   */
  static setupAutoLock(minutes: number, onLock: () => void): () => void {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        this.lockWorkspace();
        onLock();
      }, minutes * 60 * 1000);
    };
    
    // Reset timer on user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });
    
    resetTimer();
    
    // Return cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }

  /**
   * Create a user from git identity
   */
  static createUserFromGit(gitUser: { name: string; email: string; github?: string }): User {
    return {
      id: gitUser.email || gitUser.name,
      displayName: gitUser.name,
      email: gitUser.email,
      githubHandle: gitUser.github,
      role: 'contributor', // Default role
    };
  }

  /**
   * Hash password using Web Crypto API
   */
  static async hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const encoder = new TextEncoder();
    const useSalt = salt || this.generateSalt();
    const data = encoder.encode(password + useSalt);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return { hash, salt: useSalt };
  }

  /**
   * Generate random salt
   */
  static generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify password
   */
  static async verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
    const { hash } = await this.hashPassword(password, salt);
    return hash === storedHash;
  }
}
