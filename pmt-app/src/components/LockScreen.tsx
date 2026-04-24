import React, { useState } from 'react';
import { Lock, Unlock, User as UserIcon } from 'lucide-react';
import { WorkspaceAuthManager } from '../lib/auth';
import { User } from '../types';

interface LockScreenProps {
  workspacePath: string;
  requirePassword: boolean;
  onUnlock: (user: User) => void;
  onCancel?: () => void;
}

export function LockScreen({ workspacePath, requirePassword, onUnlock, onCancel }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [isCreatingPassword, setIsCreatingPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [autoDetectedUser, setAutoDetectedUser] = useState<User | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  React.useEffect(() => {
    // Auto-detect git user
    window.electronAPI.gitGetUserInfo().then(gitUser => {
      if (gitUser) {
        const user = WorkspaceAuthManager.createUserFromGit(gitUser);
        setAutoDetectedUser(user);
        setSelectedUser(user);
      } else {
        // Git detection failed, show manual entry
        setShowManualEntry(true);
      }
    }).catch((err) => {
      console.error('Failed to auto-detect git user:', err);
      // Git detection failed, show manual entry
      setShowManualEntry(true);
    });
  }, []);

  const handleManualUserSubmit = () => {
    if (!manualName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    const email = manualEmail.trim() || `${manualName.toLowerCase().replace(/\s+/g, '.')}@local`;
    const user = WorkspaceAuthManager.createUserFromGit({
      name: manualName.trim(),
      email,
      github: undefined
    } as any);
    
    setSelectedUser(user);
    setShowManualEntry(false);
    setError('');
  };

  const handleUnlock = async () => {
    setError('');
    setLoading(true);

    try {
      if (!selectedUser) {
        setError('Please select a user');
        setLoading(false);
        return;
      }

      if (requirePassword) {
        // Check if password is already set
        const salt = await window.electronAPI.authGetPasswordSalt(workspacePath);
        
        if (!salt) {
          // No password set yet - create one
          setIsCreatingPassword(true);
          setLoading(false);
          return;
        }

        // Verify password
        const { hash } = await WorkspaceAuthManager.hashPassword(password, salt);
        const isValid = await window.electronAPI.authVerifyWorkspacePassword(workspacePath, hash);

        if (!isValid) {
          setError('Invalid password');
          setLoading(false);
          return;
        }
      }

      // Unlock workspace
      onUnlock(selectedUser);
    } catch (err) {
      setError('Failed to unlock workspace');
      console.error('Unlock error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async () => {
    setError('');
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { hash, salt } = await WorkspaceAuthManager.hashPassword(password);
      const success = await window.electronAPI.authSetWorkspacePassword(workspacePath, hash, salt);

      if (success && selectedUser) {
        onUnlock(selectedUser);
      } else {
        setError('Failed to create password');
      }
    } catch (err) {
      setError('Failed to create password');
      console.error('Create password error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPassword = () => {
    if (selectedUser) {
      onUnlock(selectedUser);
    }
  };

  if (isCreatingPassword) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <Lock size={32} className="text-blue-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">Create Workspace Password</h2>
          <p className="text-gray-600 text-center mb-6 text-sm">
            This password will be used to unlock this workspace in the future.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password (min 6 characters)"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePassword()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm password"
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePassword()}
              />
            </div>

            <button
              onClick={handleCreatePassword}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Creating...' : 'Create Password'}
            </button>

            {!requirePassword && (
              <button
                onClick={handleSkipPassword}
                disabled={loading}
                className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Skip - Unlock without password
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Lock size={32} className="text-blue-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-2">Unlock Workspace</h2>
        <p className="text-gray-600 text-center mb-6 text-sm">
          {requirePassword ? 'Enter your password to continue' : 'Select your user to continue'}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Manual user entry when git detection fails */}
          {showManualEntry && !selectedUser && (
            <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
              <div className="mb-3">
                <p className="text-sm text-yellow-800 font-medium mb-3">
                  ⚠️ Git user not detected. Please enter your information:
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleManualUserSubmit}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Continue
              </button>
            </div>
          )}

          {/* User selection */}
          {autoDetectedUser && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 text-white rounded-full p-2">
                  <UserIcon size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{autoDetectedUser.displayName}</div>
                  <div className="text-sm text-gray-600">{autoDetectedUser.email}</div>
                  {autoDetectedUser.githubHandle && (
                    <div className="text-xs text-gray-500">@{autoDetectedUser.githubHandle}</div>
                  )}
                </div>
                <div className="text-xs text-green-600 font-medium">Auto-detected from git</div>
              </div>
            </div>
          )}

          {requirePassword && (
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter workspace password"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              />
            </div>
          )}

          <button
            onClick={handleUnlock}
            disabled={loading || !selectedUser}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              'Unlocking...'
            ) : (
              <>
                <Unlock size={20} />
                Unlock Workspace
              </>
            )}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="mt-6 pt-6 border-t">
          <p className="text-xs text-gray-500 text-center">
            This password unlocks the workspace within SyncBoard.
            <br />
            File access is controlled by your sync service (Dropbox, Git, etc.).
          </p>
        </div>
      </div>
    </div>
  );
}
