# Implementation Tasks

## Pre-implementation

- [ ] Install semver package: `npm install semver`
- [ ] Install semver type definitions: `npm install --save-dev @types/semver`
- [ ] Review existing sync flow in `src/core/sync/` and `src/cli/commands/sync.ts`
- [ ] Verify session.json schema in `src/schemas/session.ts` supports cli_version field

## Core Implementation

### Phase 1: Protected Path Validation

- [ ] Add PROTECTED_PATHS constant to `src/core/sync/base.ts`
- [ ] Implement validateSyncPath() utility function in `src/core/sync/base.ts`
- [ ] Add validateSyncPath() call before writeFileSync in `src/core/sync/claude-code.ts` (generateCommands method)
- [ ] Add validateSyncPath() call before writeFileSync in `src/core/sync/claude-code.ts` (syncAgents method)
- [ ] Add validateSyncPath() call before writeFileSync in `src/core/sync/claude-code.ts` (syncSkills method)
- [ ] Add validateSyncPath() call before writeFileSync in `src/core/sync/opencode.ts` (all write locations)
- [ ] Export validateSyncPath from `src/core/sync/index.ts`

### Phase 2: Session Management

- [ ] Implement loadSession() function in `src/cli/utils/config.ts`
- [ ] Add error handling for missing session.json (return null)
- [ ] Add error handling for invalid JSON in session.json (return null)
- [ ] Add error handling for failed schema validation (return null)
- [ ] Export loadSession from `src/cli/utils/config.ts`

### Phase 3: Type Definitions

- [ ] Add noAutoUpdate?: boolean to SyncOptions interface in `src/types/index.ts`
- [ ] Add autoUpdateTriggered?: boolean to SyncResult interface in `src/types/index.ts`

### Phase 4: Version Comparison Logic

- [ ] Import semver at top of `src/cli/commands/sync.ts`
- [ ] Add --no-auto-update flag to commander options in sync command
- [ ] Get package version using getPackageVersion() before sync
- [ ] Load session using loadSession() before sync
- [ ] Extract session version with fallback to "0.0.0"
- [ ] Validate session version format using semver.valid()
- [ ] Implement version comparison using semver.gt()
- [ ] Determine shouldAutoUpdate flag based on comparison and CLI flags
- [ ] Pass noAutoUpdate flag to syncToClient via SyncOptions

### Phase 5: Force Flag Logic

- [ ] Modify sync command to detect auto-update condition
- [ ] Set force: true in SyncOptions when auto-update is triggered and --no-auto-update is not set
- [ ] Ensure --force flag bypasses version checking (highest priority)
- [ ] Ensure --no-auto-update flag prevents auto-update even if version is newer

### Phase 6: Enhanced Output Formatting

- [ ] Add version outdated warning before sync when auto-update triggered
- [ ] Show "Updating from package..." message when auto-update is active
- [ ] Add "(updated)" suffix to counts when auto-update triggered
- [ ] Update dry-run output to show version information
- [ ] Add "Would auto-update from package..." message for dry-run with auto-update
- [ ] Add "(would update)" suffix to counts in dry-run with auto-update

### Phase 7: Session Update After Sync

- [ ] Move updateSession() call to after successful syncToClient() in sync command
- [ ] Wrap sync and updateSession in try-catch to prevent session update on failure
- [ ] Ensure session is updated with current package version after successful sync
- [ ] Ensure session is NOT updated if --no-auto-update is used
- [ ] Ensure session is NOT updated if --dry-run is used

### Phase 8: Result Tracking

- [ ] Add autoUpdateTriggered to result object in sync command
- [ ] Pass autoUpdateTriggered through to SyncResult in syncToClient
- [ ] Use autoUpdateTriggered flag for conditional output formatting

## Automated Tests

### Unit Tests

- [ ] Test semver.gt() with newer package version returns true
- [ ] Test semver.gt() with same version returns false
- [ ] Test semver.gt() with older package version returns false
- [ ] Test loadSession() returns session when file exists and is valid
- [ ] Test loadSession() returns null when file doesn't exist
- [ ] Test loadSession() returns null when file contains invalid JSON
- [ ] Test loadSession() returns null when schema validation fails
- [ ] Test validateSyncPath() throws error for nextai/docs/ paths
- [ ] Test validateSyncPath() throws error for nextai/todo/ paths
- [ ] Test validateSyncPath() throws error for nextai/done/ paths
- [ ] Test validateSyncPath() allows .claude/ paths
- [ ] Test validateSyncPath() allows .opencode/ paths
- [ ] Test version comparison with missing session defaults to "0.0.0"
- [ ] Test version comparison with invalid session version defaults to "0.0.0"

