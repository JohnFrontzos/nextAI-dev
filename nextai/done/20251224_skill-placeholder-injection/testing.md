# Testing

## Manual Test Checklist
<!-- Generated during refinement based on spec.md Testing Strategy -->

### Basic Functionality
- [ ] Run `nextai sync --force` and verify sync completes without errors
- [ ] Verify `.claude/commands/` directory contains command files
- [ ] Verify `.opencode/command/` directory contains command files (if OpenCode is synced)
- [ ] Open `.claude/commands/nextai-refine.md` and verify skill placeholders are replaced with actual content
- [ ] Open `.claude/commands/nextai-review.md` and verify reviewer-checklist skill is embedded
- [ ] Open `.claude/commands/nextai-implement.md` and verify executing-plans skill is embedded
- [ ] Open `.claude/commands/nextai-complete.md` and verify documentation-recaps skill is embedded (appears twice)

### Content Verification
- [ ] Read embedded skill content in a command file
- [ ] Compare with source file at `resources/skills/<skill-name>/SKILL.md` (or `.nextai/skills/<skill-name>/SKILL.md`)
- [ ] Verify content matches exactly (character-for-character)
- [ ] Verify markdown formatting preserved (headers, lists, code blocks)
- [ ] Verify no extra whitespace or escaping added

### Multiple Placeholders
- [ ] Open `.claude/commands/nextai-refine.md`
- [ ] Verify 4 skill placeholders are all replaced:
  - refinement-product-requirements (line ~85)
  - refinement-technical-specs (line ~112)
  - testing-investigator (line ~199)
  - refinement-technical-specs again (line ~225)
- [ ] Verify each embedded section is different (correct skill content for each)

### Missing Skill Handling
- [ ] Temporarily rename a skill directory: `mv resources/skills/reviewer-checklist resources/skills/reviewer-checklist-backup`
- [ ] Run `nextai sync --force`
- [ ] Verify warning appears: "Skill not found: reviewer-checklist - keeping placeholder"
- [ ] Open `.claude/commands/nextai-review.md`
- [ ] Verify placeholder text is still present: `[Insert full content of .claude/skills/reviewer-checklist/SKILL.md here]`
- [ ] Restore skill directory: `mv resources/skills/reviewer-checklist-backup resources/skills/reviewer-checklist`
- [ ] Run `nextai sync --force` again to verify recovery

### OpenCode Compatibility
- [ ] Run `nextai sync --force` (with OpenCode as synced client)
- [ ] Open `.opencode/command/nextai-refine.md`
- [ ] Verify skill placeholders are replaced with actual content
- [ ] Verify "Use the Skill tool" text is NOT present (OpenCode-specific removal)
- [ ] Verify embedded skills are identical to Claude Code versions

### Idempotency
- [ ] Run `nextai sync --force` twice in a row
- [ ] Compare command file contents from first and second sync
- [ ] Verify files are identical (byte-for-byte)
- [ ] Verify no double-embedding or corruption

### Regression Testing
- [ ] Run `nextai sync --force`
- [ ] Verify existing sync behavior unchanged:
  - CLI wrapper commands generated (nextai-init.md, nextai-create.md, etc.)
  - Agents synced to `.claude/agents/` and `.opencode/agent/`
  - Skills synced to `.claude/skills/`
  - Frontmatter added correctly to agents and skills
- [ ] Run a full workflow (create → refine → implement → review) to verify commands work correctly
- [ ] Verify delegated subagents receive skill content in their instructions

### Performance
- [ ] Measure sync time before implementing feature (baseline)
- [ ] Measure sync time after implementing feature
- [ ] Verify sync time increase is acceptable (<500ms for typical project)
- [ ] Check command file sizes (should be larger due to embedded content)

### Error Handling
- [ ] Create a command template with malformed placeholder: `[Insert wrong pattern here]`
- [ ] Run `nextai sync --force`
- [ ] Verify malformed placeholder is ignored (treated as normal text)
- [ ] Verify no errors thrown

---

## Test Sessions
<!-- Populated during /nextai-testing phase -->

### Session 1 - 12/24/2025, 07:00 PM
**Status:** PASS
**Notes:** All feature tests pass. Skill placeholder injection works correctly.


### Session 2 - 12/24/2025, 07:06 PM
**Status:** PASS
**Notes:** Verified skill placeholder injection works at sync time

