# Task: Integrate opencode Skill tool

## Original Request

Replace our custom openSkill solution with opencode's native Skill tool. opencode just shipped this feature (Dec 2024) with several improvements over our current approach.

## Type
task

## Initial Context

### What opencode's Skill Tool Provides

**Skill Discovery** - Scans multiple locations:
- `.opencode/skill/<name>/SKILL.md` - Project-local
- `~/.opencode/skill/<name>/SKILL.md` - Global
- `.claude/skills/<name>/SKILL.md` - Claude-compatible (already our format!)

**Permission System**:
```json
{
  "permission": {
    "skill": {
      "pr-review": "allow",
      "internal-*": "deny",
      "experimental-*": "ask",
      "*": "allow"
    }
  }
}
```

**Skills in Tool Description** - Available skills are listed in the Skill tool's description, so agents always see what's available:
```xml
<available_skills>
  <skill><name>git-release</name><description>Create releases</description></skill>
</available_skills>
```

**Agent Permission Override** - Per-agent skill permissions in frontmatter:
```yaml
---
permission:
  skill:
    "documents-*": "allow"
---
```

### Key Source Files to Reference

From `research/opencode/packages/opencode/`:
- `src/skill/skill.ts` - Skill discovery and state management
- `src/tool/skill.ts` - Skill tool implementation
- `packages/web/src/content/docs/skills.mdx` - Documentation

### Related Task

This is related to `20251223_fix-agent-skill-loading` - even with a native Skill tool, agents may still skip loading skills. This task focuses on adopting the tool itself; the other task focuses on ensuring skills are actually loaded.

## Acceptance Criteria

- [ ] Adopt opencode's skill discovery pattern (glob for SKILL.md)
- [ ] Implement permission system for skills (allow/deny/ask)
- [ ] Skills listed in Skill tool description
- [ ] Compatible with existing `.claude/skills/` and `.nextai/skills/` locations
- [ ] Per-agent skill permissions in agent frontmatter
- [ ] Remove/replace custom openSkill solution

## Notes

- opencode uses Bun.Glob for discovery; we may need to use a different glob library
- Their skill names must match directory names (validation)
- Consider how this interacts with project skills that users add manually
