# Testing

## Manual Test Checklist

### Setup
- [ ] Back up current `resources/agents/` directory
- [ ] Note current state of `.claude/` and `.opencode/` directories

### Base Format Validation
- [ ] Verify `resources/agents/product-owner.md` has base format:
  - [ ] Has `id`, `description`, `role`, `tools` fields
  - [ ] No `model` field
  - [ ] `tools` is object format
- [ ] Verify `resources/agents/technical-architect.md` has same structure
- [ ] Verify all agents follow base format

### Skill Name Validation
- [ ] Run sync with a kebab-case skill name
  - [ ] Verify warning logged about OpenCode naming
- [ ] Create skill with invalid name (uppercase, special chars)
  - [ ] Verify validation warnings

### Sync to Claude Code
- [ ] Run `nextai sync` command
- [ ] Check `.claude/agents/` directory:
  - [ ] Verify `product-owner.md` exists
  - [ ] Verify frontmatter has `name`, `description`, `tools` (comma-sep)
  - [ ] Verify `skills` field if skillDependencies defined
- [ ] Check `.claude/skills/` directory:
  - [ ] Verify skills synced correctly
  - [ ] Verify frontmatter format

### Sync to OpenCode
- [ ] Check `.opencode/agent/` directory:
  - [ ] Verify `product-owner.md` exists
  - [ ] Verify frontmatter has `description`, `mode`, `tools` (object)
  - [ ] Verify no `name` or `skills` fields
- [ ] Verify OpenCode can read skills from `.claude/skills/`

### Migration Verification
- [ ] Verify old agents renamed to `.old`
- [ ] Verify new base format agents created
- [ ] Compare content preserved correctly

### Error Handling
- [ ] Test with invalid YAML frontmatter
  - [ ] Verify error logged
  - [ ] Verify sync continues with other files
- [ ] Test with missing required fields
  - [ ] Verify warning logged
  - [ ] Verify defaults applied where possible

### End-to-End Workflow
- [ ] Run a NextAI feature workflow
- [ ] Verify agents load correctly
- [ ] Verify skills inject correctly
- [ ] Verify no errors in console

---

## Test Sessions
<!-- Populated during /testing phase -->

### Session 1 - 12/24/2025, 09:52 PM
**Status:** PASS
**Notes:** Agent template transformation verified - sync command works correctly for both Claude Code and OpenCode formats

