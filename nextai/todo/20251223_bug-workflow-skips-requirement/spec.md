# Bug Fix: Workflow Skips Requirements Phase

## Overview
This fix resolves an inconsistency in the NextAI bug refinement workflow where the investigator agent writes to the wrong output file (`planning/investigation.md` instead of `planning/requirements.md`), causing phase validation to fail when advancing from `product_refinement` to `tech_spec`.

The root cause is inconsistent output path specifications across orchestrator, agent, and skill files. This fix centralizes path specifications in the orchestrator only, removing hardcoded paths from agent workflow descriptions and skill methodology files.

## Requirements Summary

From the investigation (requirements.md):

1. **Orchestrator Update**: Add explicit output path specification for investigator delegation in `refine.md`
2. **Agent Definition Fix**: Remove conflicting path specification from `investigator.md` line 35 workflow description
3. **Skill Cleanup**: Remove hardcoded paths from `root-cause-tracing/SKILL.md` and `systematic-debugging/SKILL.md`
4. **Design Principle**: Centralize output paths in orchestrator only; agent/skill files focus on methodology
5. **No Validation Changes**: Phase validation in `phase-detection.ts` is correct and should not be modified

## Technical Approach

This is a **documentation-only fix** with no source code changes. The approach follows Option 4 from the design decision: centralize output path specifications in the orchestrator template only.

**Single Source of Truth Pattern:**
- Orchestrator (`refine.md`) specifies output paths in delegation context
- Agent definitions (`investigator.md`) specify output in their "Output" section for documentation
- Agent workflow descriptions DO NOT repeat path specifications
- Skills (`root-cause-tracing`, `systematic-debugging`) focus on methodology, not paths

This pattern matches the existing `product-owner.md` agent structure.

## Architecture

### Component Hierarchy
```
refine.md (orchestrator)
  └─> Delegates to investigator agent
       ├─> Loads root-cause-tracing skill
       └─> Loads systematic-debugging skill
```

### Data Flow
```
Bug type detected
  → Orchestrator provides output path in delegation context
    → Agent receives path from orchestrator
      → Agent loads skills for methodology
        → Skills guide investigation process
          → Agent writes to orchestrator-specified path
```

### Integration Points

**Files Modified:**
1. `resources/templates/commands/refine.md` - Orchestrator template
2. `resources/agents/investigator.md` - Agent definition
3. `resources/skills/root-cause-tracing/SKILL.md` - Investigation skill
4. `resources/skills/systematic-debugging/SKILL.md` - Debugging skill

**Files NOT Modified:**
- `src/core/validation/phase-detection.ts` - Validation logic is correct
- No other orchestrator, agent, or skill files
- No changes to feature/task workflows

## Implementation Details

### Change 1: Update refine.md (lines 194-198)

**Current state:**
```markdown
**Context to provide the investigator subagent:**
- Feature ID: $ARGUMENTS
- Evidence files in `attachments/evidence/`
- User-provided reproduction steps
- Error details and logs
```

**Required change:**
Add explicit output path specification after error details line:
```markdown
**Context to provide the investigator subagent:**
- Feature ID: $ARGUMENTS
- Output: `nextai/todo/$ARGUMENTS/planning/requirements.md` (investigation findings)
- Evidence files in `attachments/evidence/`
- User-provided reproduction steps
- Error details and logs
```

**Rationale:** Makes the orchestrator the single source of truth for output paths.

### Change 2: Update investigator.md (line 35)

**Current state:**
```markdown
Together these skills help you analyze bugs, gather evidence, trace causation, and document findings in planning/investigation.md.
```

**Required change:**
```markdown
Together these skills help you analyze bugs, gather evidence, trace causation, and document findings.
```

**Rationale:** Removes hardcoded path from workflow description. The agent already documents the correct output path in its "Output" section (line 27).

### Change 3: Update root-cause-tracing/SKILL.md (lines 60-63)

**Current state:**
```markdown
## Output Format

Write findings to `planning/requirements.md`:
```

**Required change:**
```markdown
## Output Format

Write findings to the investigation document:
```

**Rationale:** Makes the skill path-agnostic. The orchestrator provides the actual path during delegation.

### Change 4: Update systematic-debugging/SKILL.md (lines 117-119)

**Current state:**
```markdown
## Documentation

Throughout debugging, update `planning/requirements.md`:
```

**Required change:**
```markdown
## Documentation

Throughout debugging, update the investigation document:
```

**Rationale:** Makes the skill path-agnostic. The orchestrator provides the actual path during delegation.

## API/Interface Changes

None. This is a documentation-only fix affecting markdown templates.

## Data Model

No database or state structure changes. File structure remains the same:
- `nextai/todo/<id>/planning/requirements.md` - Expected by phase validation
- `nextai/todo/<id>/planning/initialization.md` - Bug report
- `nextai/todo/<id>/spec.md` - Technical specification
- `nextai/todo/<id>/tasks.md` - Implementation tasks
- `nextai/todo/<id>/testing.md` - Test checklist

## Security Considerations

None. This change only affects template documentation, not runtime behavior or data handling.

## Error Handling

### Before This Fix
Bug workflows fail phase validation:
```
✗ Cannot advance to 'tech_spec'
Phase 'product_refinement' is not complete. Cannot start 'tech_spec'.
Use --force to bypass validation
```

### After This Fix
Bug workflows advance normally:
```
✓ Phase advanced to tech_spec
```

### Edge Cases
- **Existing bugs in product_refinement phase**: Will need to rename `investigation.md` to `requirements.md` manually or re-run refinement
- **Feature/task workflows**: Unaffected - they use product-owner agent which already follows correct pattern
- **Archived bugs**: Not affected - already completed

## Testing Strategy

### Manual Test Approach
1. Create a new bug using `/nextai-create`
2. Run `/nextai-refine` on the bug
3. Verify investigator writes to `planning/requirements.md`
4. Verify phase advances to `tech_spec` without `--force`
5. Verify technical-architect reads from `planning/requirements.md`

### Test Coverage
- **Happy path**: New bug from creation to tech_spec phase
- **Resume scenario**: Bug already in product_refinement phase
- **Regression**: Feature and task workflows still work correctly

### Validation Points
- File `planning/requirements.md` exists after investigation
- File `planning/investigation.md` does NOT exist
- Phase validation passes without `--force`
- All 4 modified files have consistent path handling

## Existing Code to Leverage

### Components to Reuse
- Existing phase validation logic in `src/core/validation/phase-detection.ts` (lines 106, 380)
- Existing orchestrator delegation pattern from `refine.md` (feature/task workflows)
- Existing agent output pattern from `product-owner.md` (line 28)

### Patterns to Follow
**Agent Definition Pattern** (from `product-owner.md`):
- Output section: Documents the expected output path
- Workflow description: Does NOT repeat path specifications
- Focus: What the agent does, not where it writes

**Orchestrator Delegation Pattern** (from `refine.md` lines 76-79):
- Provides Feature ID
- Provides Input paths
- Provides Output paths
- Context is complete and explicit

**Skill Methodology Pattern**:
- Skills describe HOW to do the work
- Skills do NOT specify WHERE to write output
- Output format shows template structure, not file paths

### Services to Extend
None. This change only affects templates.

## Alternatives Considered

### Option 1: Type-Aware Validation (Rejected)
Update `phase-detection.ts` to check different files based on feature type:
- For `bug`: check `investigation.md`
- For `feature`: check `requirements.md`

**Why rejected:** Too complex (5+ files in validation layer), adds runtime complexity, harder to maintain.

### Option 2: Generate requirements.md from investigation.md (Rejected)
After investigator completes, create a minimal `requirements.md` that references the investigation.

**Why rejected:** Creates redundant file, adds unnecessary step, doesn't solve root inconsistency.

### Option 3: Change investigator output only (Partially Accepted)
Update only `investigator.md` to write to `requirements.md` instead of `investigation.md`.

**Why evolved to Option 4:** Solved immediate bug but didn't address broader pattern of path specifications scattered across multiple files.

### Option 4: Centralize in Orchestrator (CHOSEN)
Only `refine.md` specifies output paths. Agent/skill files focus on methodology.

**Why chosen:**
- Single source of truth - easier to maintain
- Cleaner separation of concerns (orchestration vs methodology)
- Matches existing pattern in `product-owner.md`
- Prevents future similar bugs
- Easier to evolve workflow (change one file, not four)

## Post-Implementation Steps

After modifying the 4 template files, run:
```bash
nextai sync
```

This propagates changes from `resources/` to:
- `.claude/` - Claude Code integration
- `.nextai/` - NextAI runtime templates

**IMPORTANT:** Without running `nextai sync`, the changes will not take effect because the runtime uses the `.claude/` and `.nextai/` copies, not the `resources/` originals.
