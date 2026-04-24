# Authentication Feature Testing Guide

## Automated Tests

### Run Unit Tests
```bash
cd pmt-app
npm test
```

### Run Specific Test File
```bash
npm test auth.test.ts
```

### Test Coverage
```bash
npm test -- --coverage
```

---

## Manual Testing Guide

### Test Environment Setup

1. **Start the development server:**
   ```bash
   cd pmt-app
   npm run dev
   ```

2. **Create a test workspace:**
   ```bash
   mkdir ~/test-workspace
   cd ~/test-workspace
   mkdir items
   echo "types: [Task, Bug, Feature]
statuses: [To Do, In Progress, Done]
users: [Alice, Bob, Charlie]" > config.yaml
   ```

---

## Test Cases

### 1. Git User Auto-Detection

**Test:** Verify git user is automatically detected

**Prerequisites:**
```bash
# Ensure git is configured
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global github.user "yourusername"  # Optional
```

**Steps:**
1. Open SyncBoard
2. Select test workspace
3. Observe lock screen

**Expected:**
- User's git name should appear as auto-detected
- Email should be shown if available
- GitHub handle shown if configured

**Pass Criteria:**
- ✅ Git name displayed correctly
- ✅ Email displayed if set
- ✅ GitHub handle shown if set in git config

---

### 2. First-Time Password Setup

**Test:** Create workspace password

**Steps:**
1. Open workspace without `.syncboard/.auth` file
2. Lock screen appears with no password set
3. Enter new password: `TestPass123`
4. Confirm password: `TestPass123`
5. Click "Create Password"

**Expected:**
- Workspace unlocks
- File created: `~/test-workspace/.syncboard/.auth`

**Verify:**
```bash
cat ~/test-workspace/.syncboard/.auth
# Should show JSON with passwordHash and salt
```

**Pass Criteria:**
- ✅ Password created successfully
- ✅ Workspace unlocked
- ✅ `.auth` file exists and contains a password hash and salt

---

### 3. Password Validation

**Test:** Unlock with correct password

**Steps:**
1. Close and reopen SyncBoard
2. Open test workspace
3. Enter password: `TestPass123`
4. Click "Unlock Workspace"

**Expected:**
- Workspace unlocks immediately
- User identity preserved from session

**Pass Criteria:**
- ✅ Correct password unlocks workspace
- ✅ User name displayed correctly

---

### 4. Invalid Password Handling

**Test:** Reject incorrect password

**Steps:**
1. Close and reopen SyncBoard
2. Open test workspace
3. Enter password: `WrongPassword`
4. Click "Unlock Workspace"

**Expected:**
- Error message: "Invalid password"
- Workspace remains locked
- Can retry with correct password

**Pass Criteria:**
- ✅ Error message shown
- ✅ Workspace stays locked
- ✅ Can retry authentication

---

### 5. Manual Lock

**Test:** Lock workspace manually

**Prerequisites:**
- Workspace unlocked

**Steps:**
1. Click lock icon in sidebar
2. Observe lock screen

**Expected:**
- Lock screen appears immediately
- User information still visible
- Requires password to unlock again

**Pass Criteria:**
- ✅ Lock screen appears
- ✅ User info preserved
- ✅ Password required to unlock

---

### 6. Session Persistence

**Test:** Session cleared on app close

**Steps:**
1. Unlock workspace
2. Close SyncBoard completely
3. Reopen SyncBoard
4. Try to access workspace

**Expected:**
- Lock screen appears (session cleared)
- Must re-authenticate

**Pass Criteria:**
- ✅ Session not persisted across app restarts
- ✅ Authentication required again

---

### 7. Enable/Disable Auth

**Test:** Enable password protection via Settings

**Setup:**
```bash
rm -rf ~/test-workspace/.syncboard/.auth
```

**Steps:**
1. Open workspace
2. Navigate to Settings
3. Find "Workspace Security" section
4. Enter password: `NewPass456`
5. Confirm password: `NewPass456`
6. Click "Enable Password Protection"

**Expected:**
- Success message shown
- `.auth` file created
- Next workspace open requires password

**Pass Criteria:**
- ✅ Password enabled successfully
- ✅ UI updates to show "password protected"
- ✅ Auth required on next open

---

### 8. Disable Password Protection

**Test:** Remove password requirement

**Steps:**
1. Unlock workspace
2. Navigate to Settings → Workspace Security
3. Click "Disable Password Protection"
4. Confirm dialog

**Expected:**
- `.auth` file deleted
- Workspace accessible without password

**Verify:**
```bash
ls ~/test-workspace/.syncboard/.auth
# Should not exist
```

**Pass Criteria:**
- ✅ Auth disabled successfully
- ✅ `.auth` file removed
- ✅ No password required on next open

---

### 9. Password Requirements

**Test:** Validate minimum password length

**Steps:**
1. Try to set password: `abc` (too short)
2. Click "Create Password"

**Expected:**
- Error: "Password must be at least 6 characters"
- Cannot proceed

**Pass Criteria:**
- ✅ Short passwords rejected
- ✅ Clear error message

---

### 10. Password Mismatch

**Test:** Detect password confirmation mismatch

**Steps:**
1. Enter password: `Password123`
2. Confirm password: `Password456`
3. Click "Create Password"

**Expected:**
- Error: "Passwords do not match"
- Cannot proceed

**Pass Criteria:**
- ✅ Mismatch detected
- ✅ Clear error message

---

### 11. Skip Password (Optional)

**Test:** Unlock without setting password

**Steps:**
1. Create new workspace
2. Lock screen appears with no password
3. Click "Skip - Unlock without password"

**Expected:**
- Workspace unlocks
- No `.auth` file created
- Future access does not require password

**Pass Criteria:**
- ✅ Can skip password setup
- ✅ Workspace accessible
- ✅ No auth required later

---

### 12. Multiple Users (Same Machine)

**Test:** Different OS users, different identities

**Setup:**
```bash
# User A
git config --global user.name "Alice Smith"
git config --global user.email "alice@example.com"
```

**Steps:**
1. User A opens workspace
2. Verify git identity = "Alice Smith"
3. Create work item
4. Switch OS user to User B
5. Configure different git identity
6. Open same workspace
7. Verify git identity = different user

**Pass Criteria:**
- ✅ Each user identified correctly
- ✅ Same workspace password works
- ✅ Work items attributed correctly

---

### 13. Security Model Clarity

**Test:** Verify messaging is clear

**Check Lock Screen:**
- ✅ Message: "This password unlocks the workspace within SyncBoard"
- ✅ Message: "File access is controlled by your sync service"

**Check Settings:**
- ✅ Blue info box present
- ✅ Lists sync service examples (Dropbox, Git, etc.)
- ✅ Clear separation of concerns explained

---

### 14. Workspace Without Git

**Test:** Fallback when git not configured

**Setup:**
```bash
# Temporarily break git config
git config --global --unset user.name
git config --global --unset user.email
```

**Steps:**
1. Open workspace
2. Observe lock screen

**Expected:**
- No auto-detected user (or graceful fallback)
- Still allows password entry
- App doesn't crash

**Cleanup:**
```bash
# Restore git config
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

**Pass Criteria:**
- ✅ Handles missing git config gracefully
- ✅ No crashes
- ✅ Auth still works

---

### 15. File System Verification

**Test:** Verify security file structure

**Check After Setup:**
```bash
ls -la ~/test-workspace/.syncboard/
# Should show:
# .auth (if password enabled)

cat ~/test-workspace/.syncboard/.auth
# Should show JSON with:
# - enabled: true
# - requirePassword: true
# - passwordHash: "..."
# - salt: "..."
# - createdAt: "..."
```

**Verify No Plaintext:**
```bash
grep -r "TestPass123" ~/test-workspace/.syncboard/
# Should return nothing (no plaintext password)
```

**Pass Criteria:**
- ✅ Passwords are hashed
- ✅ No plaintext storage
- ✅ Salt unique per password

---

## Regression Tests

Run these before each release:

1. ✅ Can create workspace without auth
2. ✅ Can enable auth on existing workspace
3. ✅ Can disable auth on protected workspace
4. ✅ Lock/unlock cycle works multiple times
5. ✅ Session cleared on app restart
6. ✅ Git identity auto-detection works
7. ✅ Password validation works correctly
8. ✅ Error messages are clear
9. ✅ Settings UI updates correctly
10. ✅ No TypeScript errors in console

---

## Performance Tests

### Test: Large Number of Lock/Unlock Cycles

**Steps:**
1. Lock and unlock workspace 50 times
2. Monitor memory usage
3. Check for leaks

**Expected:**
- No memory leaks
- Consistent performance
- No crashes

---

## Security Validation

### ✅ Password Storage
- Passwords hashed with SHA-256
- Unique salt per password
- No plaintext storage

### ✅ Session Management
- Stored in sessionStorage only
- Cleared on app close
- Not persisted to disk

### ✅ File Permissions
- `.auth` file readable by file owner only (if OS supports)
- Stored in `.syncboard/` hidden directory

---

## Known Limitations (Document These)

1. **Authorization:** Not enforced by app (handled by sync service)
2. **File Encryption:** Files are not encrypted
3. **Bypass:** User with file system access can edit `.auth`
4. **Audit:** No built-in audit trail (use git for this)

---

## Test Results Template

```markdown
## Test Run: [Date]

**Environment:**
- OS: [macOS/Windows/Linux]
- SyncBoard Version: [version]
- Node Version: [version]

**Test Results:**
| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Git Auto-Detection | ✅ Pass | |
| 2. Password Setup | ✅ Pass | |
| 3. Password Validation | ✅ Pass | |
| 4. Invalid Password | ✅ Pass | |
| 5. Manual Lock | ✅ Pass | |
| 6. Session Persistence | ✅ Pass | |
| 7. Enable Auth | ✅ Pass | |
| 8. Disable Auth | ✅ Pass | |
| 9. Password Requirements | ✅ Pass | |
| 10. Password Mismatch | ✅ Pass | |
| 11. Skip Password | ✅ Pass | |
| 12. Multiple Users | ✅ Pass | |
| 13. Security Messaging | ✅ Pass | |
| 14. No Git Fallback | ✅ Pass | |
| 15. File Verification | ✅ Pass | |

**Issues Found:** [List any issues]

**Blockers:** [List blockers]

**Notes:** [Additional observations]
```
