# Bug: Bug workflow skips requirements

## Description
When running /nextai-refine on a bug, the workflow skips product refinement (no requirements.md) and goes straight to investigation + tech spec. However, the phase validation for advancing from product_refinement to tech_spec still expects requirements.md to exist, forcing --force to be used. Bug workflows should either: (1) create a minimal requirements.md from investigation, or (2) validation should not require requirements.md for bug type.

## Context

**Observed while:** Running `/nextai-refine 20251223_fix-phase-detection` (a bug type feature)

**Workflow executed:**
1. Advance to `product_refinement` ✓
2. Delegate to `investigator` agent → writes `planning/investigation.md` ✓
3. Delegate to `technical-architect` agent → writes `spec.md`, `tasks.md`, `testing.md` ✓
4. Advance to `tech_spec` ✗ **FAILED** - validation expects `requirements.md`

**Error received:**
```
✗ Cannot advance to 'tech_spec'
Phase 'product_refinement' is not complete. Cannot start 'tech_spec'.
Use --force to bypass validation
```

**Workaround used:** `--force` flag to bypass validation

**Root cause location:** Phase validation logic in `src/core/validation/phase-detection.ts`

The validation checks for `requirements.md` but bug workflows use `investigation.md` instead.

## Acceptance Criteria
- [ ] Bug workflows can advance from product_refinement to tech_spec without --force
- [ ] Validation recognizes investigation.md as valid for bug type
- [ ] Feature workflows still require requirements.md
- [ ] No breaking changes to existing workflow

## Possible Solutions

1. **Update validation to be type-aware:**
   - For `feature` type: require `requirements.md`
   - For `bug` type: require `investigation.md`
   - For `task` type: require `requirements.md` (minimal)
   - **Rejected:** Too complex (5+ files in validation layer)

2. **Generate requirements.md from investigation:**
   - After investigation, create a minimal `requirements.md` that references investigation
   - **Rejected:** Creates redundant file

3. **Change investigator output to requirements.md:**
   - Update refine orchestrator to tell investigator to write `requirements.md`
   - Investigation findings ARE requirements for the fix, so semantically appropriate
   - **Partially accepted** - but see Option 4

4. **Centralize output path in orchestrator only (CHOSEN):**
   - Only `resources/templates/commands/refine.md` specifies the output path
   - Remove path specifications from agent/skill files (investigator.md, root-cause-tracing, systematic-debugging)
   - Agent/skill files focus on methodology, not paths
   - Orchestrator passes output path in delegation context
   - **Single source of truth** - easier to maintain

**Recommended:** Option 4 - Centralize output path specification in the refine orchestrator only.

## Design Decision (from Product Owner & Tech Architect review)

Both agents agreed: **Output paths should be specified only in the orchestrator**, not in agent/skill files.

**Reasoning:**
- Agents receive paths from orchestrator's delegation context, not from their own definition files
- Single source of truth reduces maintenance burden and inconsistency risk
- Skill files are for methodology, not path specifications
- Easier to evolve workflow (change one file, not four)

## Notes
This is a minor bug but causes friction in the bug workflow.
