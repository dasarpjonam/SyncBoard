# Offline Authentication Feature

## Overview
This PR adds workspace-level authentication to SyncBoard, enabling password protection for workspaces while maintaining a clear separation of concerns with external sync services.

## Security Model

SyncBoard follows a **clear separation of concerns**:

### Application Layer (SyncBoard)
- **Authentication:** Workspace password prevents unauthorized app access
- **Identity:** Git-based user identification for attribution
- **Editing:** Rich file editor with change tracking

### Infrastructure Layer (External Sync)
- **Authorization:** Folder/repo access controls who can participate
- **Versioning:** Handles conflicts and history
- **Distribution:** Manages file synchronization

**Example Flow:**
1. User gains folder access via Dropbox share (authorization)
2. User opens workspace in SyncBoard (authentication required)
3. User edits files (tracked with their git identity)
4. Dropbox syncs changes to team (distribution)

**This design:**
- ✅ Keeps app simple and focused
- ✅ Leverages mature sync infrastructure
- ✅ Clear separation of concerns
- ✅ No reinventing the wheel

## Features Implemented

### 🔐 Workspace Password Protection
- Optional password protection for workspaces
- Encrypted password storage using SHA-256 hashing with salt
- Secure storage in `.syncboard/.auth` file
- No network dependencies - fully offline

### 👤 Git User Auto-Detection
- Automatically detects git user identity from local git config
- Pre-populates user information (name, email, GitHub handle)
- Seamless identity management without manual configuration

### 🔒 Lock/Unlock Functionality
- Lock screen UI for workspace authentication
- Manual lock button in sidebar
- Session management with in-memory state
- Optional auto-lock timer support (configurable)

### ⚙️ Settings Management
- New "Workspace Security" section in Settings
- Enable/disable password protection
- Change workspace password
- Visual indicators for protected workspaces

## Files Changed

### New Files
1. **`pmt-app/src/lib/auth.ts`** - Core authentication manager
   - Password hashing/verification
   - Session management
   - Permission calculations
   - Auto-lock timer setup

2. **`pmt-app/src/components/LockScreen.tsx`** - Lock screen UI
   - Password entry interface
   - Git user auto-detection
   - First-time password setup flow

### Modified Files
1. **`pmt-app/src/types/index.ts`**
   - Added `WorkspaceAuth`, `User`, `AuthSession`, `WorkspacePermissions` interfaces
   - Extended `WorkspaceConfig` with optional `auth` field

2. **`pmt-app/src/types/electron.d.ts`**
   - Added auth IPC API type definitions
   - Added git user info API

3. **`pmt-app/main.cjs`**
   - Added auth IPC handlers (6 new handlers)
   - Added git config reader
   - Secure file operations for auth data

4. **`pmt-app/preload.cjs`**
   - Exposed auth APIs to renderer
   - Exposed git user info API

5. **`pmt-app/src/store/WorkspaceContext.tsx`**
   - Added auth session state
   - Added `unlockWorkspace`, `lockWorkspace`, `checkWorkspaceAuth` methods
   - Integrated auth state with existing context

6. **`pmt-app/src/App.tsx`**
   - Added lock screen integration
   - Auth check on workspace load
   - Conditional rendering based on lock state

7. **`pmt-app/src/components/Sidebar.tsx`**
   - Added "Lock Workspace" button
   - Conditional visibility based on auth state

8. **`pmt-app/src/views/SettingsView.tsx`**
   - Added "Workspace Security" section
   - Password enable/disable controls
   - Status indicators

## Usage

### Enabling Password Protection
1. Open Settings
2. Navigate to "Workspace Security" section
3. Enter a password (minimum 6 characters)
4. Confirm password
5. Click "Enable Password Protection"

### Unlocking Workspace
1. Open workspace with password enabled
2. Lock screen appears automatically
3. User is auto-detected from git config
4. Enter password
5. Click "Unlock Workspace"

### Locking Workspace
- Click the lock icon in the sidebar
- Or configure auto-lock timer in workspace config

## Security Notes

**What SyncBoard Provides:**
- ✅ Workspace-level authentication (password lock)
- ✅ User identity tracking (from git config)
- ✅ Session management (in-memory only)
- ✅ Offline-only authentication
- ✅ Encrypted password storage (SHA-256 + salt)

**What External Sync Provides:**
- ✅ File access control (who can see the workspace folder)
- ✅ Version history and conflict resolution
- ✅ Distribution and synchronization
- ✅ Backup and recovery

**Security Characteristics:**
- Password protects workspace access within the app
- Files are not encrypted (readable by anyone with folder access)
- Suitable for trusted teams and personal workflows
- Authorization is handled by sync service (Dropbox, Git, etc.)

For enhanced security, use:
- Encrypted sync services (Boxcryptor, Cryptomator)
- Encrypted volumes (FileVault, BitLocker)
- VPN + network shares for infrastructure-level access control

## Configuration

Add to `config.yaml` for auto-lock:
```yaml
auth:
  enabled: true
  requirePassword: true
  lockAfterMinutes: 30  # Optional auto-lock
```

## Testing

### Manual Test Steps
1. Create/open a workspace
2. Go to Settings → Workspace Security
3. Enable password protection
4. Restart app or lock workspace
5. Verify lock screen appears
6. Enter password and unlock
7. Verify sidebar shows lock button
8. Test locking manually

### Edge Cases Tested
- First-time password setup
- Password change flow
- Disable auth flow
- Git user detection fallback
- Missing git config handling

## Breaking Changes
None - This is a backward-compatible addition. Existing workspaces continue to work without authentication.

## Future Enhancements
- [ ] Optional file encryption mode
- [ ] GitHub organization member sync
- [ ] Certificate-based authentication
- [ ] Multi-workspace session management
- [ ] Biometric authentication (Touch ID/Face ID)
- [ ] Sync service detection and status display

## Screenshots
_(Would include screenshots in a real PR)_

## Reviewer Notes
- All TypeScript types are properly defined
- No ESLint errors
- Follows existing code patterns
- Uses Web Crypto API for hashing (browser-compatible)
- Graceful fallbacks for missing git config

---

**Ready for Review** ✅
