# Feature: Version-aware auto-update sync

## Original Request
Version-aware sync command that auto-updates templates when package version is newer than stored version.

## Type
feature

## Description
Currently, when users run `npm update nextai` to get a new package version, their local `.nextai/` and `.claude/` files don't get updated because they already exist. Users are stuck on old templates unless they manually use `--force`.

The sync command should automatically detect when the npm package version is newer than the stored version and update templates accordingly.

## Problem Statement
```
User: npm update nextai
→ resources/ updated in node_modules
→ .nextai/ NOT updated (files exist, no --force)
→ .claude/ NOT updated (files exist, no --force)
```

Users are stuck on old templates unless they know to use `--force`.

## Proposed Solution
1. Store package version in `.nextai/state/session.json` (already exists as `cliVersion`)
2. On `nextai sync`, compare package version vs stored version
3. If package is newer:
   - Update `.nextai/templates/` from `resources/` (force)
   - Then sync to `.claude/` or `.opencode/` (force)
   - Update stored version in session.json
4. User content (`nextai/todo/`, `nextai/done/`) is never touched

## User Experience
```bash
# Normal usage - auto-updates if package is newer
nextai sync

# Output when update detected:
⚠️ NextAI templates outdated (v1.0.0 → v1.1.0)
Updating templates from package...
  → Commands: 21 (updated)
  → Agents: 7 (updated)
  → Skills: 7 (updated)
✔ Synced to Claude Code
```

## Initial Context
- Research from Agent-OS and OpenSpec shows different approaches:
  - Agent-OS: "Nuke and rebuild" core files, preserve user content in separate dirs
  - OpenSpec: Marker-based selective updates
- We're taking a simpler approach: version comparison triggers force update
- The session.json already tracks `cliVersion` field

## Reference
- Agent-OS update mechanism: `research/agent-os/scripts/project-update.sh`
- OpenSpec update mechanism: `research/OpenSpec/src/core/update.ts`
- Current sync implementation: `src/core/sync/`
- Session state: `src/cli/utils/config.ts` (updateSession function)

## Acceptance Criteria
- [ ] Sync command compares package version vs stored session version
- [ ] When package is newer, templates are force-updated from resources/
- [ ] Version is updated in session.json after successful sync
- [ ] User content (nextai/todo/, nextai/done/) is never modified
- [ ] Clear messaging shows when auto-update is triggered
- [ ] --dry-run flag shows what would be updated without making changes

## Notes
- Keep it simple: version comparison, not marker-based detection
- Consider semver comparison (major.minor.patch)
- May want to add --no-auto-update flag for users who want to stay on old templates
