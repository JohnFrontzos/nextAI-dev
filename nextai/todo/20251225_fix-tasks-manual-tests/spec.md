# Technical Specification: Fix tasks.md Manual Test Generation

## Overview

This bug fix updates the `technical-architect` agent template to prevent manual testing tasks from being generated in `tasks.md`. Manual testing tasks should only appear in `testing.md` to ensure proper phase advancement and clear separation of concerns.

The root cause is a mismatch between the agent template (`resources/agents/technical-architect.md`) and the skill instructions (`resources/skills/refinement-technical-specs/SKILL.md`). The skill already has the correct guidelines, but the agent template doesn't reference them.

## Requirements Summary

Based on `nextai/todo/20251225_fix-tasks-manual-tests/planning/requirements.md`:

**Functional Requirements:**
- FR1: `tasks.md` must only contain automated implementation tasks (code changes, automated tests, build tasks)
- FR2: `tasks.md` must NOT contain manual testing, manual verification, or review tasks
- FR3: Optional tasks (CHANGELOG, commits, staging) should only be generated when explicitly requested
- FR4: `testing.md` must be the single source of truth for all manual testing
- FR5: Phase advancement must work correctly when all automated tasks are complete

**Scope:**
- IN SCOPE: Update `resources/agents/technical-architect.md` with explicit content boundary instructions
- OUT OF SCOPE: No changes to advance command, no migration scripts, no changes to skill file

**Acceptance Criteria:**
- AC1: Template explicitly states "Do NOT include manual testing tasks in tasks.md"
- AC2: Template provides clear guidance on optional tasks
- AC3: New features have only automated tasks in tasks.md
- AC4: Phase advancement works when automated tasks are complete
- AC5: Template aligns with skill instructions

## Technical Approach

### Change Type
This is a template/documentation fix, not a code logic fix. We will update the agent template text to add missing instructions.

### Alignment Strategy
The skill file at `resources/skills/refinement-technical-specs/SKILL.md` already has the correct instructions (lines 147-153):

```markdown
**IMPORTANT:** Do NOT include these sections - they are handled by other phases:
- Manual testing → testing.md (Phase 7)
- Manual verification → testing.md (Phase 7)
- Documentation → document-writer agent during `/nextai-complete`
- Review/feedback → reviewer agent during `/nextai-review`

**CRITICAL:** Do NOT create "Manual Verification", "Manual Testing", or similar sections in tasks.md. All manual testing tasks belong in testing.md (Phase 7).
```

The agent template needs to be updated to reference or mirror these guidelines.

## Implementation Details

### File to Modify
`resources/agents/technical-architect.md`

### Current State
The template currently has:
- Lines 1-13: Frontmatter (id, description, role, tools, skillDependencies)
- Lines 15-25: Role description
- Lines 27-31: Input sources
- Lines 33-35: Output files

**Missing:** Explicit instructions about what should NOT be included in tasks.md

### Proposed Changes

Add a new section after line 35 (after the "Output" section) that provides explicit guidance:

```markdown
## Output

- `nextai/todo/<id>/spec.md` - Technical specification
- `nextai/todo/<id>/tasks.md` - Implementation task checklist
- `nextai/todo/<id>/testing.md` - Manual testing checklist

## Important: tasks.md Content Boundaries

**CRITICAL:** Do NOT include these sections in tasks.md - they are handled by other phases:

- Manual testing → testing.md (Phase 7)
- Manual verification → testing.md (Phase 7)
- Documentation → document-writer agent during `/nextai-complete`
- Review/feedback → reviewer agent during `/nextai-review`

### What SHOULD be in tasks.md:
- Pre-implementation setup tasks
- Core implementation tasks (code changes, new files, refactoring)
- Automated tests (unit tests, integration tests) - if project has test framework
- Build and compilation verification
- Static analysis tasks (linting, type checking)

### What should NOT be in tasks.md:
- Manual testing or verification steps
- User-facing documentation (unless explicitly requested in requirements)
- CHANGELOG updates (unless explicitly requested in requirements)
- Git commit/staging tasks (unless explicitly requested in requirements)
- Review or feedback collection tasks

### What belongs in testing.md:
- All manual test cases extracted from spec.md Testing Strategy
- Manual verification steps
- User acceptance test scenarios
- Integration test scenarios requiring manual validation

**Remember:** testing.md is the single source of truth for manual testing. No duplication between tasks.md and testing.md.
```

### Rationale for Placement
Placing this section immediately after "Output" ensures the agent sees these guidelines before generating any files. This makes the content boundaries clear upfront.

### Backward Compatibility
**Existing Features:** Features already generated with manual tasks in `tasks.md` will require manual cleanup:
- Users can manually check off `[ ]` manual test tasks to unblock phase advancement
- Users should refer to `testing.md` for actual manual testing during testing phase
- No automated migration is needed (small number of affected features)

**Future Features:** Will be generated correctly with the updated template.

## Architecture

### Component Overview
```
resources/
  agents/
    technical-architect.md        <- UPDATE THIS FILE
  skills/
    refinement-technical-specs/
      SKILL.md                    <- ALREADY CORRECT (reference)

nextai/todo/<id>/
  spec.md                         <- Generated by agent
  tasks.md                        <- Generated by agent (fix content)
  testing.md                      <- Generated by agent (correct location for manual tests)
```

### Flow
1. User runs `/nextai-refine <id>` command
2. NextAI delegates to technical-architect agent
3. Agent loads instructions from `technical-architect.md`
4. Agent loads skill from `refinement-technical-specs/SKILL.md`
5. Agent generates `spec.md`, `tasks.md`, `testing.md`
6. **With fix:** `tasks.md` contains only automated tasks, `testing.md` contains all manual tests

## Data Model

No data model changes required. This is a template text update.

## API/Interface Changes

No API or interface changes. The agent template is internal configuration.

## Security Considerations

No security impact. This change improves workflow reliability and user experience.

## Error Handling

No error handling changes. The advance command validation logic remains unchanged.

## Existing Code to Leverage

### Reference Implementation
`resources/skills/refinement-technical-specs/SKILL.md` (lines 147-153) provides the exact wording and structure to use.

### Pattern to Follow
The skill file uses:
- **IMPORTANT:** prefix for warnings
- **CRITICAL:** prefix for critical rules
- Arrow notation (→) to show where content belongs
- Clear "Do NOT" statements
- Grouped lists of what belongs where

We should mirror this pattern in the agent template for consistency.

## Testing Strategy

### Validation Approach
Since this is a template update, testing will be manual:

1. **Pre-fix validation**: Create a new feature and verify manual tests appear in both files
2. **Post-fix validation**: Create a new feature and verify:
   - Manual tests only in `testing.md`
   - Only automated tasks in `tasks.md`
   - Phase advancement works when automated tasks are complete

### Test Cases (to be executed in testing.md)
1. Generate a new feature with the updated template
2. Verify `tasks.md` contains no manual testing sections
3. Verify `testing.md` contains manual test checklist
4. Complete all automated tasks in `tasks.md`
5. Run `nextai advance <id>` to move from implementation to review
6. Verify advancement succeeds without errors

## Alternatives Considered

### Alternative 1: Update Skill File Instead
**Rejected:** The skill file already has the correct instructions. The agent template is what needs updating.

### Alternative 2: Add Validation to Advance Command
**Rejected:** This would mask the symptom rather than fix the root cause. The advance command validation is correct - it's the task generation that's wrong.

### Alternative 3: Create Migration Script
**Rejected:** The number of affected features is small, and manual cleanup is straightforward. Automated migration could incorrectly mark tasks as complete.

### Alternative 4: Filter Tasks During Advance
**Rejected:** This would introduce complexity and hide the problem. Better to fix task generation at the source.

## Implementation Phases

### Phase 1: Update Agent Template
- Add new "Important: tasks.md Content Boundaries" section
- Include clear DO and DO NOT lists
- Mirror language from skill file for consistency

### Phase 2: Validation
- Create test feature to verify correct generation
- Verify phase advancement works
- Document findings in testing.md

## Risk Assessment

**Risk Level:** LOW

**Risks:**
1. **Risk:** Existing features blocked by unchecked manual tasks
   - **Mitigation:** Document manual cleanup process in testing.md
   - **Impact:** Low - users can easily check off old manual tasks

2. **Risk:** Agent might ignore new instructions
   - **Mitigation:** Test with a new feature to verify correct behavior
   - **Impact:** Low - instructions are clear and prominently placed

3. **Risk:** Instructions might conflict with skill
   - **Mitigation:** Copy exact wording from skill file
   - **Impact:** Very low - using reference implementation

## Success Metrics

- New features generated have 0 manual test tasks in tasks.md
- New features generated have 100% of manual tests in testing.md only
- Phase advancement success rate: 100% when automated tasks complete
- Zero duplicate manual tests between tasks.md and testing.md

## Dependencies

None. This is a self-contained template update.

## Rollback Plan

If the update causes issues, simply revert `resources/agents/technical-architect.md` to its previous state. No data migration needed.

## Notes

- This fix is forward-looking: it prevents future problems but doesn't fix existing features
- Manual cleanup of 2-3 existing features is acceptable given the low complexity
- The skill file already has the correct instructions, so this is purely an alignment fix
- No code logic changes required - this is documentation/template only
