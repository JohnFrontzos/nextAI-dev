# Feature Summary: Update Agent Templates

## Overview

This feature established a canonical base format for NextAI agents and skills, enabling multi-platform support through platform-specific transformers. Previously, agent templates existed in platform-specific formats, making it difficult to maintain consistency across Claude Code and OpenCode. Now, a single source of truth in `resources/` is automatically transformed to platform-optimized formats during sync operations.

## Key Changes

### New Infrastructure
- **Type Definitions** (`src/types/templates.ts`): Created interfaces for base format and platform-specific formats (Claude Code and OpenCode)
- **Agent Transformers** (`src/core/sync/transformers/agent.ts`): Implemented parser and transformers to convert base format to Claude Code and OpenCode formats
- **Skill Validators** (`src/core/sync/transformers/skill.ts`): Added OpenCode skill name validation with comprehensive rule checking

### Core Files Modified
- `src/core/sync/claude-code.ts`: Updated to parse base format and transform to Claude Code format, with legacy fallback
- `src/core/sync/opencode.ts`: Updated to parse base format and transform to OpenCode format, with legacy fallback

### Agent Migration
All 7 agents migrated to canonical base format in `resources/agents/`:
- `ai-team-lead.md`
- `developer.md`
- `document-writer.md`
- `investigator.md`
- `product-owner.md`
- `reviewer.md`
- `technical-architect.md`

### Directory Structure
```
resources/                          # Source of truth (NextAI canonical format)
├── agents/*.md                     # Base format agents
└── skills/*/SKILL.md               # Base format skills

.claude/                            # Claude Code platform (auto-generated)
├── agents/*.md                     # Transformed for Claude Code
└── skills/*/SKILL.md               # Skills (also readable by OpenCode)

.opencode/                          # OpenCode platform (auto-generated)
└── agent/*.md                      # Transformed for OpenCode
```

## Implementation Notes

### Base Format Design
The NextAI canonical format uses YAML frontmatter with these key characteristics:
- **Agent fields**: `id`, `description`, `role`, `tools` (object), `skillDependencies` (optional)
- **Skill fields**: `name`, `description`
- **Model omission**: No `model` field by default (both platforms support inheritance)

### Platform-Specific Transformations

**Claude Code transformations:**
- Convert `id` to `name`
- Convert `tools` object to comma-separated capitalized string (e.g., "Read, Write, Edit")
- Convert `skillDependencies` array to comma-separated `skills` string
- Keep `role` as-is

**OpenCode transformations:**
- Map `role` to `mode`
- Keep `tools` as object format
- Omit `skillDependencies` (OpenCode uses skill tool instead)
- Omit `name` field (uses filename)

### Error Handling
- Parse failures fall back to legacy format with console warnings
- Individual file errors don't block entire sync operation
- Skill name validation provides detailed warnings for OpenCode non-compliance

## Related Documentation

### Updated Files
- `src/types/templates.ts` - Template type definitions
- `src/core/sync/transformers/agent.ts` - Agent transformation logic
- `src/core/sync/transformers/skill.ts` - Skill validation logic
- `src/core/sync/claude-code.ts` - Claude Code sync with transformers
- `src/core/sync/opencode.ts` - OpenCode sync with transformers

### Reference Materials
- Specification: `nextai/done/20251224_update-agent-templates/spec.md`
- Tasks checklist: `nextai/done/20251224_update-agent-templates/tasks.md`
- Code review: `nextai/done/20251224_update-agent-templates/review.md`
- Testing results: `nextai/done/20251224_update-agent-templates/testing.md`

## Future Improvements

Two minor enhancements identified in code review (non-blocking):
1. Invoke `validateSkillName()` during sync to warn about non-compliant OpenCode skill names
2. Include error details in console.warn statements for better debuggability

## Testing

Manual testing completed successfully:
- Build passes
- Sync command works for both platforms
- Claude Code agents have correct frontmatter format (comma-separated tools, skills field)
- OpenCode agents have correct frontmatter format (object tools, mode field, no prefix)
