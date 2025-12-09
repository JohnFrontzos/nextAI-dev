# Implementation Tasks

## Pre-implementation

- [x] Verify current state - list all skills in `.claude/skills/nextai/`
- [x] Verify each skill has valid SKILL.md file with YAML frontmatter
- [x] Count current skill invocations in command templates (should be 9)
- [x] Document current directory structure for rollback reference
- [x] Verify `.claude/skills/` directory is writable

## Core Implementation

### Phase 1: Move Skills to Root

- [x] Move `documentation-recaps` from `.claude/skills/nextai/` to `.claude/skills/`
- [x] Move `executing-plans` from `.claude/skills/nextai/` to `.claude/skills/`
- [x] Move `refinement-questions` from `.claude/skills/nextai/` to `.claude/skills/`
- [x] Move `refinement-spec-writer` from `.claude/skills/nextai/` to `.claude/skills/`
- [x] Move `reviewer-checklist` from `.claude/skills/nextai/` to `.claude/skills/`
- [x] Move `root-cause-tracing` from `.claude/skills/nextai/` to `.claude/skills/`
- [x] Move `systematic-debugging` from `.claude/skills/nextai/` to `.claude/skills/`
- [x] Remove empty `.claude/skills/nextai/` directory

### Phase 2: Update Command Templates

#### Source templates (`resources/templates/commands/`)
- [x] Update `/resources/templates/commands/complete.md` - change `Skill("nextai:documentation-recaps")` to `Skill("documentation-recaps")` (2 occurrences)
- [x] Update `/resources/templates/commands/implement.md` - change `Skill("nextai:executing-plans")` to `Skill("executing-plans")` (1 occurrence)
- [x] Update `/resources/templates/commands/refine.md` - change `Skill("nextai:refinement-questions")` to `Skill("refinement-questions")` (1 occurrence)
- [x] Update `/resources/templates/commands/refine.md` - change `Skill("nextai:refinement-spec-writer")` to `Skill("refinement-spec-writer")` (2 occurrences)
- [x] Update `/resources/templates/commands/refine.md` - change `Skill("nextai:root-cause-tracing")` to `Skill("root-cause-tracing")` (1 occurrence)
- [x] Update `/resources/templates/commands/refine.md` - change `Skill("nextai:systematic-debugging")` to `Skill("systematic-debugging")` (1 occurrence)
- [x] Update `/resources/templates/commands/review.md` - change `Skill("nextai:reviewer-checklist")` to `Skill("reviewer-checklist")` (1 occurrence)

#### Runtime templates (`.nextai/templates/commands/`) - DISCOVERED DURING REVIEW FIX
- [x] Update `/.nextai/templates/commands/complete.md` - remove `nextai:` prefix (2 occurrences)
- [x] Update `/.nextai/templates/commands/implement.md` - remove `nextai:` prefix (1 occurrence)
- [x] Update `/.nextai/templates/commands/refine.md` - remove `nextai:` prefix (5 occurrences)
- [x] Update `/.nextai/templates/commands/review.md` - remove `nextai:` prefix (1 occurrence)

### Phase 3: Sync to AI Client

- [x] Run `nextai sync` to propagate template changes to `.claude/commands/`
- [x] Verify sync completed successfully (check exit code)

## Verification

### Structure Verification

- [x] List `.claude/skills/` and verify 8 direct children (7 NextAI skills + skill-creator)
- [x] Verify `.claude/skills/nextai/` directory no longer exists
- [x] Verify each moved skill directory contains SKILL.md file
- [x] Verify SKILL.md files were not modified during move (spot check 2-3)

### Template Verification

- [x] Search all templates for "nextai:" prefix in Skill invocations (should find 0 matches)
- [x] Count non-namespaced skill invocations in templates (should be 9)
- [x] Verify synced commands in `.claude/commands/` have updated invocations

### Discovery Verification

- [ ] MANUAL: Start new Claude Code conversation
- [ ] MANUAL: Check system prompt `<available_skills>` section
- [ ] MANUAL: Verify all 7 NextAI skills are listed (documentation-recaps, executing-plans, refinement-questions, refinement-spec-writer, reviewer-checklist, root-cause-tracing, systematic-debugging)
- [ ] MANUAL: Verify skill-creator also appears (should be 8 total)

### Functional Verification

- [ ] MANUAL: Use Skill tool in test conversation: `Skill("documentation-recaps")`
- [ ] MANUAL: Verify skill loads successfully without "Unknown skill" error
- [ ] MANUAL: Test at least 2 additional skills (executing-plans, reviewer-checklist)
- [ ] MANUAL: Verify each skill loads its prompt content

## Integration Tests

- [ ] MANUAL: Create test feature with `nextai create "Test skill loading"`
- [ ] MANUAL: Run `/nextai-refine` command on test feature
- [ ] MANUAL: Verify product-owner subagent loads refinement-questions skill successfully
- [ ] MANUAL: Verify technical-architect subagent loads refinement-spec-writer skill successfully
- [ ] MANUAL: Verify no "Unknown skill" errors occur during refinement
- [ ] MANUAL: Clean up test feature after verification

## Post-Implementation

- [x] Update `architecture.md` to reflect skill invocation pattern (remove `nextai:` namespace references)
- [x] Update `conventions.md` to document that skills must be direct children of `.claude/skills/`
- [x] Add note to investigation file that issue is resolved
