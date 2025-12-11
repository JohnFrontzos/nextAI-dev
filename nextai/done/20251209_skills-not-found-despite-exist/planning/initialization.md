# Bug: Skills not found despite existing files

## Description

Subagents spawned via Task tool fail to load assigned skills with "Unknown skill" errors, even though the skill files exist in the expected location.

**Error observed:**
```
<tool_use_error>Unknown skill: nextai:documentation-recaps</tool_use_error>
<tool_use_error>Unknown skill: documentation-recaps</tool_use_error>
```

## Original Request

After completing feature `20251209_subagents-not-using-assigned-s` which added explicit Skill tool invocation instructions to command templates, subagents are now attempting to load skills but receiving "Unknown skill" errors.

The previous fix successfully added the instructions, but the skills themselves are not being found by Claude Code's skill resolution system.

## Type
bug

## Initial Context

### What was fixed previously
- Feature `20251209_subagents-not-using-assigned-s` added FIRST ACTION instructions to command templates
- Templates now instruct subagents to call `Skill("nextai:documentation-recaps")` etc.
- The fix added namespace prefix `nextai:` to all skill invocations

### What's failing now
- Skills exist at `.claude/skills/nextai/<skill-name>/SKILL.md`
- All 7 skills are present with proper SKILL.md files
- Claude Code returns "Unknown skill" for both:
  - `nextai:documentation-recaps` (with namespace)
  - `documentation-recaps` (without namespace)

### Skills verified to exist:
```
.claude/skills/nextai/
├── documentation-recaps/SKILL.md
├── executing-plans/SKILL.md
├── refinement-questions/SKILL.md
├── refinement-spec-writer/SKILL.md
├── reviewer-checklist/SKILL.md
├── root-cause-tracing/SKILL.md
└── systematic-debugging/SKILL.md
```

## Potential Root Causes

1. **Subagent context doesn't inherit skill discovery** - Skills may only be available to the main conversation, not spawned subagents
2. **Namespace format incorrect** - Claude Code may use a different namespace syntax
3. **Skill registration required** - Skills may need to be explicitly registered somewhere
4. **Working directory issue** - Subagents may have different cwd, breaking relative skill paths
5. **SKILL.md format issue** - File format may not match Claude Code's expectations

## Related Files

- Previous fix: `nextai/done/20251209_subagents-not-using-assigned-s/`
- Skill files: `.claude/skills/nextai/*/SKILL.md`
- Command templates: `resources/templates/commands/*.md`
- Synced commands: `.claude/commands/nextai-*.md`

## Acceptance Criteria

- [ ] Bug is reproduced
- [ ] Root cause identified
- [ ] Fix verified - skills load successfully in subagents

## Notes

This is a follow-up to feature `20251209_subagents-not-using-assigned-s`. The previous fix was architecturally correct (adding explicit skill loading instructions), but there's an underlying issue with skill discovery/resolution in Claude Code that needs investigation.
