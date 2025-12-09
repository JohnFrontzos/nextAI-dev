# Requirements: Version-aware Auto-update Sync

## Overview
Enhance the `nextai sync` command to automatically detect when the npm package version is newer than the stored version and update configuration files accordingly.

## Problem Statement
When users run `npm update nextai`, their local `.nextai/` and `.claude/` files don't get updated because they already exist. Users are stuck on old configurations unless they manually use `--force`.

## Confirmed Requirements

### Core Functionality

1. **Version Comparison**
   - Use semver comparison (major.minor.patch)
   - Any newer version triggers an auto-update (1.0.1 > 1.0.0, 1.1.0 > 1.0.5, etc.)
   - Compare package version from `package.json` vs stored version in `session.json`

2. **Missing Session File Handling**
   - If `.nextai/state/session.json` doesn't exist, treat as version "0.0.0"
   - This triggers an update on first sync after fresh install or deleted state

3. **Partial Sync Failure Recovery**
   - Implementation choice: whatever is simpler to implement
   - Acceptable to update version after template update succeeds, even if AI client sync fails

4. **Force Flag Interaction**
   - When `--force` is passed, bypass version checking entirely
   - Force-update everything regardless of version comparison

5. **No Auto-Update Flag**
   - Add `--no-auto-update` flag for opt-out
   - Users who want to stay on old configurations can use this flag
   - Useful for testing or custom modifications

### Output & User Experience

6. **Output Format**
   - Show version change detected message with old and new versions
   - Show count of updated files per category (Commands, Agents, Skills)
   - Show final success message with sync target
   - Use emoji in messages (e.g., ⚠️ for warnings)
   - Use generic "update" messaging, not exclusively about templates

   Example output:
   ```
   ⚠️ NextAI outdated (v1.0.0 → v1.1.0)
   Updating from package...
     → Commands: 21 (updated)
     → Agents: 7 (updated)
     → Skills: 7 (updated)
   ✔ Synced to Claude Code
   ```

7. **Dry Run Support**
   - `--dry-run` flag shows what would be updated without making changes
   - Same format as normal output but with "(would update)" instead of "(updated)"

### File Handling

8. **Force Update Behavior**
   - When auto-update is triggered, force-update all configuration files
   - Ignore normal "skip existing files" behavior during auto-update
   - Applies to commands, agents, skills in `.nextai/` and AI client directories

9. **Protected Directories (CRITICAL)**
   - Add explicit safety check preventing ANY modification to:
     - `nextai/docs/`
     - `nextai/todo/`
     - `nextai/done/`
   - These directories are user content and must NEVER be touched by sync
   - Safety check should exist even if there's a bug in sync logic

### Technical Requirements

10. **Semver Library**
    - Add `semver` npm package for version comparison
    - Use proper semver comparison, not string comparison

## Out of Scope
- Marker-based selective updates (Agent-OS/OpenSpec approaches)
- Per-file version tracking
- Rollback functionality
- User confirmation prompts before auto-update

## Acceptance Criteria
- [ ] Sync command compares package version vs stored session version
- [ ] When package is newer, configurations are force-updated from resources/
- [ ] Version is updated in session.json after successful sync
- [ ] User content directories (nextai/docs/, nextai/todo/, nextai/done/) are never modified
- [ ] Clear messaging shows when auto-update is triggered with emoji
- [ ] `--dry-run` flag shows what would be updated without making changes
- [ ] `--no-auto-update` flag skips version-based auto-update
- [ ] `--force` flag bypasses version checking entirely
