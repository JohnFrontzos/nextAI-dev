# Testing Checklist: Missing Investigator Skills

## Pre-Testing Setup

- [ ] Ensure all implementation tasks are complete
- [ ] Build completed successfully (`npm run build`)
- [ ] All unit tests passing (`npm test`)
- [ ] Working directory is clean or changes are committed

## Manual Test 1: Verify Skills in Resources

**Objective:** Confirm all three required skills exist and have content

- [ ] Check `C:\Dev\Git\nextai-dev\resources\skills\root-cause-tracing\SKILL.md` exists
  - [ ] File is readable and contains skill content
  - [ ] File is approximately 96 lines long

- [ ] Check `C:\Dev\Git\nextai-dev\resources\skills\systematic-debugging\SKILL.md` exists
  - [ ] File is readable and contains skill content
  - [ ] File is approximately 148 lines long

- [ ] Check `C:\Dev\Git\nextai-dev\resources\skills\testing-investigator\SKILL.md` exists
  - [ ] File is readable and contains skill content

## Manual Test 2: Verify Investigator Template Changes

**Objective:** Confirm template has been updated correctly

- [ ] Open `C:\Dev\Git\nextai-dev\resources\agents\investigator.md`

- [ ] Check frontmatter (around line 12):
  - [ ] `skillDependencies` is an array with 3 elements
  - [ ] Array contains: `"root-cause-tracing"`
  - [ ] Array contains: `"systematic-debugging"`
  - [ ] Array contains: `"testing-investigator"`

- [ ] Check "First Action" section body:
  - [ ] Contains placeholder: `[Insert full content of .claude/skills/root-cause-tracing/SKILL.md here]`
  - [ ] Contains placeholder: `[Insert full content of .claude/skills/systematic-debugging/SKILL.md here]`
  - [ ] Contains placeholder: `[Insert full content of .claude/skills/testing-investigator/SKILL.md here]`
  - [ ] Operator comment still present: `<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->`

## Manual Test 3: Claude Code Sync

**Objective:** Verify skills are embedded when syncing to Claude Code

### Setup
- [ ] Navigate to a test project (or use the nextai-dev project itself)
- [ ] Ensure project has `.nextai/` directory initialized
- [ ] Backup `.claude/agents/investigator.md` if it exists (optional)

### Execute Sync
- [ ] Run: `nextai sync --client claude --force`
- [ ] Command completes without errors
- [ ] No warnings about missing skills appear in output

### Verify Output
- [ ] Open `.claude/agents/investigator.md`

- [ ] Check frontmatter:
  - [ ] Contains `skills: root-cause-tracing, systematic-debugging, testing-investigator` (comma-separated list)
  - [ ] OR contains individual skill entries (depending on transformer implementation)

- [ ] Check body content:
  - [ ] Contains full `root-cause-tracing` skill content (search for "root cause" or skill-specific text)
  - [ ] Contains full `systematic-debugging` skill content (search for "systematic" or skill-specific text)
  - [ ] Contains full `testing-investigator` skill content
  - [ ] Does NOT contain placeholders like `[Insert full content of`
  - [ ] Operator comment is still present

- [ ] Estimate file size:
  - [ ] File is significantly larger than original template (300+ lines expected with 3 skills)

## Manual Test 4: OpenCode Sync

**Objective:** Verify skills are embedded when syncing to OpenCode

### Setup
- [ ] Use same test project as Test 3
- [ ] Backup `.opencode/agent/investigator.md` if it exists (optional)

### Execute Sync
- [ ] Run: `nextai sync --client opencode --force`
- [ ] Command completes without errors
- [ ] No warnings about missing skills appear in output

### Verify Output
- [ ] Open `.opencode/agent/investigator.md`

- [ ] Check frontmatter:
  - [ ] Contains mode or role information appropriate for OpenCode
  - [ ] Skills information present (format may differ from Claude Code)

- [ ] Check body content:
  - [ ] Contains full `root-cause-tracing` skill content
  - [ ] Contains full `systematic-debugging` skill content
  - [ ] Contains full `testing-investigator` skill content
  - [ ] Does NOT contain placeholders like `[Insert full content of`
  - [ ] Operator comment is still present

- [ ] Estimate file size:
  - [ ] File is significantly larger than original template (300+ lines expected)

## Manual Test 5: Verify Other Agents Unaffected

**Objective:** Ensure changes don't break other agents

- [ ] Check `.claude/agents/developer.md` exists and is valid
  - [ ] File has expected structure
  - [ ] No unexpected skill placeholders

- [ ] Check `.claude/agents/reviewer.md` exists and is valid
  - [ ] File has expected structure
  - [ ] No unexpected skill placeholders

- [ ] Check `.claude/agents/product-owner.md` exists and is valid
  - [ ] File has expected structure

## Manual Test 6: Edge Case - Missing Skill

**Objective:** Verify graceful handling when a skill is missing

### Setup
- [ ] Temporarily rename one skill directory (e.g., rename `root-cause-tracing` to `root-cause-tracing.bak`)

### Execute
- [ ] Run: `nextai sync --client claude --force`
- [ ] Warning appears about missing skill
- [ ] Sync completes successfully

### Verify
- [ ] Open `.claude/agents/investigator.md`
- [ ] Missing skill's placeholder is still present: `[Insert full content of .claude/skills/root-cause-tracing/SKILL.md here]`
- [ ] Other two skills are embedded correctly

### Cleanup
- [ ] Restore renamed skill directory
- [ ] Re-run sync: `nextai sync --client claude --force`
- [ ] Verify all three skills now embedded

## Regression Tests

**Objective:** Ensure existing functionality still works

- [ ] Command sync still works:
  - [ ] Run: `nextai sync --force`
  - [ ] Check `.claude/commands/nextai-implement.md` has skills embedded (existing behavior)
  - [ ] Verify `executing-plans` skill is present in implement command

- [ ] Skills sync still works:
  - [ ] Check `.claude/skills/` directory has skill subdirectories
  - [ ] Each skill has `SKILL.md` file with frontmatter

- [ ] Agent transformation works:
  - [ ] All agents in `.claude/agents/` have valid frontmatter
  - [ ] Tools are properly formatted
  - [ ] No syntax errors in any agent file

## Final Verification

- [ ] All tests above completed successfully
- [ ] No unexpected errors or warnings
- [ ] Skills appear correctly in both Claude Code and OpenCode
- [ ] Other agents remain unaffected
- [ ] System handles missing skills gracefully

## Test Session Notes

**Date:** _____________________

**Tester:** ___________________

**Issues Found:**

(List any issues discovered during testing)

**Additional Observations:**

(Note any unexpected behavior, warnings, or areas for improvement)
