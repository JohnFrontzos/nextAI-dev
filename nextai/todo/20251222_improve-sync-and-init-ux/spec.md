# Improve sync and init UX

## Overview

This feature improves the user experience when upgrading NextAI by implementing auto-discovery of framework resources, better sync output messaging, and streamlining the update process for framework files. The goal is to eliminate an entire class of bugs caused by hardcoded manifests (like "missing testing-investigator"), provide clear feedback about what changed during sync, and make upgrades frictionless.

## Requirements Summary

1. Auto-Discovery: Replace hardcoded manifest in resources.ts with runtime directory scanning
2. Better Output: Show "Commands: 13 (1 new, 2 updated)" format after sync
3. Framework Files: Always update files in .nextai/ without requiring --force flag
4. Documentation: Add upgrade instructions to README.md
5. File Management:
   - .nextai/ folder: Framework-controlled, full control (add/update/remove files)
   - .claude/ folder: User space, preserve customizations (no deletions)

## Technical Approach

### Auto-Discovery Architecture

Replace the hardcoded `getResourceManifest()` function with a runtime directory scanner:

1. Scan `resources/agents/` for all .md files
2. Scan `resources/skills/` for all directories containing SKILL.md
3. Scan `resources/templates/commands/` for all .md files
4. Return the same ResourceManifest interface structure for compatibility

### Change Tracking System

Implement a three-state tracking system to detect what changed during sync:

1. Before copying, check if destination file exists (determines "new")
2. Compare file content/hash to determine if file was actually modified (determines "updated")
3. Track counts: new, updated, unchanged
4. Return enhanced CopyResult with detailed statistics

### Sync Flow Architecture

1. Update .nextai/ with latest resources from package (always, no force check needed)
2. Detect changes (new/updated/unchanged) during the copy operation
3. Sync from .nextai/ to client config directory (respecting --force flag for user space)
4. Display detailed output with counts in the new format

## Architecture

### Component Changes

1. src/core/sync/resources.ts
   - Replace getResourceManifest() with scanResourcesFromPackage()
   - Enhance CopyResult interface with detailed change tracking
   - Implement change detection in copyResourcesToNextAI()

2. src/core/scaffolding/project.ts
   - Remove force checks for .nextai/ framework files
   - Keep force checks only for user-facing operations if needed
   - Simplify copyAgentTemplates(), copySkillTemplates(), copyCommandTemplates()

3. src/cli/commands/sync.ts
   - Update output formatting to show new format
   - Display statistics from enhanced CopyResult

4. src/cli/commands/init.ts
   - Review --force flag usage (decision during implementation)
   - Ensure framework files always update

5. README.md
   - Add "Upgrading NextAI" section with clear instructions

### Data Flow

```
Package resources/
  └── Auto-discovered manifest
       ↓
  .nextai/ (framework-controlled, always updated)
       ↓ (change detection)
  Enhanced CopyResult with stats
       ↓ (sync with --force flag)
  .claude/ or other client config (user space, protected)
       ↓
  Display output with counts
```

## Implementation Details

### 1. Auto-Discovery Implementation

**New Function: scanResourcesFromPackage()**

```typescript
function scanResourcesFromPackage(): ResourceManifest {
  const resourcesDir = getResourcesDir();

  // Scan agents: all .md files in resources/agents/
  const agentsDir = join(resourcesDir, 'agents');
  const agents = existsSync(agentsDir)
    ? readdirSync(agentsDir).filter(f => f.endsWith('.md'))
    : [];

  // Scan skills: all directories containing SKILL.md
  const skillsDir = join(resourcesDir, 'skills');
  const skills = existsSync(skillsDir)
    ? readdirSync(skillsDir).filter(skill => {
        const skillFile = join(skillsDir, skill, 'SKILL.md');
        return existsSync(skillFile);
      })
    : [];

  // Scan commands: all .md files in resources/templates/commands/
  const commandsDir = join(resourcesDir, 'templates', 'commands');
  const commands = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter(f => f.endsWith('.md'))
    : [];

  return { agents, skills, commands };
}
```

**Replace getResourceManifest() call with scanResourcesFromPackage()**

This maintains the same interface but eliminates the hardcoded list.

### 2. Enhanced Change Tracking

**Updated CopyResult Interface:**

```typescript
export interface ResourceStats {
  total: number;
  new: number;
  updated: number;
  unchanged: number;
}

export interface CopyResult {
  agents: ResourceStats;
  skills: ResourceStats;
  commands: ResourceStats;
  errors: string[];
}
```

**Change Detection Logic:**

For each file being copied:
1. Check if destination exists → if not, mark as "new"
2. If exists, compare content (simple approach: readFileSync + string comparison)
3. If content differs, mark as "updated" and copy
4. If content identical, mark as "unchanged" and skip copy
5. Track counts for each category

**Alternative: Use timestamps**
- Less reliable but faster
- Could use statSync().mtime comparison
- Prefer content comparison for accuracy

### 3. Framework File Management

**Remove force checks in project.ts:**

Change this pattern in copyAgentTemplates(), copySkillTemplates(), copyCommandTemplates():

```typescript
// Before (current):
if (force || !existsSync(target)) {
  copyFileSync(source, target);
}

// After (new):
// Always copy - .nextai/ is framework-controlled
copyFileSync(source, target);
```

Note: The force parameter can be removed from these functions entirely, or kept for backward compatibility but ignored for .nextai/ operations.

### 4. Output Formatting

**New Output Format:**

```
✓ Templates updated
  Commands: 13 (1 new, 2 updated)
  Agents: 7 (no changes)
  Skills: 8 (1 new, 2 updated)
```

**Implementation:**

```typescript
function formatResourceStats(name: string, stats: ResourceStats): string {
  const changes: string[] = [];

  if (stats.new > 0) changes.push(`${stats.new} new`);
  if (stats.updated > 0) changes.push(`${stats.updated} updated`);

  const changeText = changes.length > 0
    ? changes.join(', ')
    : 'no changes';

  return `${name}: ${stats.total} (${changeText})`;
}
```

### 5. Deprecated Resource Removal

**Track and Remove Deprecated Files:**

In .nextai/ directory, we can safely remove files that no longer exist in the package:

```typescript
function removeDeprecatedResources(projectRoot: string, manifest: ResourceManifest): void {
  const nextaiDir = getNextAIDir(projectRoot);

  // Remove deprecated agents
  const existingAgents = readdirSync(join(nextaiDir, 'agents'))
    .filter(f => f.endsWith('.md'));
  for (const agent of existingAgents) {
    if (!manifest.agents.includes(agent)) {
      unlinkSync(join(nextaiDir, 'agents', agent));
    }
  }

  // Similar for skills and commands...
}
```

**Important:** Only do this for .nextai/, never for .claude/ or other user directories.

## API/Interface Changes

### ResourceManifest Interface

No changes - remains the same for backward compatibility:

```typescript
export interface ResourceManifest {
  agents: string[];
  skills: string[];
  commands: string[];
}
```

### CopyResult Interface (Enhanced)

```typescript
export interface ResourceStats {
  total: number;
  new: number;
  updated: number;
  unchanged: number;
}

export interface CopyResult {
  agents: ResourceStats;
  skills: ResourceStats;
  commands: ResourceStats;
  errors: string[];
}
```

This is a breaking change for consumers of CopyResult, but all consumers are internal (sync.ts, init.ts).

### Function Signatures

**Changed:**
- `copyResourcesToNextAI(projectRoot: string): CopyResult` - Return type changes

**Removed/Replaced:**
- `getResourceManifest(): ResourceManifest` → `scanResourcesFromPackage(): ResourceManifest`

**New:**
- `scanResourcesFromPackage(): ResourceManifest` - Auto-discover resources
- `removeDeprecatedResources(projectRoot: string, manifest: ResourceManifest): void` - Clean up .nextai/

## Data Model

No database or persistent data model changes. All changes are in-memory structures and file system operations.

### File System Structure

```
resources/                    # Package source (read-only)
├── agents/*.md              # Auto-discovered
├── skills/*/SKILL.md        # Auto-discovered
└── templates/commands/*.md  # Auto-discovered

.nextai/                     # Framework-controlled (full control)
├── agents/*.md              # Updated unconditionally
├── skills/*/SKILL.md        # Updated unconditionally
└── templates/commands/*.md  # Updated unconditionally

.claude/                     # User space (protected)
├── commands/*.md            # Synced with --force flag respect
├── agents/*.md              # Synced with --force flag respect
└── skills/*/SKILL.md        # Synced with --force flag respect
```

## Security Considerations

### File System Safety

1. Directory Traversal Prevention:
   - Use path.join() for all path operations
   - Validate that scanned directories are within expected paths
   - Filter results to ensure only expected file extensions

2. Read-Only Package Resources:
   - Never modify files in resources/ directory
   - Only read from package, write to .nextai/

3. User Space Protection:
   - Never delete user files from .claude/ or other client configs
   - Respect --force flag for user space operations
   - Only remove files from .nextai/ (framework-controlled space)

### Input Validation

1. Validate file extensions (.md files only for agents/commands)
2. Validate directory structure (SKILL.md presence for skills)
3. Handle missing directories gracefully without errors

### Error Handling

1. Wrap all file system operations in try-catch
2. Collect errors in CopyResult.errors array
3. Continue processing on individual file errors
4. Log errors but don't fail entire operation

## Error Handling

### Directory Scanning Errors

```typescript
function scanResourcesFromPackage(): ResourceManifest {
  try {
    // ... scanning logic ...
  } catch (error) {
    // Fallback to empty manifest if scanning fails
    logger.warn('Failed to scan resources, using empty manifest');
    return { agents: [], skills: [], commands: [] };
  }
}
```

### File Copy Errors

```typescript
function copyResourcesToNextAI(projectRoot: string): CopyResult {
  const result: CopyResult = {
    agents: { total: 0, new: 0, updated: 0, unchanged: 0 },
    skills: { total: 0, new: 0, updated: 0, unchanged: 0 },
    commands: { total: 0, new: 0, updated: 0, unchanged: 0 },
    errors: [],
  };

  // For each resource type
  for (const agent of manifest.agents) {
    try {
      // Copy logic with change detection
    } catch (error) {
      result.errors.push(`Failed to copy agent ${agent}: ${error}`);
    }
  }

  return result;
}
```

### Edge Cases

1. Resources directory doesn't exist: Return empty manifest, create placeholder files (existing behavior)
2. Empty resource directories: Skip gracefully, don't error
3. Malformed SKILL.md paths: Filter out during scanning
4. Permission errors: Collect in errors array, continue with other files
5. Concurrent modifications: File system operations are atomic, low risk

## Testing Strategy

### Unit Tests

1. Auto-Discovery Tests (tests/unit/core/sync/resources.test.ts):
   - Test scanResourcesFromPackage() with various directory structures
   - Test with missing directories (empty manifest)
   - Test filtering logic (.md files only, SKILL.md presence)
   - Test error handling for unreadable directories

2. Change Detection Tests:
   - Test new file detection (destination doesn't exist)
   - Test updated file detection (content differs)
   - Test unchanged file detection (content identical)
   - Test stat tracking accuracy

3. Resource Removal Tests:
   - Test removal of deprecated files from .nextai/
   - Test protection of user files in .claude/
   - Test error handling for locked files

### Integration Tests

1. End-to-End Sync Test (tests/integration/cli/sync.test.ts):
   - Test full sync with auto-discovery
   - Test output format correctness
   - Test change detection across full workflow

2. Upgrade Scenario Test:
   - Simulate package upgrade (add new skill)
   - Run sync, verify new skill appears
   - Verify output shows "1 new"

3. Downgrade Scenario Test:
   - Simulate package downgrade (remove skill)
   - Run sync, verify deprecated skill removed from .nextai/
   - Verify skill preserved in .claude/

### Manual Testing

See testing.md for manual test checklist.

## Alternatives Considered

### Alternative 1: Keep Hardcoded Manifest with Validation

**Approach:** Keep the hardcoded manifest but add CI validation to ensure it matches the actual files.

**Pros:**
- No runtime performance cost
- Explicit control over what gets synced

**Cons:**
- Still requires manual updates (just with validation)
- Doesn't solve the root problem (human error)
- Adds CI complexity

**Rejected because:** Doesn't eliminate the root cause of bugs.

### Alternative 2: Cache Discovered Manifest

**Approach:** Scan once, cache results in .nextai/manifest.json, use cache on subsequent runs.

**Pros:**
- Faster on subsequent runs
- Still eliminates hardcoded manifest

**Cons:**
- Cache invalidation complexity
- Stale cache could cause issues
- Adds complexity for minimal benefit (scanning is fast)

**Rejected because:** Directory scanning is fast enough (<10ms for ~20 files) and caching adds unnecessary complexity.

### Alternative 3: Dedicated Upgrade Command

**Approach:** Create `nextai upgrade` command instead of using `init + sync`.

**Pros:**
- Single command for users
- Clear intent

**Cons:**
- One more command to maintain
- Doesn't add functionality beyond `init + sync`
- Users still need to run `npm install` separately

**Rejected because:** Keep it simple. Two clear steps (`npm install`, `nextai init`, `nextai sync`) are better than a combined command that doesn't handle npm install.

### Alternative 4: Remove --force Flag Entirely

**Approach:** Always overwrite files in both .nextai/ and .claude/.

**Pros:**
- Simpler implementation
- Fewer flags to remember

**Cons:**
- Dangerous for user customizations in .claude/
- Could overwrite user's custom commands/agents
- Breaks trust in user space protection

**Rejected because:** User space must be protected. We can safely eliminate force checks for .nextai/ (framework space) but must preserve them for .claude/ (user space).

### Alternative 5: Git-Style Merge for User Files

**Approach:** Use three-way merge to reconcile user changes in .claude/ with framework updates.

**Pros:**
- Sophisticated conflict resolution
- Preserves both user changes and framework updates

**Cons:**
- Extremely complex implementation
- Requires parsing and understanding .md structure
- Overkill for the problem
- Merge conflicts would confuse users

**Rejected because:** Too complex. The current approach (don't overwrite without --force) is simple and predictable.
