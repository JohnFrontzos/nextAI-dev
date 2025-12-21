# Bug: Redesign Testing Flow and Fix Manual Verification in Tasks

## Original Request
The `tasks.md` file generated during refinement includes a "## Manual Verification" section with verification tasks. This section should NOT be included in tasks.md. Additionally, the overall testing phase workflow needs improvement.

## Expanded Scope (Operator Feedback Session)

After discussing with the operator, this bug has been expanded to include:

1. **Fix tasks.md generation** - Remove manual verification tasks from tasks.md
2. **Create testing.md during refinement** - Include manual test checklist at the top
3. **Improve /testing command UX** - Hybrid approach (quick PASS, detailed FAIL)
4. **Add investigator on test failures** - Automatic investigation when tests fail
5. **Auto-include attachments** - Check attachments folder automatically

## Description

### Problem 1: Manual Verification in tasks.md
When the technical-architect generates `tasks.md` during refinement, it incorrectly includes a "## Manual Verification" section. This causes:
- Task validation to fail (tasks aren't "completable" by AI)
- Operators forced to use `--force` to bypass validation
- Inflated task counts

### Problem 2: Testing Flow UX Issues
- Command always asks conversational questions even when operator provides args
- No investigator integration when tests fail
- Attachments folder not automatically considered
- Multiple test sessions need better logging structure

## Type
feature

## Proposed Solution

### 1. testing.md Created During Refinement
Structure:
```markdown
# Testing

## Manual Test Checklist
<!-- Created by spec-writer during refinement -->
- [ ] Test X works as expected
- [ ] Verify Y behavior
- [ ] Check edge case Z

---

## Test Sessions
<!-- Populated during /testing phase -->
```

### 2. tasks.md - Implementation Only
- Pre-implementation tasks
- Core implementation tasks
- Unit tests (if applicable)
- NO manual verification section

### 3. /testing Command Improvements

**Quick PASS:**
```bash
nextai testing <id> --status pass
# or
/nextai-testing <id> PASS
```
- Logs timestamp, PASS status
- Auto-checks attachments folder
- No questions asked

**FAIL with notes:**
```bash
nextai testing <id> --status fail --notes "Button doesn't work on Android 12"
# or
/nextai-testing <id> FAIL "Button doesn't work"
```
- Logs failure with notes
- Triggers investigator automatically
- Investigator writes report to testing.md
- Returns to implementation phase with investigation context

**Conversational (when notes missing on FAIL):**
```
/nextai-testing <id> FAIL
```
- Asks for failure details
- Then triggers investigator

### 4. testing.md After Multiple Sessions
```markdown
# Testing

## Manual Test Checklist
- [x] Test X works as expected
- [ ] Verify Y behavior (failed session 1)
- [x] Check edge case Z

---

## Test Sessions

### Session 1 - 2025-12-12 10:30
**Status:** FAIL
**Notes:** Y behavior doesn't work on Android 12

#### Investigation Report
**Root Cause:** Missing null check in handleY()
**Affected Files:** src/handlers/y.ts:45
**Suggested Fix:** Add null check before accessing property

### Session 2 - 2025-12-12 14:15
**Status:** PASS
**Notes:** Fixed null check, verified on Android 12 and 14
```

## Acceptance Criteria

### Part 1: tasks.md Fix
- [ ] Remove manual verification from spec-writer skill
- [ ] Update refine command template to prohibit manual tests in tasks.md
- [ ] Verify new refinements generate clean tasks.md

### Part 2: testing.md Creation
- [ ] Spec-writer creates testing.md during refinement
- [ ] testing.md includes Manual Test Checklist section
- [ ] testing.md has placeholder for Test Sessions

### Part 3: /testing Command
- [ ] Support quick PASS mode (no questions)
- [ ] Support FAIL with inline notes
- [ ] Conversational mode when FAIL without notes
- [ ] Auto-check attachments folder

### Part 4: Investigator Integration
- [ ] Automatic investigator trigger on FAIL
- [ ] Investigator writes report to testing.md
- [ ] Report includes root cause, affected files, suggested fix
- [ ] Return to implementation with investigation context

## Files to Modify

1. `.claude/skills/refinement-spec-writer/SKILL.md` - Add testing.md generation, remove manual tests from tasks.md
2. `.nextai/templates/commands/refine.md` - Update task structure instructions
3. `.nextai/templates/commands/testing.md` - New hybrid flow with investigator
4. `src/cli/commands/testing.ts` - Support quick mode and attachments
5. Possibly create `.claude/skills/testing-investigator/SKILL.md` - Investigation patterns

## Notes
- Operator noted future consideration: "scope change" flow when they want to change requirements during testing (different from fail). Deferred for now.
- Keep testing flow simple: PASS = quick, FAIL = investigate + fix cycle
- testing.md becomes the single source of truth for both "what to test" and "what happened"
