# Technical Specification: Fix Skill Discovery for Namespaced Skills

## Overview

This bug fix addresses a critical discovery limitation in Claude Code where skills placed in subdirectories (namespaces) under `.claude/skills/` are not discoverable. The investigation revealed that Claude Code only discovers skills that are DIRECT children of `.claude/skills/`, causing all 7 NextAI skills located in `.claude/skills/nextai/*` to be completely invisible to the system despite having correct SKILL.md format.

The solution is to flatten the skill directory structure by moving all NextAI skills from the `nextai/` subdirectory to the root `.claude/skills/` directory and updating all skill invocations in command templates to remove the namespace prefix.

## Requirements Summary

Based on the investigation findings:

1. Move 7 NextAI skills from `.claude/skills/nextai/*` to `.claude/skills/*`
2. Remove the empty `nextai/` subdirectory
3. Update all command template skill invocations to remove the `nextai:` namespace prefix
4. Verify skills become discoverable in the `<available_skills>` section
5. Ensure command templates sync correctly to `.claude/commands/`

## Technical Approach

### Root Cause

Claude Code's skill discovery system scans only the direct children of `.claude/skills/` for directories containing `SKILL.md` files. Nested subdirectories (namespaces) are not traversed, resulting in:

```
<available_skills>

</available_skills>
```

The empty `<available_skills>` section confirms that none of the 7 skills in `.claude/skills/nextai/*` were discovered.

### Solution Strategy

**Flatten Skills to Root Level**

Move all skills from the nested namespace structure to the root level:

**Before (NOT WORKING):**
```
.claude/skills/
├── skill-creator/           ✓ DISCOVERED (direct child)
│   └── SKILL.md
└── nextai/                  ✗ NAMESPACE (subdirectory)
    ├── documentation-recaps/  ✗ NOT DISCOVERED
    ├── executing-plans/       ✗ NOT DISCOVERED
    ├── refinement-questions/  ✗ NOT DISCOVERED
    ├── refinement-spec-writer/✗ NOT DISCOVERED
    ├── reviewer-checklist/    ✗ NOT DISCOVERED
    ├── root-cause-tracing/    ✗ NOT DISCOVERED
    └── systematic-debugging/  ✗ NOT DISCOVERED
```

**After (WILL WORK):**
```
.claude/skills/
├── documentation-recaps/    ✓ DISCOVERED (direct child)
│   └── SKILL.md
├── executing-plans/         ✓ DISCOVERED (direct child)
│   └── SKILL.md
├── refinement-questions/    ✓ DISCOVERED (direct child)
│   └── SKILL.md
├── refinement-spec-writer/  ✓ DISCOVERED (direct child)
│   └── SKILL.md
├── reviewer-checklist/      ✓ DISCOVERED (direct child)
│   └── SKILL.md
├── root-cause-tracing/      ✓ DISCOVERED (direct child)
│   └── SKILL.md
├── skill-creator/           ✓ DISCOVERED (direct child)
│   └── SKILL.md
└── systematic-debugging/    ✓ DISCOVERED (direct child)
    └── SKILL.md
```

### Why This Approach

1. **Works with Claude Code's Current Architecture**: No changes to Claude Code required
2. **Aligns with Official Pattern**: The official `skill-creator` skill is at root level
3. **Immediate Solution**: Can be implemented and verified immediately
4. **Documented Limitation**: Skill-creator documentation never explicitly states that subdirectories are supported
5. **Reversible**: Can restore namespace organization if Claude Code adds subdirectory support later

## Architecture

### Directory Structure Changes

**Filesystem Changes:**

```bash
# Move each skill directory from nested to root
.claude/skills/nextai/documentation-recaps/ → .claude/skills/documentation-recaps/
.claude/skills/nextai/executing-plans/ → .claude/skills/executing-plans/
.claude/skills/nextai/refinement-questions/ → .claude/skills/refinement-questions/
.claude/skills/nextai/refinement-spec-writer/ → .claude/skills/refinement-spec-writer/
.claude/skills/nextai/reviewer-checklist/ → .claude/skills/reviewer-checklist/
.claude/skills/nextai/root-cause-tracing/ → .claude/skills/root-cause-tracing/
.claude/skills/nextai/systematic-debugging/ → .claude/skills/systematic-debugging/

# Remove empty namespace directory
.claude/skills/nextai/ → (deleted)
```

**No Changes to SKILL.md Files:**

The YAML frontmatter in each SKILL.md file remains unchanged. Skills are named without namespace prefixes:

```yaml
---
name: documentation-recaps
description: Documentation and changelog update skill.
---
```

This is correct - the skill name should not include a namespace prefix.

### Skill Invocation Changes

**Command Template Updates:**

All skill invocations in command templates must change from namespaced to non-namespaced syntax:

**Before:**
```markdown
Skill("nextai:documentation-recaps")
Skill("nextai:executing-plans")
Skill("nextai:refinement-questions")
Skill("nextai:refinement-spec-writer")
Skill("nextai:reviewer-checklist")
Skill("nextai:root-cause-tracing")
Skill("nextai:systematic-debugging")
```

**After:**
```markdown
Skill("documentation-recaps")
Skill("executing-plans")
Skill("refinement-questions")
Skill("refinement-spec-writer")
Skill("reviewer-checklist")
Skill("root-cause-tracing")
Skill("systematic-debugging")
```

## Implementation Details

### Phase 1: Backup and Verification

1. **Verify current state** - List all skills in the nextai/ subdirectory
2. **Verify SKILL.md format** - Ensure all have valid YAML frontmatter
3. **Document current structure** - Record the exact directory tree for rollback if needed

### Phase 2: Move Skills to Root

1. **Move skill directories** using `mv` command for each skill:
   ```bash
   mv .claude/skills/nextai/documentation-recaps .claude/skills/
   mv .claude/skills/nextai/executing-plans .claude/skills/
   mv .claude/skills/nextai/refinement-questions .claude/skills/
   mv .claude/skills/nextai/refinement-spec-writer .claude/skills/
   mv .claude/skills/nextai/reviewer-checklist .claude/skills/
   mv .claude/skills/nextai/root-cause-tracing .claude/skills/
   mv .claude/skills/nextai/systematic-debugging .claude/skills/
   ```

2. **Remove empty namespace directory**:
   ```bash
   rmdir .claude/skills/nextai
   ```

### Phase 3: Update Command Templates

Update skill invocations in all command template files:

**Files to Modify:**

1. `/resources/templates/commands/complete.md`
   - Change: `Skill("nextai:documentation-recaps")` → `Skill("documentation-recaps")`
   - Occurrences: 2 (two delegation points for document-writer)

2. `/resources/templates/commands/implement.md`
   - Change: `Skill("nextai:executing-plans")` → `Skill("executing-plans")`
   - Occurrences: 1

3. `/resources/templates/commands/refine.md`
   - Change: `Skill("nextai:refinement-questions")` → `Skill("refinement-questions")`
   - Change: `Skill("nextai:refinement-spec-writer")` → `Skill("refinement-spec-writer")`
   - Change: `Skill("nextai:root-cause-tracing")` → `Skill("root-cause-tracing")`
   - Change: `Skill("nextai:systematic-debugging")` → `Skill("systematic-debugging")`
   - Occurrences: 5 total (product-owner gets 1, technical-architect gets 2, investigator gets 2)

4. `/resources/templates/commands/review.md`
   - Change: `Skill("nextai:reviewer-checklist")` → `Skill("reviewer-checklist")`
   - Occurrences: 1

**Total Changes:** 9 skill invocations across 4 files

### Phase 4: Sync to AI Client

Run the NextAI sync command to propagate template changes to `.claude/commands/`:

```bash
nextai sync
```

This will update:
- `.claude/commands/nextai-complete.md`
- `.claude/commands/nextai-implement.md`
- `.claude/commands/nextai-refine.md`
- `.claude/commands/nextai-review.md`

### Phase 5: Verification

1. **Visual verification** - List `.claude/skills/` and confirm flat structure
2. **Functional verification** - Start new Claude Code conversation and check `<available_skills>` section
3. **Invocation test** - Attempt to use Skill tool with one of the moved skills
4. **Sync verification** - Verify command templates in `.claude/commands/` have updated skill invocations

## API/Interface Changes

**No API changes** - This is purely a directory structure and configuration change.

**Skill Invocation Syntax Change:**

| Component | Before | After |
|-----------|--------|-------|
| Skill Tool Invocation | `Skill("nextai:skill-name")` | `Skill("skill-name")` |
| Skill Name in YAML | `name: skill-name` | `name: skill-name` (unchanged) |

## Data Model

No data model changes. This fix only affects:
- Filesystem structure (`.claude/skills/` directory layout)
- Command template content (`resources/templates/commands/*.md`)

SKILL.md files themselves remain unchanged.

## Security Considerations

**Low Risk:**

- No code execution changes
- No external dependencies
- No credential handling
- Only filesystem reorganization and text replacement

**Potential Issues:**

- If skills are being used in conversations during the migration, those conversations may temporarily fail to load skills
- Solution: Complete migration in one atomic operation (move all skills, then update all templates, then sync)

## Error Handling

### Pre-flight Validation

Before making changes:
1. Verify all 7 expected skills exist in `.claude/skills/nextai/`
2. Verify each has a valid SKILL.md file
3. Verify `.claude/skills/` is writable

### Rollback Strategy

If issues occur during migration:

1. **Partial Move Failure**: If only some skills moved successfully, move remaining skills manually
2. **Template Update Failure**: Templates are source-controlled - revert changes via git
3. **Sync Failure**: Re-run `nextai sync` after fixing template issues
4. **Complete Rollback**: Use git to restore previous state

### Post-Migration Validation

1. Verify all 7 skills appear as direct children of `.claude/skills/`
2. Verify `.claude/skills/nextai/` directory no longer exists
3. Verify all 9 skill invocations updated in templates
4. Verify `nextai sync` completes successfully
5. Start fresh Claude Code conversation and verify skills appear in `<available_skills>`

## Testing Strategy

### Pre-implementation Tests

1. **Current State Verification**
   - List `.claude/skills/nextai/` contents
   - Verify 7 skills present
   - Count skill invocations in templates (should be 9)

2. **Baseline Test**
   - Start new Claude Code conversation
   - Check `<available_skills>` section (should be empty or only contain skill-creator)
   - Attempt to invoke a NextAI skill (should fail with "Unknown skill")

### Post-implementation Tests

1. **Structure Verification**
   - List `.claude/skills/` - should show 8 direct children (7 NextAI + skill-creator)
   - Verify `.claude/skills/nextai/` does not exist
   - Verify each skill directory contains SKILL.md

2. **Template Verification**
   - Search templates for "nextai:" prefix in Skill invocations (should be 0 matches)
   - Count skill invocations without prefix (should be 9)

3. **Sync Verification**
   - Run `nextai sync`
   - Verify `.claude/commands/` files updated
   - Search synced commands for "nextai:" prefix (should be 0 matches)

4. **Discovery Test**
   - Start new Claude Code conversation
   - Check `<available_skills>` section in system prompt
   - Verify all 7 NextAI skills listed (plus skill-creator)

5. **Invocation Test**
   - In the new conversation, use Skill tool: `Skill("documentation-recaps")`
   - Verify skill loads successfully without "Unknown skill" error
   - Test at least 2-3 different skills to confirm

6. **Integration Test**
   - Create a test feature and run `/nextai-refine` command
   - Verify subagents successfully load their assigned skills
   - Check that skills execute without errors

### Automated Test Cases (Unit Tests)

While this is primarily a filesystem change, add unit tests for:

1. **Skill Discovery Pattern**
   - Test that skills at root level are discoverable
   - Test that skills in subdirectories are NOT discoverable (documents current behavior)

2. **Template Parsing**
   - Test that template content correctly references skills without namespace prefix
   - Test that skill invocations follow expected pattern

## Alternatives Considered

### Alternative 1: Prefix Skill Names

**Approach:** Rename skill folders to include namespace prefix (e.g., `nextai-documentation-recaps/`), update YAML frontmatter `name` fields to match, and keep files in subdirectory.

**Rejected Because:**
- Still doesn't solve the discovery problem - files remain in subdirectory
- Adds complexity with longer names
- No benefit over flattening to root

### Alternative 2: Request Claude Code Enhancement

**Approach:** File feature request for Claude Code to support nested skill discovery.

**Rejected Because:**
- Requires changes to external tool (outside our control)
- Timeline uncertain
- No immediate solution for users
- Can still pursue later if namespace organization becomes critical

### Alternative 3: Duplicate Skills

**Approach:** Keep skills in namespace subdirectory for organization, also create symlinks or copies at root level.

**Rejected Because:**
- Creates maintenance burden (two places to update)
- Symlinks may not work cross-platform
- Violates DRY principle
- Confusing for users

### Alternative 4: Embed Skill Content in Command Templates

**Approach:** Remove separate skill files entirely, embed their content directly in command templates.

**Rejected Because:**
- Loses separation of concerns
- Makes templates much longer and harder to maintain
- Harder to reuse skills across multiple commands
- Doesn't leverage Claude Code's skill system

## Rationale for Chosen Approach

**Flatten skills to root level** is the optimal solution because:

1. **Works Immediately**: No dependency on external tool changes
2. **Aligns with Official Pattern**: Matches how skill-creator is structured
3. **Simple**: Single set of filesystem operations
4. **Maintainable**: Each skill remains self-contained in its own directory
5. **Discoverable**: Skills will appear in `<available_skills>` as intended
6. **Reversible**: Can restore namespacing if Claude Code adds support
7. **Minimal Impact**: Only affects internal NextAI structure, not user-facing behavior

## Related Work

This bug was discovered after implementing feature `20251209_subagents-not-using-assigned-s`, which added explicit skill loading instructions to command templates. That fix was architecturally correct (subagents must explicitly invoke skills) but exposed this underlying discovery limitation.

The two fixes work together:
1. **Previous fix (20251209_subagents-not-using-assigned-s)**: Ensures subagents explicitly load skills
2. **This fix (20251209_skills-not-found-despite-exist)**: Ensures skills are discoverable to be loaded

## Success Criteria

The fix is successful when:

1. All 7 NextAI skills are direct children of `.claude/skills/`
2. The `.claude/skills/nextai/` directory no longer exists
3. All 9 skill invocations in templates use non-namespaced syntax
4. `nextai sync` completes successfully
5. Fresh Claude Code conversation shows all skills in `<available_skills>`
6. Skill tool successfully loads NextAI skills without "Unknown skill" errors
7. NextAI commands execute with subagents successfully loading assigned skills

## Documentation Updates

After implementing this fix, update:

1. **architecture.md** - Update skill namespace pattern documentation
   - Change `nextai:skill-name` references to `skill-name`
   - Note that skills must be direct children of `.claude/skills/`

2. **conventions.md** - Add skill directory structure convention
   - Skills must be placed at `.claude/skills/skill-name/`, not in subdirectories
   - Skill invocations use bare name: `Skill("skill-name")`

3. **Investigation file** - Mark as resolved with reference to this spec

## Implementation Notes

- All filesystem operations should be done in a single session to avoid partial state
- Use `mv` command for moving directories (preserves contents and structure)
- Verify each move operation succeeds before proceeding to next
- Use Edit tool for template updates to ensure exact string replacement
- Run `nextai sync` as final step to propagate changes
- Test in fresh conversation to avoid cached state
