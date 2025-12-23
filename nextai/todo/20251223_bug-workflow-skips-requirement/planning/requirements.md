# Requirements: Bug Workflow Skips Requirements

## Product Context

NextAI Dev Framework provides a 7-phase workflow for AI-assisted development:
- Create -> Refine -> Spec -> Implement -> Review -> Test -> Complete
- Different feature types (feature, bug, task) have different refinement workflows
- Bug workflows use an Investigator agent instead of Product Owner
- Phase validation ensures required artifacts exist before advancing phases

## Bug Report

**Original Description:**
When running /nextai-refine on a bug, the workflow skips product refinement (no requirements.md) and goes straight to investigation + tech spec. However, the phase validation for advancing from product_refinement to tech_spec still expects requirements.md to exist, forcing --force to be used.

**Observed Workflow:**
1. Advance to `product_refinement` ✓
2. Delegate to `investigator` agent → writes `planning/investigation.md` ✓
3. Delegate to `technical-architect` agent → writes `spec.md`, `tasks.md`, `testing.md` ✓
4. Advance to `tech_spec` ✗ **FAILED** - validation expects `requirements.md`

**Error:**
```
✗ Cannot advance to 'tech_spec'
Phase 'product_refinement' is not complete. Cannot start 'tech_spec'.
Use --force to bypass validation
```

## Investigation Findings

### Root Cause

**Inconsistent output path specifications across the orchestrator, agent, and skill files.**

The bug has THREE layers of inconsistency:

1. **Orchestrator Inconsistency:**
   - `refine.md` line 228 states investigator output goes to `planning/requirements.md`
   - But the investigator actually writes to `planning/investigation.md` (line 35 of investigator.md)

2. **Agent Definition Inconsistency:**
   - `investigator.md` line 27 says output is `planning/requirements.md`
   - But line 35 says "document findings in planning/investigation.md"
   - The agent definition contradicts itself

3. **Skill Definition Redundancy:**
   - `root-cause-tracing/SKILL.md` line 62 specifies output path as `planning/requirements.md`
   - `systematic-debugging/SKILL.md` line 119 specifies output path as `planning/requirements.md`
   - Skills should focus on methodology, not paths (per Option 4 design decision)

### Phase Validation Logic

The validation in `src/core/validation/phase-detection.ts` is working correctly:
- Line 106: `isPhaseComplete('product_refinement')` checks for `planning/requirements.md`
- Line 380: `detectPhaseFromArtifacts()` also checks for `planning/requirements.md`

**The validation is NOT the problem.** The problem is that the orchestrator and agent/skill files specify the wrong output path or include path specifications when they shouldn't.

### Affected Components

Based on the chosen solution (Option 4: Centralize output path in orchestrator only):

**Files that need changes:**

1. **Orchestrator (path specification):**
   - `resources/templates/commands/refine.md` (line 228)
   - Currently says: Input: `planning/requirements.md`
   - Should say: Input: `planning/requirements.md` (already correct - just needs context clarification)
   - The investigator OUTPUT section is missing explicit path specification

2. **Agent Definition (remove path, fix inconsistency):**
   - `resources/agents/investigator.md`
   - Line 27: States output is `planning/requirements.md` (correct)
   - Line 35: States output is `planning/investigation.md` (WRONG - causes the bug)
   - Should remove line 35's path specification entirely (skills handle methodology)

3. **Skills (remove path specifications):**
   - `resources/skills/root-cause-tracing/SKILL.md` (line 62)
   - `resources/skills/systematic-debugging/SKILL.md` (line 119)
   - Both specify `planning/requirements.md` in their output format sections
   - These should be removed - skills are for methodology, not path specifications

### Evidence

**From refine.md (orchestrator):**
```markdown
**Context to provide the investigator subagent:**
- Feature ID: $ARGUMENTS
- Evidence files in `attachments/evidence/`
- User-provided reproduction steps
- Error details and logs
```
Missing: Output path specification for investigator

**Context to provide the technical-architect subagent:**
```markdown
- Input: `nextai/todo/$ARGUMENTS/planning/requirements.md` (investigator findings)
```
Shows orchestrator expects investigator to write to `requirements.md`

**From investigator.md (agent):**
```markdown
## Output
- `nextai/todo/<id>/planning/requirements.md` - Analysis findings    [Line 27]
- Updated `initialization.md` with root cause (if additional context discovered)

## Workflow
...
Together these skills help you analyze bugs, gather evidence, trace causation, and document findings in planning/investigation.md.    [Line 35 - WRONG]
```

**From root-cause-tracing/SKILL.md:**
```markdown
## Output Format

Write findings to `planning/requirements.md`:    [Line 62]
```

**From systematic-debugging/SKILL.md:**
```markdown
## Documentation

Throughout debugging, update `planning/requirements.md`:    [Line 119]
```

**From phase-detection.ts (validation):**
```typescript
case 'product_refinement':
  return existsWithContent(join(featureDir, 'planning', 'requirements.md'));    [Line 106]
```

## Requirements Summary

### Fix Requirements

Based on the chosen solution (Option 4), the requirements are:

1. **Update investigator.md agent definition:**
   - Line 27: Keep `planning/requirements.md` as output specification
   - Line 35: Remove path specification from workflow description
   - Change to: "Together these skills help you analyze bugs, gather evidence, trace causation, and document findings."

2. **Update refine.md orchestrator:**
   - Add explicit output path in investigator delegation context
   - Should state: `Output: nextai/todo/$ARGUMENTS/planning/requirements.md`
   - This makes the orchestrator the single source of truth

3. **Update root-cause-tracing skill:**
   - Line 62: Remove specific path from output format
   - Change to: "Write findings to the specified output file:" (generic)
   - Or remove path mention entirely and just show template structure

4. **Update systematic-debugging skill:**
   - Line 119: Remove specific path from documentation section
   - Change to: "Throughout debugging, update the investigation document:" (generic)
   - Or remove path mention entirely and just show template structure

5. **Validation:**
   - No changes needed to `phase-detection.ts`
   - Validation correctly expects `planning/requirements.md`

### Design Rationale

Per the design decision in initialization.md:
- **Single source of truth:** Only the orchestrator specifies output paths
- **Agent definitions:** Specify paths in their "Output" section for documentation purposes
- **Skills:** Focus on methodology, not file paths
- **Delegation:** Orchestrator passes output path in delegation context to agents
- **Maintainability:** Changing workflow paths requires updating only one file (refine.md)

### Scope Boundaries

**In Scope:**
- Update investigator.md to remove conflicting path specification in workflow section
- Update refine.md to add explicit output path in investigator delegation context
- Update root-cause-tracing skill to remove hardcoded path
- Update systematic-debugging skill to remove hardcoded path
- Documentation and consistency improvements

**Out of Scope:**
- Changes to phase validation logic (working correctly)
- Changes to feature/task workflows (not affected)
- Changes to file structure or naming conventions
- Type-aware validation (Option 1 - rejected)
- Generating requirements.md from investigation (Option 2 - rejected)
- Schema changes or new configuration

### Non-Functional Requirements

- **Backward compatibility:** Existing features should not be affected
- **Consistency:** All bug workflows should work the same way
- **Documentation:** Agent and skill files should clearly indicate methodology focus
- **Testing:** Verify bug workflow completes without --force flag
