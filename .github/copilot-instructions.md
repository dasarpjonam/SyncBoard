# SyncBoard Repository Review Instructions

## Project Overview

**SyncBoard** is an Electron-based project management desktop application built with:
- **Frontend:** React, TypeScript, Vite
- **Backend:** Electron (main process)
- **State Management:** React Context API
- **Testing:** Vitest
- **Styling:** Tailwind CSS

**Core Philosophy:** SyncBoard is a file editor with authentication, NOT a full authorization system. External sync services (Dropbox, Git, Syncthing) handle file access control.

## Architecture Principles

### Separation of Concerns

**Application Layer (SyncBoard):**
- ✅ Authentication (workspace password unlock)
- ✅ Identity (git-based user attribution)
- ✅ Editing (rich file editor with change tracking)

**Infrastructure Layer (External Sync):**
- ✅ Authorization (folder/repo access control)
- ✅ Versioning (conflict resolution, history)
- ✅ Distribution (file synchronization)

**Critical:** Do not suggest adding authorization features (roles, permissions, access control) to SyncBoard. These are intentionally delegated to external sync services.

## Review Guidelines

### 1. Security Review

#### Authentication Implementation
- **Password Hashing:** Verify SHA-256 + salt implementation in `pmt-app/src/lib/auth.ts`
- **Salt Generation:** Check cryptographically secure randomness (Web Crypto API)
- **Timing Safety:** Ensure password verification uses timing-safe comparison
- **Session Storage:** Confirm sessionStorage usage (clears on app close, no persistence)
- **Credential Storage:** Verify `.syncboard/.auth` file location and structure

#### Security Red Flags to Watch For:
- ❌ Plain text password storage
- ❌ Weak hashing algorithms (MD5, SHA1)
- ❌ Hardcoded salts or keys
- ❌ Credential leakage in logs or error messages
- ❌ Session persistence across app restarts (unless explicitly designed)

### 2. Type Safety Review

#### Type Definitions (`pmt-app/src/types/`)
- Verify interface consistency across `index.ts`, `electron.d.ts`
- Check IPC type definitions match actual handlers in `main.cjs`
- Ensure no `any` types without justification
- Validate error types and null checks

#### IPC Communication
- **Main Process:** Review handlers in `main.cjs`
- **Preload Script:** Check exposed APIs in `preload.cjs`
- **Renderer Process:** Verify usage in React components
- **Type Alignment:** Ensure types match across all three layers

### 3. Code Quality Standards

#### Testing Requirements
- **Unit Tests:** All utility functions and managers should have tests
- **Integration Tests:** Critical user flows should be tested
- **Coverage:** Aim for >80% coverage on business logic
- **Test Location:** Tests should be co-located with source files (`.test.ts`)

#### React Best Practices
- Use functional components with hooks
- Proper dependency arrays in `useEffect`, `useCallback`, `useMemo`
- Avoid prop drilling (use Context for deep state)
- Component files should be focused (single responsibility)

#### TypeScript Conventions
- Prefer interfaces over types for object shapes
- Use strict mode settings
- Avoid type assertions (`as`) unless necessary
- Export types alongside implementations

### 4. Electron-Specific Considerations

#### IPC Security
- Validate all inputs from renderer process
- Use `contextIsolation: true` in preload
- Never expose Node.js APIs directly to renderer
- Sanitize file paths to prevent directory traversal

#### File System Operations
- Always use `app.getPath()` for standard directories
- Handle file operation errors gracefully
- Respect workspace boundaries (don't access files outside workspace)
- Use async file operations to avoid blocking main process

### 5. Authentication Feature Review

#### Lock Screen Flow
- **First-time Setup:** User creates password, git user auto-detected
- **Returning User:** Enter password to unlock workspace
- **Manual Lock:** Sidebar button to lock workspace
- **Auto-lock:** Optional timer-based locking

#### Settings Management
- Workspace security section in SettingsView
- Clear messaging about SyncBoard vs. sync service roles
- Password enable/disable controls
- Visual feedback for password requirements

#### Error Handling
- Clear, actionable error messages
- Fallback for missing git configuration
- Graceful degradation if auth setup fails
- No credential leakage in error messages

### 6. Documentation Standards

#### Code Comments
- Document WHY, not WHAT (code should be self-explanatory)
- JSDoc for public APIs and complex functions
- Architecture decision records (ADRs) for major choices
- TODO comments should include issue references

#### Testing Documentation
- Test cases should have descriptive names
- Complex test setups should be commented
- Manual test guides for UI flows
- Expected behaviors clearly documented

### 7. Performance Considerations

#### Renderer Process
- Avoid blocking operations in UI thread
- Use debouncing for frequent operations (search, auto-save)
- Lazy load heavy components
- Optimize re-renders with `memo`, `useCallback`, `useMemo`

#### Main Process
- Keep IPC handlers lightweight
- Offload heavy operations to worker threads if needed
- Batch file system operations
- Cache frequently accessed data appropriately

### 8. Git-Based Identity

#### Git Configuration Detection
- Reads from local git config (`user.name`, `user.email`)
- Attempts to infer GitHub handle from git remote
- Provides fallback if git is not configured
- Never requires GitHub authentication

#### User Attribution
- Work items track `createdBy`, `lastModifiedBy`
- Uses git identity for change attribution
- No user management system (intentionally simple)

## Review Checklist

### Before Approving a PR

- [ ] **Security:** No credential leakage, proper hashing, secure storage
- [ ] **Types:** All IPC handlers have matching type definitions
- [ ] **Tests:** New features have unit tests, existing tests pass
- [ ] **Architecture:** Follows separation of concerns (auth yes, authz no)
- [ ] **Error Handling:** All error cases handled gracefully
- [ ] **Documentation:** Complex logic is documented
- [ ] **Performance:** No obvious performance issues
- [ ] **Accessibility:** UI follows basic a11y principles
- [ ] **Breaking Changes:** Clearly documented and justified
- [ ] **Backward Compatibility:** Existing workspaces continue to work

### Red Flags That Should Block Merge

- 🚨 Security vulnerabilities (credentials exposed, weak crypto)
- 🚨 Breaking changes without migration path
- 🚨 Failing tests in CI/CD
- 🚨 TypeScript compilation errors
- 🚨 Authorization features added to SyncBoard (violates architecture)
- 🚨 Network calls for authentication (should be offline-only)
- 🚨 User data loss risk (file corruption, data migration issues)

## Common Review Scenarios

### New Feature Implementation

1. **Check Architecture Fit:** Does it align with SyncBoard's scope?
2. **Review Types:** Are types defined before implementation?
3. **Verify Tests:** Are there unit tests for business logic?
4. **Check Integration:** How does it integrate with existing features?
5. **Documentation:** Is usage documented for users?

### Bug Fixes

1. **Root Cause:** Is the underlying issue identified?
2. **Test Added:** Is there a test to prevent regression?
3. **Side Effects:** Could this fix break other features?
4. **Error Handling:** Does it handle edge cases?

### Refactoring

1. **Behavior Preservation:** Does it maintain existing behavior?
2. **Test Coverage:** Do existing tests still pass?
3. **Improvement Clarity:** Is the benefit clear?
4. **Breaking Changes:** Are APIs backward compatible?

## Specific File Review Guidelines

### `pmt-app/src/lib/auth.ts`
- Core authentication logic - review thoroughly
- Password hashing must use SHA-256 + unique salt
- Session management should use sessionStorage
- No network calls (offline-only)

### `pmt-app/main.cjs`
- IPC handlers should validate inputs
- File operations should be error-safe
- No direct file system access from renderer

### `pmt-app/src/types/index.ts`
- Single source of truth for types
- Keep interfaces focused and cohesive
- Remove unused types

### `pmt-app/src/store/WorkspaceContext.tsx`
- Global state management - minimize complexity
- Avoid unnecessary re-renders
- Keep actions focused and atomic

## Testing Strategy

### Unit Tests (Vitest)
- Test business logic in isolation
- Mock external dependencies (IPC, file system)
- Use descriptive test names: `describe` → `it` pattern
- Aim for >80% coverage on critical paths

### Manual Testing
- Follow test guides in `docs/testing/`
- Test on macOS, Windows, Linux (if applicable)
- Verify git auto-detection with various git configs
- Test workspace migration scenarios

## Questions to Ask During Review

1. **Why?** Why is this change necessary?
2. **Alternatives?** Were other approaches considered?
3. **Edge Cases?** What happens when inputs are invalid?
4. **Performance?** Could this impact app responsiveness?
5. **Security?** Are there any security implications?
6. **Users?** How does this affect existing users?
7. **Tests?** How do we know this works?
8. **Maintenance?** Will this be easy to maintain?

## Resources

- **Testing Guide:** `docs/testing/AUTH_TESTING_GUIDE.md`
- **Feature Docs:** `docs/features/`
- **Architecture Decisions:** See PR descriptions and `docs/`
- **Type Definitions:** `pmt-app/src/types/`

## When in Doubt

- **Ask Questions:** Better to clarify than approve blindly
- **Request Tests:** If coverage is lacking, ask for tests
- **Suggest Simplification:** Complex solutions often hide issues
- **Check Context:** Read related code, don't review in isolation
- **Test Locally:** If unsure, check out the branch and test

---

**Remember:** SyncBoard is a simple file editor with authentication. Keep it focused, secure, and maintainable. External sync services handle the complex stuff (authorization, versioning, distribution).
