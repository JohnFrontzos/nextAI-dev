# Version-aware Auto-update Sync

## Overview

Enhance the `nextai sync` command to automatically detect when the npm package has been updated and force-update configuration files accordingly. This eliminates the need for users to manually run `--force` after npm updates, while providing escape hatches for advanced users who want to maintain custom configurations.

## Requirements Summary

### Core Functionality
1. Compare package version (from package.json) vs stored version (session.json)
2. Use semver library for proper version comparison (not string comparison)
3. If package is newer, automatically force-update all configuration files
4. Handle missing session.json by treating as version "0.0.0"
5. Update stored version in session.json after successful sync

### CLI Flags
- `--force`: Bypass version checking entirely, always force-update
- `--no-auto-update`: Skip automatic version-based updates (opt-out)
- `--dry-run`: Show what would be updated without making changes (already exists)

### Safety & UX
- Explicit safety check preventing modification to user content directories (nextai/docs/, nextai/todo/, nextai/done/)
- User-friendly output with emoji and per-category counts
- Clear messaging when auto-update is triggered

## Technical Approach

### Version Comparison Logic

The sync workflow will follow this decision tree:

```
1. Check CLI flags first
   ├─ If --force → Skip all version checks, force-update everything
   ├─ If --no-auto-update → Skip version comparison, proceed with normal sync
   └─ Otherwise → Continue to version comparison

2. Compare versions (only if not skipped above)
   ├─ Get package version from getPackageVersion()
   ├─ Get session version from loadSession() or default to "0.0.0"
   └─ Use semver.gt(packageVersion, sessionVersion)
       ├─ If true → Auto-update (set force: true internally)
       └─ If false → Normal sync (respect existing files)

3. Execute sync with determined options
   └─ Call configurator.sync() with modified SyncOptions

4. Update session.json with current package version
   └─ Only if sync succeeded
```

### Version Storage

Session structure (already exists):
```typescript
{
  timestamp: "2025-12-09T12:00:00.000Z",
  cli_version: "0.1.0"
}
```

The `cli_version` field already exists and stores the version. We just need to:
1. Read it before sync
2. Compare using semver
3. Update it after successful sync

### Protected Directories Safety Check

Add validation in the sync base class to prevent accidental modification of user content:

```typescript
// In base.ts or as a utility function
const PROTECTED_PATHS = [
  'nextai/docs',
  'nextai/todo',
  'nextai/done',
];

function validateSyncPath(targetPath: string, projectRoot: string): void {
  const relativePath = path.relative(projectRoot, targetPath);
  for (const protectedPath of PROTECTED_PATHS) {
    if (relativePath.startsWith(protectedPath)) {
      throw new Error(`Sync attempted to modify protected path: ${protectedPath}`);
    }
  }
}
```

This check should be called before any file write operation in the sync process.

## Architecture

### Modified Components

#### 1. CLI Layer (`src/cli/commands/sync.ts`)
- Add `--no-auto-update` flag to commander options
- Implement version comparison logic before calling syncToClient
- Enhance output formatting with emoji and categories
- Update dry-run output to show version information

#### 2. Core Sync Layer (`src/core/sync/index.ts`)
- Add version update after successful sync
- Pass modified SyncOptions with auto-detected force flag

#### 3. Sync Base (`src/core/sync/base.ts`)
- Add protected path validation utility
- Ensure validation is called before file writes

#### 4. Utilities (`src/cli/utils/config.ts`)
- Add `loadSession()` function to read session.json
- Handle missing session.json gracefully (return default)
- Existing `updateSession()` already works for writing

#### 5. Type Definitions (`src/types/index.ts`)
- Extend SyncOptions with `noAutoUpdate?: boolean` flag
- Add `autoUpdateTriggered?: boolean` to SyncResult for tracking

### Data Flow

```
sync command
  ├─ Parse flags: --force, --no-auto-update, --dry-run
  ├─ Get package version: getPackageVersion()
  ├─ Load session: loadSession() → session.json or default
  ├─ Version comparison (if not skipped)
  │   └─ semver.gt(pkgVersion, sessionVersion) → shouldAutoUpdate
  ├─ Determine final force flag
  │   ├─ force = options.force (explicit --force)
  │   ├─ force = shouldAutoUpdate && !options.noAutoUpdate
  │   └─ Pass to syncToClient()
  ├─ Execute sync: syncToClient(projectRoot, client, options)
  │   └─ Protected path validation in base.sync()
  ├─ Display results with enhanced formatting
  └─ Update session: updateSession(projectRoot, packageVersion)
```

## Implementation Details

### Version Comparison

Install semver package:
```bash
npm install semver
npm install --save-dev @types/semver
```

Usage in sync command:
```typescript
import semver from 'semver';

const packageVersion = getPackageVersion();
const session = loadSession(projectRoot);
const sessionVersion = session?.cli_version || '0.0.0';

const shouldAutoUpdate = semver.gt(packageVersion, sessionVersion);
```

### Session Loading

Add new function to `src/cli/utils/config.ts`:
```typescript
export function loadSession(projectRoot: string): Session | null {
  const sessionPath = getSessionPath(projectRoot);
  if (!existsSync(sessionPath)) {
    return null;
  }
  try {
    const raw = readJson<unknown>(sessionPath);
    const result = SessionSchema.safeParse(raw);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
```

### Enhanced Output Formatting

Current output:
```
✓ Synced to Claude Code
  → Commands: 21
  → Agents: 7
  → Skills: 7
```

New output with auto-update:
```
⚠ NextAI outdated (v0.1.0 → v0.2.0)
Updating from package...
  → Commands: 21 (updated)
  → Agents: 7 (updated)
  → Skills: 7 (updated)
✓ Synced to Claude Code
```

New output with dry-run:
```
ℹ Dry run: would sync to Claude Code
⚠ NextAI outdated (v0.1.0 → v0.2.0)
Would auto-update from package...
  → Commands: 21 (would update)
  → Agents: 7 (would update)
  → Skills: 7 (would update)
```

Implementation:
```typescript
// Before sync
if (shouldAutoUpdate && !options.noAutoUpdate) {
  logger.warn(`NextAI outdated (v${sessionVersion} → v${packageVersion})`);
  logger.info(options.dryRun ? 'Would auto-update from package...' : 'Updating from package...');
}

// After sync (modify existing output)
const updateSuffix = shouldAutoUpdate
  ? (options.dryRun ? ' (would update)' : ' (updated)')
  : '';

logger.subItem(`Commands: ${result.commandsWritten.length}${updateSuffix}`);
logger.subItem(`Agents: ${result.agentsSynced.length}${updateSuffix}`);
logger.subItem(`Skills: ${result.skillsSynced.length}${updateSuffix}`);
```

### Protected Path Validation

Add to `src/core/sync/base.ts`:
```typescript
export const PROTECTED_PATHS = [
  'nextai/docs',
  'nextai/todo',
  'nextai/done',
] as const;

export function validateSyncPath(targetPath: string, projectRoot: string): void {
  const relativePath = path.relative(projectRoot, targetPath);

  for (const protectedPath of PROTECTED_PATHS) {
    if (relativePath.startsWith(protectedPath)) {
      throw new NextAIError(
        ERROR_CODES.SYNC_CONFLICT,
        'Cannot modify protected directory',
        `Sync attempted to write to: ${protectedPath}`,
        ['This is a NextAI bug - please report it']
      );
    }
  }
}
```

Call validation before writes in `claude-code.ts` and `opencode.ts`:
```typescript
// Before writeFileSync
validateSyncPath(targetPath, projectRoot);
writeFileSync(targetPath, content);
```

## API/Interface Changes

### SyncOptions Extended
```typescript
export interface SyncOptions {
  force?: boolean;
  noAutoUpdate?: boolean;  // NEW
}
```

### SyncResult Extended
```typescript
export interface SyncResult {
  commandsWritten: string[];
  skillsSynced: string[];
  agentsSynced: string[];
  warnings: string[];
  skipped: string[];
  autoUpdateTriggered?: boolean;  // NEW - for tracking
}
```

### New Utility Function
```typescript
export function loadSession(projectRoot: string): Session | null;
```

## Data Model

### Session Schema (existing, no changes needed)
```typescript
{
  timestamp: string;      // ISO 8601 datetime
  cli_version: string;    // semver format: "0.1.0"
}
```

The schema already supports our needs. We just need to:
1. Read it before sync
2. Update it after sync
3. Handle missing file gracefully

## Security Considerations

### Protected Directory Safeguard

The explicit path validation prevents any bugs in sync logic from accidentally modifying user content. This is a defensive measure that adds an extra safety layer.

**Why it's critical:**
- `nextai/docs/` contains user-written documentation
- `nextai/todo/` contains active work (specs, tasks, code)
- `nextai/done/` contains completed feature archives

These directories should NEVER be touched by sync, even if there's a bug elsewhere.

**Implementation strategy:**
- Validate ALL file writes in sync operations
- Fail fast with clear error message
- Include "this is a bug" messaging to users

### Version Trust

We trust package.json version and session.json version:
- package.json comes from npm package metadata
- session.json is written by our own code
- No user input validation needed for version comparison

### Opt-out Flag

The `--no-auto-update` flag allows users to:
- Keep custom modifications to templates
- Test features before updating
- Work offline with old versions

This provides an escape hatch while keeping the default behavior user-friendly.

## Error Handling

### Missing Session File
```typescript
const session = loadSession(projectRoot);
const sessionVersion = session?.cli_version || '0.0.0';
```
Default to "0.0.0" to trigger update on first sync.

### Invalid Version Format
```typescript
const sessionVersion = session?.cli_version || '0.0.0';
if (!semver.valid(sessionVersion)) {
  // Log warning but don't fail
  logger.warn('Invalid session version, treating as 0.0.0');
  sessionVersion = '0.0.0';
}
```

### Sync Failure During Auto-update
```typescript
try {
  const result = await syncToClient(projectRoot, client, options);
  // Only update session if sync succeeded
  updateSession(projectRoot, packageVersion);
} catch (error) {
  // Don't update session.json if sync failed
  throw error;
}
```

This ensures we retry auto-update on next sync if the current one fails.

### Protected Path Violation
```typescript
// Throws NextAIError with clear message
validateSyncPath(targetPath, projectRoot);
// User sees: "Cannot modify protected directory: nextai/docs"
// Message includes: "This is a NextAI bug - please report it"
```

## Testing Strategy

### Unit Tests

**Version Comparison Logic:**
- Test `semver.gt()` with various version pairs
- Test missing session.json handling (defaults to "0.0.0")
- Test invalid version formats

**Protected Path Validation:**
- Test rejection of paths under nextai/docs/, nextai/todo/, nextai/done/
- Test acceptance of valid paths (.claude/, .opencode/)
- Test absolute vs relative path handling

**Session Management:**
- Test loadSession with valid session.json
- Test loadSession with missing file
- Test loadSession with invalid JSON
- Test updateSession writes correct format

### Integration Tests

**Auto-update Flow:**
```typescript
describe('Auto-update sync', () => {
  it('triggers auto-update when package is newer', async () => {
    // Setup: Create session.json with old version
    // Execute: Run sync with newer package version
    // Assert: Files are force-updated, session.json updated
  });

  it('skips auto-update with --no-auto-update flag', async () => {
    // Setup: Create session.json with old version
    // Execute: Run sync with --no-auto-update
    // Assert: Files are not overwritten, session.json NOT updated
  });

  it('bypasses version check with --force flag', async () => {
    // Setup: Create session.json with same version
    // Execute: Run sync with --force
    // Assert: Files are overwritten, session.json updated
  });
});
```

**Protected Directory Tests:**
```typescript
describe('Protected path validation', () => {
  it('prevents writing to nextai/docs/', async () => {
    // Mock sync to attempt write to nextai/docs/test.md
    // Assert: Throws error before write occurs
  });

  it('allows writing to .claude/ directories', async () => {
    // Execute sync to .claude/commands/
    // Assert: Succeeds without error
  });
});
```

### Manual Testing Scenarios

1. Fresh install (no session.json)
   - Run `nextai sync`
   - Verify all files created
   - Verify session.json created with current version

2. Upgrade scenario (old session.json)
   - Create session.json with version "0.0.1"
   - Update package.json to version "0.2.0"
   - Run `nextai sync`
   - Verify auto-update messaging
   - Verify session.json updated to "0.2.0"

3. No-auto-update flag
   - Setup same as #2
   - Run `nextai sync --no-auto-update`
   - Verify existing files not overwritten
   - Verify session.json NOT updated

4. Dry-run with auto-update
   - Setup same as #2
   - Run `nextai sync --dry-run`
   - Verify "would update" messaging
   - Verify no files actually changed
   - Verify session.json NOT updated

5. Force flag
   - Create session.json with same version as package
   - Modify a command file manually
   - Run `nextai sync --force`
   - Verify file overwritten
   - Verify session.json timestamp updated

## Alternatives Considered

### 1. Marker-based Selective Updates
Similar to Agent-OS approach: Add version markers to individual files and only update outdated ones.

**Pros:**
- Granular control over which files update
- Could preserve custom modifications

**Cons:**
- Complex implementation
- Requires marker injection in templates
- Harder to reason about state
- Out of scope for current requirements

**Decision:** Rejected - Too complex for current needs. Force-update is simpler and safer.

### 2. Per-file Version Tracking
Track version of each synced file in session.json.

**Pros:**
- Could show which files are out of date

**Cons:**
- Much more complex data model
- Doesn't solve the core problem (users still need to update)
- Increases state management complexity

**Decision:** Rejected - Overhead not justified by benefits.

### 3. Automatic Background Updates
Update files automatically on every command run.

**Pros:**
- Users never have to think about it

**Cons:**
- Could surprise users with unexpected changes
- Sync is already explicit (run when needed)
- Adds complexity to every command

**Decision:** Rejected - Explicit is better than implicit. Users should control when sync happens.

### 4. Migration Script Pattern
Separate `nextai migrate` command for version upgrades.

**Pros:**
- Clear separation of concerns
- Could handle complex migrations

**Cons:**
- Extra step for users
- Doesn't solve the core problem (users forget to run it)
- More commands to maintain

**Decision:** Rejected - Auto-update during sync is more user-friendly.

### 5. Prompt User for Confirmation
Show diff and ask "Update? (Y/n)" before proceeding.

**Pros:**
- User has control
- Can review changes

**Cons:**
- Breaks automation (CI/CD, scripts)
- Annoying for routine updates
- Goes against "just works" philosophy

**Decision:** Rejected - Provide `--no-auto-update` flag instead for opt-out.

## Implementation Notes

### Package Version Injection

The `getPackageVersion()` function already exists and uses tsup's define feature:
```typescript
// In config.ts
export function getPackageVersion(): string {
  return process.env.PACKAGE_VERSION || '0.0.0';
}
```

The version is injected at build time via `tsup.config.ts`:
```typescript
define: {
  'process.env.PACKAGE_VERSION': JSON.stringify(packageJson.version),
}
```

This means the version is baked into the built code, ensuring consistency.

### Sync Timing

Version update happens AFTER successful sync:
```typescript
const result = await syncToClient(projectRoot, client, options);
// Only if we reach here (no error thrown)
updateSession(projectRoot, packageVersion);
```

This ensures that if sync fails midway, we'll retry the auto-update on the next sync attempt.

### Idempotency

Running sync multiple times with same version should be safe:
- First run: Auto-updates files, updates session.json
- Second run: No auto-update (versions match), skips existing files
- Result: Idempotent operation

### Compatibility with Existing Session Files

Old session files might not have `cli_version` field (if this is first feature to use it). The code handles this:
```typescript
const session = loadSession(projectRoot);
const sessionVersion = session?.cli_version || '0.0.0';
```

Missing field is treated as "0.0.0", triggering an update. After the update, the field is populated and subsequent syncs work normally.
