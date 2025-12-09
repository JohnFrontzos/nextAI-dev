# Feature Complete: Fix Subagent Skills Not Loading

## Summary
Fixed a critical bug where NextAI subagents were not using their assigned skills during execution. While agent definitions correctly specified skills in frontmatter, Claude Code does not automatically enforce the skills field when spawning subagents via the Task tool. The fix adds explicit FIRST ACTION instructions to all command templates, directing subagents to load their assigned skills using the Skill tool before beginning work.

## Key Changes
- Updated 4 command templates with explicit skill loading instructions for 8 subagent delegation points
- Added consistent FIRST ACTION pattern requiring Skill tool invocation as first step
- Updated skill references to use correct namespace prefix (nextai:skill-name)
- All changes implemented through template modifications only - no TypeScript code changes required

## Implementation Highlights

### Templates Updated
- `/resources/templates/commands/implement.md` - Developer loads executing-plans
- `/resources/templates/commands/refine.md` - Product-owner loads refinement-questions, technical-architect loads refinement-spec-writer, investigator loads root-cause-tracing and systematic-debugging
- `/resources/templates/commands/review.md` - Reviewer loads reviewer-checklist
- `/resources/templates/commands/complete.md` - Document-writer loads documentation-recaps (two delegation points)

### Agent-to-Skill Mappings
- developer → nextai:executing-plans
- investigator → nextai:root-cause-tracing, nextai:systematic-debugging
- product-owner → nextai:refinement-questions
- technical-architect → nextai:refinement-spec-writer
- reviewer → nextai:reviewer-checklist
- document-writer → nextai:documentation-recaps

### Pattern Applied
Each subagent delegation now includes:
```markdown
FIRST ACTION - Load Your Skill:
Before starting [work type], you MUST load your assigned skill:
1. Use the Skill tool: Skill("nextai:skill-name")
2. This skill provides [purpose]
3. Follow the skill's guidance throughout your work

Then proceed with your workflow:
```

### Key Technical Decision
Investigation revealed that none of the reference frameworks (Superpowers, CodeMachine, Agent OS) automatically load skills for subagents. All use either embedded instructions in prompts or explicit Skill tool invocation. NextAI adopted the explicit invocation pattern as the most maintainable solution that works within Claude Code's existing architecture.

## Testing Notes
- Initial implementation used Skill("skill-name") syntax which failed with "Unknown skill" errors
- Fixed by adding namespace prefix: Skill("nextai:skill-name") to all 9 skill invocations
- Verified changes synced correctly to .claude/commands/ directory
- All 8 delegation points successfully updated with consistent pattern
- Testing confirmed skill namespace fix works correctly (see testing.md)

## Related Documentation
- Root cause analysis and reference framework research: `nextai/done/20251209_subagents-not-using-assigned-s/planning/investigation.md`
- Technical specification: `nextai/done/20251209_subagents-not-using-assigned-s/spec.md`
- Implementation tasks: `nextai/done/20251209_subagents-not-using-assigned-s/tasks.md`
- Code review: `nextai/done/20251209_subagents-not-using-assigned-s/review.md`
- Testing results: `nextai/done/20251209_subagents-not-using-assigned-s/testing.md`

## Files Modified
- /resources/templates/commands/implement.md
- /resources/templates/commands/refine.md
- /resources/templates/commands/review.md
- /resources/templates/commands/complete.md
- /.claude/commands/nextai-implement.md (synced)
- /.claude/commands/nextai-refine.md (synced)
- /.claude/commands/nextai-review.md (synced)
- /.claude/commands/nextai-complete.md (synced)

## Completed
2025-12-09
