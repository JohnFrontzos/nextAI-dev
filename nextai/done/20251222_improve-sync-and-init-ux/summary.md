# Feature Summary: Improve sync and init UX

## Overview

This feature eliminates an entire class of bugs caused by hardcoded resource manifests and significantly improves the upgrade experience for NextAI users. By implementing auto-discovery of framework resources, intelligent change tracking, and streamlined framework file management, users can now upgrade seamlessly with clear visibility into what changed.

## Key Changes

### 1. Auto-Discovery System
Replaced the hardcoded manifest in `src/core/sync/resources.ts` with runtime directory scanning:
- Agents: All .md files in `resources/agents/` are automatically discovered
- Skills: All directories containing `SKILL.md` in `resources/skills/` are automatically discovered
- Commands: All .md files in `resources/templates/commands/` are automatically discovered

This eliminates the need to manually update manifests when adding new resources and prevents bugs like "missing testing-investigator".

### 2. Enhanced Change Tracking
Implemented a three-state tracking system that shows users exactly what changed during sync:
- Detects new files (destination doesn't exist)
- Detects updated files (content differs using string comparison)
- Tracks unchanged files
- Displays format: "Commands: 13 (1 new, 2 updated)" or "Agents: 7 (no changes)"

### 3. Framework File Management
Simplified the update process for framework-controlled files:
- Files in `.nextai/` always update without requiring `--force` flag
- Deprecated resources are automatically removed from `.nextai/` only
- User customizations in `.claude/` or other client configs are protected
- Clear distinction between framework-controlled space and user space

### 4. Upgrade Documentation
Added comprehensive "Upgrading NextAI" section to README.md with:
- Clear 3-step upgrade process: npm install, nextai init, nextai sync
- Explanation of framework file auto-update behavior
- Example output showing change tracking format
- Reassurance about customization preservation

## Files Modified

### Core Implementation
- `src/core/sync/resources.ts` - Auto-discovery, change tracking, deprecated resource removal
- `src/core/scaffolding/project.ts` - Removed force checks for framework files
- `src/cli/commands/sync.ts` - Enhanced output formatting with detailed statistics
- `src/cli/commands/init.ts` - Documentation updates for force flag behavior

### Documentation
- `README.md` - Added "Upgrading NextAI" section with clear instructions

### Tests
- `tests/unit/core/sync/resources.test.ts` - Comprehensive test coverage for all new functionality
- All 588 tests pass in 3.59 seconds

## Implementation Highlights

### Robust Auto-Discovery
The `scanResourcesFromPackage()` function gracefully handles edge cases:
- Missing directories return empty arrays without errors
- Non-.md files are filtered out of agents and commands
- Skill directories without SKILL.md are ignored
- Results are sorted alphabetically for deterministic behavior

### Content-Based Change Detection
Uses file content comparison instead of timestamps for reliable change detection:
- Accurate detection of actual modifications
- Skips unnecessary copying of unchanged files
- Handles file encoding and line ending differences

### Framework vs User Space Separation
Clear code comments and logic distinguish between:
- `.nextai/` - Framework-controlled, full control (add/update/remove files)
- `.claude/` - User space, protected (preserve customizations)

### Comprehensive Error Handling
- Individual file errors don't halt entire operation
- Errors collected in CopyResult.errors array for batch reporting
- Graceful fallbacks for missing or unreadable directories

## Test Results

### Unit Tests
- Auto-discovery with missing directories
- Change detection for new/updated/unchanged states
- Deprecated resource removal scenarios
- Idempotency validation (running sync twice shows "no changes")
- Output formatting with various change combinations

### Integration Tests
- Full upgrade workflow simulation
- Version-aware auto-update scenarios
- Multiple missing resources handling

### Manual Testing
All manual test cases passed, including:
- Fresh init showing all files as "new"
- Second run showing "no changes"
- Framework file auto-update without --force
- User file preservation in .claude/
- Deprecated resource removal from .nextai/ only

## Related Documentation

This feature supersedes bug fix `20251222_missing-testing-investigator-s` by fixing the root cause rather than treating symptoms.

## Benefits

1. **No More Missing Resources**: New skills/agents/commands automatically appear after npm updates
2. **Clear Visibility**: Users see exactly what changed with detailed counts
3. **Frictionless Upgrades**: No need to remember --force flag for framework files
4. **User Protection**: Custom files in .claude/ are never removed
5. **Maintainability**: Adding new resources requires no code changes
