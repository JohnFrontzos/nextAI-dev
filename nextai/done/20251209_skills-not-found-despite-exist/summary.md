# Feature Summary: Fix Skill Discovery for Namespaced Skills

## Overview

This bug fix resolves a critical issue where NextAI skills placed in subdirectories under `.claude/skills/nextai/` were not discoverable by Claude Code. The investigation revealed that Claude Code only discovers skills that are DIRECT children of `.claude/skills/`, not skills nested in subdirectories. The solution flattened the directory structure by moving all 7 NextAI skills to the root `.claude/skills/` directory and updating all skill invocations to remove the `nextai:` namespace prefix.

## Key Changes

**Skills Relocated:**
- Moved 7 NextAI skills from `.claude/skills/nextai/*` to `.claude/skills/*`:
  - documentation-recaps
  - executing-plans
  - refinement-questions
  - refinement-spec-writer
  - reviewer-checklist
  - root-cause-tracing
  - systematic-debugging
- Removed empty `.claude/skills/nextai/` directory

**Templates Updated:**
- Updated 9 skill invocations across 4 command templates:
  - `resources/templates/commands/complete.md` (2 occurrences)
  - `resources/templates/commands/implement.md` (1 occurrence)
  - `resources/templates/commands/refine.md` (5 occurrences)
  - `resources/templates/commands/review.md` (1 occurrence)
- Also updated runtime templates in `.nextai/templates/commands/` (4 files)
- Changed from `Skill("nextai:skill-name")` to `Skill("skill-name")`

**Configuration Updated:**
- Modified `src/core/sync/claude-code.ts` to change `skillsDir` from `'skills/nextai'` to `'skills'`
- Re-ran `nextai sync` to propagate changes to `.claude/commands/`

**Documentation Updated:**
- Updated `nextai/docs/conventions.md` with flat directory requirement
- Updated `nextai/docs/architecture.md` to reflect new skill structure
- Marked investigation file as resolved

## Implementation Highlights

**Root Cause Identified:**
Claude Code's skill discovery system only scans direct children of `.claude/skills/` for directories containing `SKILL.md` files. Nested subdirectories (namespaces) are not traversed, resulting in all NextAI skills being invisible to the system despite having correct SKILL.md format.

**Solution Strategy:**
Rather than requesting Claude Code enhancement for subdirectory support, the solution adopted the pattern used by the official `skill-creator` skill - placing skills as direct children of `.claude/skills/`. This approach:
- Works immediately with Claude Code's current architecture
- Aligns with the official pattern
- Requires no external tool changes
- Is fully reversible if namespace support is added later

**Two-Phase Fix:**
This fix builds on the previous feature `20251209_subagents-not-using-assigned-s`:
1. Previous fix: Added explicit skill loading instructions to command templates
2. This fix: Made skills discoverable so they can be loaded

**Critical Review Fix:**
Initial implementation failed code review because templates were only updated in `resources/templates/commands/` while sync was reading from `.nextai/templates/commands/`. The fix correctly updated BOTH template locations before re-running sync.

## Testing Notes

**Automated Tests: COMPLETE**
- Structure verification: All 7 skills are direct children of `.claude/skills/`
- Template verification: 0 occurrences of `nextai:` prefix, 9 correct invocations
- Sync verification: Synced commands in `.claude/commands/` match templates
- File integrity: SKILL.md files preserved with correct YAML frontmatter

**Manual Tests: PASSED**
- Fresh Claude Code conversation shows all 8 skills in `<available_skills>` section
- Skill invocations work correctly without namespace prefix
- Skills load successfully without "Unknown skill" errors
- Logged in `testing.md` on 12/09/2025

## Related Documentation

**Technical Specification:**
`nextai/done/20251209_skills-not-found-despite-exist/spec.md` - Full technical details of the fix

**Investigation Report:**
`nextai/done/20251209_skills-not-found-despite-exist/planning/requirements.md` - Root cause analysis

**Updated Conventions:**
`nextai/docs/conventions.md` - Documents that skills must be direct children of `.claude/skills/`

**Updated Architecture:**
`nextai/docs/architecture.md` - Reflects flat skill structure pattern

**Related Fix:**
`nextai/done/20251209_subagents-not-using-assigned-s/summary.md` - Previous fix that added explicit skill loading

## Completed

2025-12-10