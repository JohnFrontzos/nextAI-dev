# Requirements: Skills Not Found Despite Existing Files

## Bug Summary

Subagents spawned via Task tool fail to load assigned skills with "Unknown skill" errors, even though the skill files exist at `.claude/skills/nextai/*/SKILL.md`.

## Root Cause (from Investigation)

Claude Code only discovers skills that are **direct children** of `.claude/skills/`, not skills in subdirectories. Our skills are nested under a `nextai/` namespace subdirectory, placing them outside Claude Code's discovery scope.

## Requirements

### R1: Move Skills to Root
Move all 7 NextAI skills from `.claude/skills/nextai/*` to `.claude/skills/*`:
- documentation-recaps
- executing-plans
- refinement-questions
- refinement-spec-writer
- reviewer-checklist
- root-cause-tracing
- systematic-debugging

### R2: Remove Empty Namespace Directory
Delete the empty `.claude/skills/nextai/` directory after moving skills.

### R3: Update Skill Invocations
Update all command templates to remove the `nextai:` namespace prefix:
- Change `Skill("nextai:skill-name")` to `Skill("skill-name")`

### R4: Sync to AI Client
Run `nextai sync` to propagate template changes to `.claude/commands/`.

### R5: Verify Discovery
Confirm skills appear in `<available_skills>` section of system prompt after fix.

## Acceptance Criteria

- [ ] All 7 skills are direct children of `.claude/skills/`
- [ ] Empty `nextai/` directory is removed
- [ ] All 9 skill invocations in templates use new syntax (no namespace prefix)
- [ ] Synced commands in `.claude/commands/` reflect the changes
- [ ] Skills are discoverable by Claude Code (appear in available_skills)
- [ ] Subagents can successfully load skills without "Unknown skill" errors

## Out of Scope

- Requesting Claude Code enhancement for subdirectory support
- Changing skill file formats or content
- Adding new skills
