# Requirements: Improve sync and init UX

## Summary
Improve the user experience when upgrading NextAI by implementing auto-discovery of framework resources, better sync output messaging, and removing the need for --force flag when updating framework files. This prevents bugs like "missing testing-investigator" and makes upgrades smoother.

## Background
Currently, adding new skills/agents/commands requires manually updating a hardcoded manifest in `resources.ts`. This causes bugs when new resources are added to the package but the manifest is not updated. Additionally, users don't get clear feedback about what changed after running sync, and the --force flag requirement for updating framework files creates friction.

## User Stories
1. **As a NextAI maintainer**, I want new resources to be automatically discovered so that I don't have to manually update manifests when adding skills/agents/commands.

2. **As a NextAI user**, I want to see what changed after running sync so that I understand what was updated in my project.

3. **As a NextAI user**, I want framework files to automatically update when I upgrade the package so that I don't have to remember to use --force.

4. **As a NextAI user**, I want clear upgrade instructions so that I know how to get the latest version of NextAI working in my project.

## Functional Requirements

### 1. Auto-Discovery for Resources

**Scope:**
- Replace hardcoded manifest in `src/core/sync/resources.ts` with directory scanning
- Auto-discover all files in `resources/agents/` (*.md files)
- Auto-discover all skills in `resources/skills/` (folders containing SKILL.md)
- Auto-discover all commands in `resources/templates/commands/` (*.md files)
- No blocklist needed - auto-discover everything in resources/

**Behavior:**
- Scan directories at runtime to build manifest
- Include all discovered files in copy operations
- Maintain backward compatibility with existing projects

**Edge Cases:**
- If resources directory doesn't exist, fall back to placeholder creation (existing behavior)
- If a directory exists but is empty, skip that resource type gracefully
- Ignore non-.md files in agents and commands directories
- Ignore skill folders that don't contain SKILL.md

### 2. Better Sync Output Messaging

**Scope:**
- Update sync command output to show detailed statistics about what changed
- Show counts for each resource type (commands, agents, skills)
- Highlight new and updated items with counts only (not names)

**Output Format:**
```
✓ Templates updated
  Commands: 13 (1 new, 2 updated)
  Agents: 7 (no changes)
  Skills: 8 (1 new, 2 updated)
```

**Requirements:**
- Track which files are new vs. existing before copying
- Track which files were actually updated (content changed)
- Display counts in a user-friendly format
- Use "no changes" when count is same and no files updated

**Edge Cases:**
- If no changes at all, show "no changes" for all categories
- If errors occur, still show what was successfully copied
- Handle both upgrade and downgrade scenarios

### 3. Framework Files Always Update

**Scope:**
- Remove force check for framework files in `.nextai/` directory
- Framework files that always update regardless of --force flag:
  - `.nextai/agents/*.md`
  - `.nextai/skills/*/SKILL.md`
  - `.nextai/templates/commands/*.md`

**Rationale:**
- `.nextai/` is framework-controlled - users should NOT customize these files
- Users who want custom skills/agents should create new ones, not modify built-in ones
- This is safe because `.nextai/` is entirely managed by the framework

**Behavior:**
- `nextai init` always overwrites framework files in `.nextai/`
- `nextai sync` updates `.nextai/` first, then syncs to client config (e.g., `.claude/`)
- --force flag behavior: Decision deferred to implementation phase

**Important Distinction:**
- `.nextai/` folder: Framework-controlled, full control, can add/update/remove files
- `.claude/` folder (or other client configs): User space, preserve user files, careful not to remove custom files

### 4. Documentation Update

**Scope:**
- Add "Upgrading NextAI" section to main README.md
- Provide clear, simple upgrade instructions

**Content:**
```markdown
## Upgrading NextAI

To upgrade to the latest version of NextAI:

1. Install the latest package:
   ```bash
   npm install nextai-dev@latest
   ```

2. Refresh framework templates:
   ```bash
   nextai init
   ```

3. Sync to your AI client:
   ```bash
   nextai sync
   ```

The framework files in `.nextai/` will be automatically updated to match the package version.
```

**Location:**
- Add new section to README.md after installation instructions

## Technical Requirements

### Files to Modify
1. `src/core/sync/resources.ts` - Implement auto-discovery
2. `src/core/scaffolding/project.ts` - Remove force check for framework files
3. `src/cli/commands/init.ts` - Potentially update --force behavior (decide during implementation)
4. `src/cli/commands/sync.ts` - Implement improved output messaging with change tracking
5. `README.md` - Add upgrade documentation

### Auto-Discovery Implementation
- Use `readdirSync()` to scan directories at runtime
- Filter results based on file patterns (*.md for agents/commands, SKILL.md for skills)
- Return same `ResourceManifest` interface structure for compatibility
- No caching needed - scanning is fast enough for small directories

### Change Tracking Implementation
- Before copying files, check if destination exists (determines "new")
- After copying, compare file contents or timestamps to determine "updated"
- Track counts in three categories: new, updated, unchanged
- Return enhanced `CopyResult` with new/updated/unchanged counts per resource type

### Sync Flow
1. Update `.nextai/` with latest resources from package (always, no force check)
2. Detect what changed (new/updated/unchanged)
3. Sync from `.nextai/` to client config directory (respecting force flag for client sync)
4. Display detailed output with counts

## Out of Scope
- Dedicated `nextai upgrade` command (keep it simple: init + sync)
- Auto-deleting deprecated resources from `.nextai/` (YES, we want to do this now!)
- Auto-deleting user files from `.claude/` or other client configs (NO, protect user customizations)
- Blocklist for excluding specific resources (not needed - auto-discover everything)
- Detailed file-by-file output (only show counts, not individual filenames)

## Acceptance Criteria
- [ ] Auto-discovery works: New skills/agents/commands in `resources/` are automatically included
- [ ] Hardcoded manifest in resources.ts is replaced with directory scanning
- [ ] Sync output shows counts with format: "Commands: 13 (1 new, 2 updated)"
- [ ] Framework files in `.nextai/` always update without --force flag
- [ ] README includes "Upgrading NextAI" section with clear instructions
- [ ] Backward compatible: Existing projects continue to work
- [ ] Tests pass
- [ ] `.nextai/` folder: Can add, update, AND remove files freely
- [ ] `.claude/` folder: Preserve user files, don't remove custom content

## Non-Functional Requirements
- Performance: Directory scanning should be fast (<100ms)
- Reliability: Handle missing directories gracefully
- Backward compatibility: Don't break existing projects
- User experience: Clear, concise output that helps users understand what changed

## Constraints
- Must work on both Windows and Unix-like systems
- Must handle case-sensitive and case-insensitive filesystems
- Must not delete user customizations in client config directories

## Dependencies
- Existing sync infrastructure (`syncToClient`, `copyResourcesToNextAI`)
- Existing file system utilities (`readdirSync`, `existsSync`, `copyFileSync`)
- Existing logger utilities for output formatting

## Open Questions (Deferred to Implementation)
1. **--force flag behavior**: Should we remove --force entirely from init, or keep it for other purposes? Decision during implementation based on code review of all --force usages.

## Visual Assets
None required - this is a CLI UX improvement without visual design elements.

## Reusability
- Leverage existing `readdirSync()` pattern from `project.ts` (see line 81, 105, 135)
- Leverage existing `CopyResult` interface from `resources.ts` (extend with new/updated counts)
- Leverage existing logger utilities for consistent output formatting
- Follow existing version comparison pattern from `sync.ts` for change detection

## Related Work
- Bug fix: `20251222_missing-testing-investigator-s` - This feature prevents that entire class of bugs
- Similar patterns in codebase:
  - `project.ts` lines 70-89: Agent template copying with force flag
  - `project.ts` lines 92-119: Skill template copying with force flag
  - `project.ts` lines 122-143: Command template copying with force flag
  - These all use `readdirSync()` for discovery - we're just moving this pattern to resources.ts

## Notes
- Framework has full control over `.nextai/` - we can add, update, AND remove files
- User space (`.claude/` etc.) requires care - preserve user customizations
- Auto-discovery eliminates entire class of "missing resource" bugs
- Simple upgrade path: `npm install` → `nextai init` → `nextai sync`
