# Testing

## Manual Test Checklist

### Test Case 1: Verify Template Update Content
- [ ] Open `resources/agents/technical-architect.md`
- [ ] Verify new section "Important: tasks.md Content Boundaries" exists
- [ ] Verify section appears after the Output section
- [ ] Verify "What SHOULD be in tasks.md" list is present
- [ ] Verify "What should NOT be in tasks.md" list is present
- [ ] Verify "What belongs in testing.md" list is present
- [ ] Verify **IMPORTANT:** and **CRITICAL:** warnings are used
- [ ] Verify `testing.md` is added to the Output list

### Test Case 2: Alignment with Skill File
- [ ] Open `resources/skills/refinement-technical-specs/SKILL.md`
- [ ] Compare lines 147-153 with new agent template section
- [ ] Verify language and structure are consistent
- [ ] Verify same exclusions are listed (manual testing, manual verification, documentation, review)
- [ ] Verify same arrow notation (→) style is used

### Test Case 3: Generate New Feature with Updated Template
- [ ] Create a test feature: `nextai feature "Test Manual Task Generation Fix"`
- [ ] Run `/nextai-refine` on the test feature
- [ ] Wait for technical-architect agent to complete
- [ ] Verify `tasks.md` is generated

### Test Case 4: Verify tasks.md Content
- [ ] Open generated `tasks.md` file
- [ ] Verify NO sections titled "Manual Testing" or "Manual Verification"
- [ ] Verify NO tasks with manual test steps (e.g., "Test the feature by...", "Verify that...")
- [ ] Verify ONLY automated implementation tasks are present:
  - [ ] Pre-implementation tasks
  - [ ] Core implementation tasks (code changes)
  - [ ] Automated test tasks (unit/integration tests)
  - [ ] No CHANGELOG tasks (unless explicitly requested in requirements)
  - [ ] No commit/staging tasks (unless explicitly requested in requirements)

### Test Case 5: Verify testing.md Content
- [ ] Open generated `testing.md` file
- [ ] Verify "Manual Test Checklist" section exists
- [ ] Verify manual test cases are present
- [ ] Verify test cases are specific and actionable
- [ ] Verify no duplication of content from tasks.md

### Test Case 6: Phase Advancement
- [ ] Mark all tasks in `tasks.md` as complete `[x]`
- [ ] Run `nextai advance <test-feature-id>` to move from implementation to review
- [ ] Verify advancement succeeds without errors
- [ ] Verify no error message about incomplete tasks
- [ ] Verify feature phase is now "review"

### Test Case 7: Existing Features (Manual Cleanup Documentation)
- [ ] Open `20251225_fix-initledger-overwrite/planning/tasks.md`
- [ ] Identify manual verification tasks (lines 142-166)
- [ ] Document that users should manually check these off to unblock advancement
- [ ] Verify manual tests are also in `testing.md` for that feature
- [ ] Confirm no automated process is needed for cleanup

### Test Case 8: Negative Test - Verify Old Behavior is Fixed
- [ ] Recall that before the fix, features had manual tests in both files
- [ ] Confirm new features generated after fix have manual tests ONLY in testing.md
- [ ] Confirm no duplication between tasks.md and testing.md
- [ ] Confirm phase advancement is not blocked by unchecked manual tasks

---

## Test Sessions
<!-- Populated during /testing phase -->
