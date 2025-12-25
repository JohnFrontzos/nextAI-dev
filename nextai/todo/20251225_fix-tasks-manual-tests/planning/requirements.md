# Requirements: Fix tasks manual tests

## Product Context

NextAI is a CLI tool that manages feature development through structured workflow phases. When a user creates a new feature using `nextai feature "Feature Name"`, the workflow progresses through multiple phases:

1. **Created** - Initial feature scaffolding
2. **Product Refinement** - Requirements gathering (product-owner agent)
3. **Tech Spec** - Technical specification (technical-architect agent)
4. **Implementation** - Code development (developer agent)
5. **Review** - Code review and testing
6. **Testing** - Manual testing and validation
7. **Complete** - Feature finished

During the **Tech Spec** phase, the `technical-architect` agent generates three critical files:
- `spec.md` - Technical specification document
- `tasks.md` - Implementation task checklist (for implementation phase)
- `testing.md` - Manual testing checklist (for testing phase)

The `advance` command is used to move features between phases. Before advancing from implementation to review, it validates that all tasks in `tasks.md` are marked complete (`[x]`).

## Initial Description

The refinement process generates manual testing tasks in both `tasks.md` (implementation phase) and `testing.md` (testing phase). This causes two problems:

1. **Phase advancement validation fails** - The `advance` command checks if all tasks in `tasks.md` are complete (`[x]`). When `tasks.md` contains unchecked manual test tasks that shouldn't be checked until the testing phase, advancement from `implementation` to `review` fails with:
   ```
   Cannot advance to 'review'
   Phase 'product_refinement' is not complete. Cannot start 'review'.
   ```

2. **Manual tests are duplicated** - The same manual testing steps appear in both files, creating confusion about which file is authoritative for manual testing.

## Evidence from Existing Features

### Example 1: `20251225_fix-initledger-overwrite/planning/tasks.md`

Lines 142-166 show manual verification tasks that remain unchecked:

```markdown
### Task 4.4: Manual Verification - Normal Flow
- [ ] Initialize a test project: `nextai init`
- [ ] Add a test feature: `nextai feature "Test Feature"`
- [ ] Verify ledger has feature
- [ ] Re-run `nextai init`
- [ ] Verify feature still in ledger
- [ ] Verify no warnings or errors
- Note: Deferred - covered by automated tests

### Task 4.5: Manual Verification - Corrupted Ledger
- [ ] Initialize a test project
- [ ] Manually corrupt `.nextai/state/ledger.json` (invalid JSON)
- [ ] Re-run `nextai init`
- [ ] Verify warning message displayed
- [ ] Verify new ledger created
- [ ] Verify project works correctly
- Note: Deferred - covered by automated tests

### Task 4.6: Manual Verification - Package Update Simulation
- [ ] Initialize a test project with features
- [ ] Note current ledger state
- [ ] Simulate package update by running `scaffoldProject()` directly
- [ ] Verify ledger unchanged
- [ ] Verify templates updated
- Note: Deferred - covered by automated tests
```

These tasks are labeled "Deferred" but remain in `tasks.md`, preventing phase advancement.

Additionally, lines 178-181 show a CHANGELOG update task that also remains unchecked:

```markdown
### Task 5.2: Update CHANGELOG
- [ ] Add entry to CHANGELOG.md under "Bug Fixes" section
- [ ] Format: `fix: preserve existing ledger during re-initialization (#issue-number)`
- [ ] Describe the bug and fix clearly
- [ ] Credit reporter if applicable
- Note: Deferred - not requested in instructions
```

And lines 214-235 show commit/staging tasks that are unchecked:

```markdown
### Task 7.1: Stage Changes
- [ ] Stage modified file: `src/cli/utils/config.ts`
- [ ] Stage new/modified test files
- [ ] Stage CHANGELOG.md
- Note: Do NOT commit per instructions

### Task 7.3: Commit Changes
- [ ] Create commit with message: `fix: preserve existing ledger during re-initialization`
- [ ] Include detailed commit body explaining the fix
- [ ] Reference issue number in commit message
- Note: Do NOT commit per instructions

### Task 7.4: Update Ledger Phase
- [ ] Mark implementation phase complete
- [ ] Update feature ledger to 'review' phase
- [ ] Run: `nextai status 20251225_fix-initledger-overwrite --phase implementation`
- Note: Deferred - not requested in instructions
```

### Example 2: `20251225_repair-doesnt-rebuild-ledger/planning/tasks.md`

Lines 171-211 show an entire "Phase 7: Manual Testing" section:

```markdown
## Phase 7: Manual Testing

- [ ] Test full recovery scenario
  - [ ] Create new project
  - [ ] Add several features (different types)
  - [ ] Progress features to different phases
  - [ ] Complete and archive some features
  - [ ] Backup ledger
  - [ ] Clear ledger (simulate Bug #1)
  - [ ] Run `nextai repair --check-only`
  - [ ] Verify all missing entries reported
  - [ ] Run `nextai repair --apply`
  - [ ] Verify ledger reconstructed
  - [ ] Run `nextai list` to verify features visible
  - [ ] Compare with backup (metadata matches)

- [ ] Test with existing nextai-dev project
  - [ ] Run repair on actual project
  - [ ] Verify no false positives
  - [ ] Check performance with 23+ features
```

This entire manual testing section duplicates content that should only be in `testing.md`.

## Requirements Discussion

### Questions & Answers

**Q1: Which files should be updated to fix manual test generation?**

**Answer:** Update only the `technical-architect` agent template at `resources/agents/technical-architect.md`.

**Rationale:** The technical-architect agent generates `tasks.md` with manual testing sections. The skill file at `resources/skills/refinement-technical-specs/SKILL.md` already has the correct instructions (lines 147-153):

```markdown
**IMPORTANT:** Do NOT include these sections - they are handled by other phases:
- Manual testing → testing.md (Phase 7)
- Manual verification → testing.md (Phase 7)
- Documentation → document-writer agent during `/nextai-complete`
- Review/feedback → reviewer agent during `/nextai-review`

**CRITICAL:** Do NOT create "Manual Verification", "Manual Testing", or similar sections in tasks.md. All manual testing tasks belong in testing.md (Phase 7).
```

The agent template needs to be updated to match these instructions.

---

**Q2: How should existing features with unchecked manual tasks be handled?**

**Answer:** Manual cleanup - let users manually check off old manual tasks.

**Rationale:** This is a one-time cleanup issue. Existing features in progress already have manual tasks in `tasks.md`. Users should:
1. Manually check off `[ ]` manual test tasks to unblock advancement
2. Refer to `testing.md` for actual manual testing during testing phase
3. Future features will not have this problem once the fix is deployed

No migration script is needed since:
- The number of affected features is small
- Users can easily identify and check off manual tasks
- Automated modification could incorrectly mark tasks as complete

---

**Q3: Should CHANGELOG updates and commit/staging tasks remain in tasks.md?**

**Answer:** Yes, keep in `tasks.md` - they are implementation-phase activities, not testing tasks.

**Rationale:**
- **CHANGELOG updates** are documentation of code changes, done during implementation
- **Commit tasks** are part of the code delivery process, done during implementation
- **Staging tasks** prepare code for review, done at end of implementation

These are distinct from manual testing, which verifies behavior after implementation.

However, the template should clarify that these tasks are optional or only required when explicitly requested by the user/instructions.

---

**Q4: How should the advance command identify tasks to validate?**

**Answer:** Keep current behavior - fix at source by not generating manual tests in `tasks.md`.

**Rationale:** The advance command correctly validates that all tasks are complete before advancing. The problem is not with the validation logic, but with what tasks are being placed in `tasks.md`.

By ensuring `tasks.md` only contains implementation-phase tasks:
- Automated code tasks (edits, new files)
- Automated test tasks (unit tests, integration tests)
- Optional documentation tasks (CHANGELOG, if requested)
- Optional finalization tasks (commit/staging, if requested)

The advance validation will work correctly without modification.

---

**Q5: What about tasks that are marked "Deferred" or have notes saying "Do NOT commit per instructions"?**

**Answer:** These should not be generated in `tasks.md` at all.

**Rationale:** If a task is consistently deferred or marked as "not requested", it shouldn't be in the checklist. This creates noise and blocks progress. The template should:
- Only generate tasks for work that must be done
- Not generate tasks for optional work unless explicitly requested in requirements
- Not generate tasks that will never be checked off

---

**Q6: Should testing.md contain ALL manual test cases, or just additional ones?**

**Answer:** `testing.md` should be the single source of truth for manual testing.

**Rationale:** According to `resources/skills/refinement-technical-specs/SKILL.md` (lines 161-182), the testing.md file should:
- Extract test cases from the Testing Strategy section of spec.md
- Make test items specific and actionable
- Serve as the authoritative location for manual verification

All manual testing steps should be in this file, with no duplication in `tasks.md`.

## Existing Code to Reference

### File: `resources/agents/technical-architect.md`

Current content (lines 1-36):
```markdown
---
id: technical-architect
description: Creates technical specifications and implementation plans
role: subagent
tools:
  read: true
  write: true
  edit: true
  bash: true
  glob: true
  grep: true
skillDependencies: []
---

You are the Technical Architect agent, responsible for translating requirements into technical specifications.

## First Action
Before proceeding, load your skill:
<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->

## Your Role
- Create detailed technical specifications
- Design implementation approach
- Break work into actionable tasks
- Ensure technical feasibility

## Input
- `nextai/todo/<id>/planning/requirements.md` - Product requirements
- `nextai/docs/` - Project documentation (if available)
- `nextai/todo/` - Other active features (check for conflicts or shared solutions)
- `nextai/done/` - Archived features (check `summary.md` for patterns and decisions)

## Output
- `nextai/todo/<id>/spec.md` - Technical specification
- `nextai/todo/<id>/tasks.md` - Implementation task checklist
```

This template needs to be updated to include explicit instructions about what should and should not be included in `tasks.md`.

### File: `resources/skills/refinement-technical-specs/SKILL.md`

Lines 124-153 already contain the correct instructions:

```markdown
### Phase 6: Write tasks.md
Create a step-by-step implementation checklist containing ONLY implementation-phase work:

```markdown
# Implementation Tasks

## Pre-implementation
- [ ] Review existing related code
- [ ] Set up any required dependencies

## Core Implementation
- [ ] Task 1: Description
- [ ] Task 2: Description
- [ ] ...additional tasks based on spec

## Unit Tests (if applicable)
Check `nextai/docs/technical-guide.md` to see if this project has unit tests configured. If yes:
- [ ] Write unit tests for new functionality
- [ ] Ensure existing tests pass

> Skip this section if the project does not have a test framework configured.
```

**IMPORTANT:** Do NOT include these sections - they are handled by other phases:
- Manual testing → testing.md (Phase 7)
- Manual verification → testing.md (Phase 7)
- Documentation → document-writer agent during `/nextai-complete`
- Review/feedback → reviewer agent during `/nextai-review`

**CRITICAL:** Do NOT create "Manual Verification", "Manual Testing", or similar sections in tasks.md. All manual testing tasks belong in testing.md (Phase 7).
```

The agent template should reference or mirror these guidelines.

## Requirements Summary

### Functional Requirements

**FR1: tasks.md Content Boundaries**
- `tasks.md` MUST only contain automated implementation tasks:
  - Code changes (edits, new files, refactoring)
  - Automated tests (unit tests, integration tests)
  - Build and compilation tasks
  - Static analysis tasks (linting, type checking)

**FR2: tasks.md Exclusions**
- `tasks.md` MUST NOT contain:
  - Manual testing steps
  - Manual verification steps
  - User-facing documentation (unless explicitly requested in requirements)
  - Review/feedback tasks

**FR3: Optional Implementation Tasks**
- `tasks.md` MAY contain these tasks ONLY when explicitly requested:
  - CHANGELOG updates
  - Commit message creation
  - Staging for git
  - README or documentation updates

**FR4: testing.md as Single Source of Truth**
- `testing.md` MUST be the authoritative location for all manual testing
- Manual test cases should be extracted from spec.md Testing Strategy
- No duplication between tasks.md and testing.md

**FR5: Phase Advancement Compatibility**
- When all automated tasks in `tasks.md` are complete, the `advance` command should successfully move the feature from `implementation` to `review` phase
- No changes required to advance command validation logic

### Non-Functional Requirements

**NFR1: Developer Experience**
- Clear separation between implementation tasks and testing tasks
- No ambiguity about which file is authoritative for manual testing
- Minimal overhead for developers during implementation phase

**NFR2: Backward Compatibility**
- Existing features with manual tasks in `tasks.md` will require manual cleanup
- No automated migration needed
- Users can simply check off old manual tasks to unblock progress

**NFR3: Consistency**
- Agent template instructions must align with skill instructions
- All future features generated will follow the new pattern
- Existing best practices from skill are enforced in agent template

### Scope Boundaries

**In Scope:**
1. Update `resources/agents/technical-architect.md` agent template
2. Add explicit instructions about tasks.md content boundaries
3. Add explicit instructions about what belongs in testing.md
4. Clarify when optional tasks should be generated
5. Ensure alignment with `resources/skills/refinement-technical-specs/SKILL.md`

**Out of Scope:**
1. Changes to `advance` command validation logic (src/cli/commands/advance.ts)
2. Migration scripts for existing features
3. Changes to `resources/skills/refinement-technical-specs/SKILL.md` (already correct)
4. Automated checking/unchecking of tasks in existing features
5. Changes to testing.md format or structure

### Acceptance Criteria

**AC1:** The updated `technical-architect.md` template explicitly states:
- "Do NOT include manual testing tasks in tasks.md"
- "Do NOT include manual verification tasks in tasks.md"
- "Manual testing belongs in testing.md"

**AC2:** The template provides clear guidance on optional tasks:
- CHANGELOG, commit, and staging tasks are only generated when requested
- Documentation tasks are only generated when requested

**AC3:** New features generated after the fix have:
- Only automated implementation tasks in tasks.md
- All manual testing in testing.md
- No duplication between the two files

**AC4:** Phase advancement works correctly:
- Marking all automated tasks complete allows advancement
- No manual test tasks block progress

**AC5:** Template instructions align with skill instructions:
- Same exclusion lists
- Same content boundaries
- Consistent terminology

## Visual Assets

No visual assets required for this bug fix.

## Success Metrics

- Number of features blocked by unchecked manual tasks: 0 (after manual cleanup)
- Consistency between agent template and skill: 100%
- New features with manual tasks in tasks.md: 0
- Developer confusion about manual testing location: 0

## Related Work

- `resources/skills/refinement-technical-specs/SKILL.md` - Already has correct instructions (lines 147-153)
- `src/cli/commands/advance.ts` - Validation logic works correctly, no changes needed
- Existing features `20251225_fix-initledger-overwrite` and `20251225_repair-doesnt-rebuild-ledger` - Examples of the problem

## Notes

- This is a template/documentation fix, not a code logic fix
- The root cause is inconsistency between agent instructions and skill instructions
- Fix is forward-looking: prevents future problems but requires manual cleanup of existing features
- No breaking changes to user workflow or CLI commands