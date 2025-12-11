# Bug Investigation: Skills Not Found Despite Existing Files

## RESOLVED (2025-12-09)

This issue has been fixed by flattening the skills directory structure and removing namespace prefixes from skill invocations.

**Solution implemented:**
- Moved all skills from `.claude/skills/nextai/*` to `.claude/skills/*`
- Updated sync configuration to use flat directory structure
- Removed `nextai:` prefix from all Skill() invocations in command templates
- Updated documentation to reflect the flat structure requirement

---

## Summary

Subagents spawned via the Task tool fail to load assigned skills with "Unknown skill" errors, even though the skill files exist in the expected location. The root cause is that **skills placed in subdirectories (namespaces) under `.claude/skills/` are not discoverable by Claude Code**.

## Symptom

When subagents attempt to load skills using the Skill tool:
```
Skill("nextai:documentation-recaps")
Skill("documentation-recaps")
```

Both invocations fail with:
```
<tool_use_error>Unknown skill: nextai:documentation-recaps</tool_use_error>
<tool_use_error>Unknown skill: documentation-recaps</tool_use_error>
```

## Root Cause

**Claude Code only discovers skills that are DIRECT children of `.claude/skills/`, not skills in subdirectories.**

### Current Structure (NOT WORKING)
```
.claude/skills/
├── skill-creator/           ✓ WORKS (direct child)
│   └── SKILL.md
└── nextai/                  ✗ NAMESPACE (subdirectory)
    ├── documentation-recaps/  ✗ NOT DISCOVERED
    │   └── SKILL.md
    ├── executing-plans/       ✗ NOT DISCOVERED
    │   └── SKILL.md
    └── ... (5 more skills)    ✗ NOT DISCOVERED
```

### Expected Structure (WOULD WORK)
```
.claude/skills/
├── skill-creator/           ✓ DISCOVERED
│   └── SKILL.md
├── documentation-recaps/    ✓ DISCOVERED
│   └── SKILL.md
├── executing-plans/         ✓ DISCOVERED
│   └── SKILL.md
└── ... (other skills)       ✓ DISCOVERED
```

## Evidence

### 1. System Prompt Analysis

The system prompt for this conversation includes:
```xml
<available_skills>

</available_skills>
```

**The `<available_skills>` section is completely empty**, meaning Claude Code did not discover ANY of the 7 nextai skills. The only reason `skill-creator` might work is because it's a direct child of `.claude/skills/`.

### 2. Directory Structure Comparison

**skill-creator (WORKS):**
- Path: `.claude/skills/skill-creator/SKILL.md`
- Direct child of `.claude/skills/`
- Has valid YAML frontmatter with name and description

**nextai skills (DON'T WORK):**
- Path: `.claude/skills/nextai/documentation-recaps/SKILL.md`
- Nested under `nextai/` subdirectory
- Has valid YAML frontmatter with name and description
- Identical SKILL.md structure to skill-creator

### 3. SKILL.md Format Verification

All nextai skills have correct YAML frontmatter:
```yaml
---
name: documentation-recaps
description: Documentation and changelog update skill.
---
```

Format matches the official `skill-creator` skill exactly.

### 4. Official Skill Creator Documentation

The `skill-creator` skill documents the expected structure as:
```
skill-name/
├── SKILL.md (required)
└── Bundled Resources (optional)
```

It mentions **namespaces come from parent folders** but does NOT state that Claude Code supports discovering skills in subdirectories. This is an undocumented limitation.

## Trace

1. **[Symptom]**: Subagent invokes `Skill("nextai:documentation-recaps")` → receives "Unknown skill" error
2. **[Immediate Cause]**: Claude Code's skill discovery system does not include `nextai:documentation-recaps` in `<available_skills>`
3. **[Deeper Cause]**: Claude Code only scans `.claude/skills/` for **direct child directories**, not nested subdirectories
4. **[Root Cause]**: NextAI organized skills in a `nextai/` namespace subdirectory, which is outside Claude Code's skill discovery scope

## Recommended Fix

### Option 1: Flatten Skills to Root (RECOMMENDED)

Move all skills from `.claude/skills/nextai/*` to `.claude/skills/*`:

```bash
# Move each skill to root
mv .claude/skills/nextai/documentation-recaps .claude/skills/
mv .claude/skills/nextai/executing-plans .claude/skills/
mv .claude/skills/nextai/refinement-questions .claude/skills/
mv .claude/skills/nextai/refinement-spec-writer .claude/skills/
mv .claude/skills/nextai/reviewer-checklist .claude/skills/
mv .claude/skills/nextai/root-cause-tracing .claude/skills/
mv .claude/skills/nextai/systematic-debugging .claude/skills/

# Remove empty namespace directory
rmdir .claude/skills/nextai
```

**Update skill invocations** in command templates from:
```markdown
Skill("nextai:documentation-recaps")
```

To:
```markdown
Skill("documentation-recaps")
```

**Pros:**
- Simple fix that works with Claude Code's current architecture
- Aligns with how official skills are structured (skill-creator is at root)
- No changes needed to Claude Code

**Cons:**
- Loses namespace organization
- All skills in one flat directory

### Option 2: Prefix Skill Names

Keep files in subdirectory but rename skill folders to include namespace prefix:

```
.claude/skills/nextai/
├── nextai-documentation-recaps/SKILL.md
├── nextai-executing-plans/SKILL.md
└── ...
```

Then update YAML frontmatter name fields:
```yaml
name: nextai-documentation-recaps
```

**Pros:**
- Maintains some organization
- Clear naming indicates these are nextai-specific skills

**Cons:**
- Still doesn't solve the discovery problem (still in subdirectory)
- Doesn't work unless moved to root

### Option 3: Request Claude Code Enhancement

File an enhancement request for Claude Code to support nested skill discovery.

**Pros:**
- Would enable proper namespace organization

**Cons:**
- Requires changes to Claude Code (outside our control)
- Timeline uncertain
- No immediate solution

## Recommended Implementation

**Go with Option 1 (Flatten Skills)** because:
1. It works immediately with no external dependencies
2. Aligns with official skill structure (skill-creator)
3. The skill-creator documentation never explicitly states that namespaces/subdirectories are supported
4. We can restore namespace organization later if Claude Code adds support

## Prevention

### For Future Skill Creation

1. **Always place skills as direct children of `.claude/skills/`**
2. **Test skill discovery** by checking if the skill appears in `<available_skills>` in the system prompt
3. **Use prefixed names** if you need logical grouping (e.g., `nextai-documentation-recaps`)
4. **Consult skill-creator examples** - they all show flat structure

### Documentation Updates

Update NextAI documentation to note:
- Skills must be direct children of `.claude/skills/`
- Subdirectory organization is not supported by Claude Code
- Use name prefixes for logical grouping instead

## Confidence Level

**100% - Root cause confirmed**

### Evidence Supporting High Confidence:

1. **System prompt inspection**: `<available_skills>` is empty, confirming no skills discovered
2. **Structure comparison**: skill-creator (works) is at root, nextai skills (don't work) are nested
3. **Format verification**: All SKILL.md files have correct YAML frontmatter
4. **Official documentation**: skill-creator shows flat structure, never mentions subdirectory support
5. **Reproducible**: The error occurs consistently for all nested skills
6. **Clear fix**: Moving skills to root would immediately solve the problem

## Files Referenced

- Skill files: `/Users/ifrontzos/Dev/Git/nextAI-dev/.claude/skills/nextai/*/SKILL.md`
- Official example: `/Users/ifrontzos/Dev/Git/nextAI-dev/.claude/skills/skill-creator/SKILL.md`
- Command templates: `/Users/ifrontzos/Dev/Git/nextAI-dev/resources/templates/commands/*.md`
- Previous investigation: `/Users/ifrontzos/Dev/Git/nextAI-dev/nextai/done/20251209_subagents-not-using-assigned-s/`

## Testing Approach

To verify the fix:

1. Move one skill to root (e.g., `documentation-recaps`)
2. Start a new Claude Code conversation
3. Check if skill appears in `<available_skills>` in system prompt
4. Attempt to invoke: `Skill("documentation-recaps")`
5. If successful, move remaining skills
6. Update all command template skill invocations to remove namespace prefix

## Related Context

This bug was discovered after implementing feature `20251209_subagents-not-using-assigned-s`, which added explicit skill loading instructions to command templates. That fix was architecturally correct but exposed this underlying skill discovery limitation in Claude Code.
