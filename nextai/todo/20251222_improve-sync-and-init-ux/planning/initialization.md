# Feature: Improve sync and init UX

## Original Request
Implement several UX improvements based on product owner recommendations to make upgrading and syncing NextAI smoother for users.

## Type
feature

## Description
This feature bundles related improvements to the sync and init commands:

### 1. Auto-Discovery for Resources
Replace the hardcoded manifest in `resources.ts` with auto-discovery:
- Scan `resources/agents/` directory for all `.md` files
- Scan `resources/skills/` directory for all skill folders with `SKILL.md`
- Scan `resources/templates/commands/` directory for all `.md` files
- Automatically include all files found (no need to update manifest when adding new resources)
- Optional: Use a blocklist for any files to explicitly exclude

**Benefit:** New skills/agents are automatically included when package updates - prevents the "missing testing-investigator" class of bugs.

### 2. Better User Communication During Sync
Show users what changed after sync:
```
✓ Templates updated
  Commands: 13 (1 new: some-command)
  Agents: 7 (no changes)
  Skills: 8 (1 new: testing-investigator)
```

### 3. Simplify Init Behavior (Remove --force Requirement)
Framework files should always be updated to latest version:
- `.nextai/agents/*.md` - always update
- `.nextai/skills/*/SKILL.md` - always update
- `.nextai/templates/commands/*.md` - always update

**Rationale:** These are framework-internal files, not user customizations. Users who want custom skills/agents should create new ones, not modify built-in ones.

**Options:**
- **Option A:** Remove `--force` flag entirely from init
- **Option B:** Keep `--force` for other purposes, but always update framework files regardless

### 4. Documentation Update
Add "Upgrading NextAI" section to README:
```markdown
## Upgrading NextAI

npm install nextai-dev@latest
nextai init      # Refreshes all framework templates
nextai sync      # Syncs to your AI client
```

## Related
- Bug: `20251222_missing-testing-investigator-s` - this feature prevents that class of bugs

## Affected Files
- `src/core/sync/resources.ts` - auto-discovery implementation
- `src/core/scaffolding/project.ts` - remove force check for framework files
- `src/cli/commands/init.ts` - potentially remove --force flag
- `src/cli/commands/sync.ts` - improved output messaging
- `README.md` - documentation update

## Acceptance Criteria
- [ ] Auto-discovery: New skills/agents in `resources/` are automatically detected
- [ ] Auto-discovery: Hardcoded manifest replaced with directory scanning
- [ ] Sync output: Shows count of resources and highlights new additions
- [ ] Init behavior: Framework files always updated (no --force needed)
- [ ] Documentation: README includes upgrade instructions
- [ ] Backwards compatible: Existing projects work without issues
- [ ] Tests pass

## Notes
- Never auto-delete user files (if a resource is removed from package, leave user's copy)
- No dedicated `nextai upgrade` command needed - keep it simple with init + sync
- This supersedes the bug fix for missing-testing-investigator (fixes root cause)
