# Requirements: Redesign Testing Flow

## Summary
This feature redesigns the testing workflow in NextAI to separate implementation tasks from manual verification, improve testing command UX, and add automatic investigation when tests fail.

## Feature Overview
The feature consists of 4 interconnected parts:

1. **tasks.md Fix**: Remove manual verification tasks from tasks.md
2. **testing.md Creation**: Generate testing.md during refinement with manual test checklist
3. **/testing Command UX**: Hybrid approach supporting quick PASS and detailed FAIL flows
4. **Investigator Integration**: Automatic investigation when tests fail

## Problem Statement

### Problem 1: Manual Verification in tasks.md
When the technical-architect generates tasks.md during refinement, it incorrectly includes a "## Manual Verification" section. This causes:
- Task validation to fail (tasks aren't "completable" by AI)
- Operators forced to use --force to bypass validation
- Inflated task counts

### Problem 2: Testing Flow UX Issues
- Command always asks conversational questions even when operator provides args
- No investigator integration when tests fail
- Attachments folder not automatically considered
- Multiple test sessions need better logging structure

## Detailed Requirements

### Part 1: tasks.md Structure
**What it should contain:**
- Pre-implementation tasks
- Core implementation tasks
- Unit tests (if applicable)

**What it should NOT contain:**
- Manual verification section
- Manual test checklist
- Any tasks requiring human verification

### Part 2: testing.md Structure

**Created during refinement by spec-writer**

Initial structure:
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

After multiple test sessions:
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

### Part 3: /testing Command - Hybrid Approach

**Mode 1: Quick PASS (no questions asked)**
```bash
nextai testing <id> --status pass
# or
/nextai-testing <id> PASS
```
Behavior:
- Logs timestamp and PASS status to testing.md
- Auto-checks attachments folder for screenshots
- No conversational prompts
- Advances feature to next phase

**Mode 2: FAIL with inline notes**
```bash
nextai testing <id> --status fail --notes "Button doesn't work on Android 12"
# or
/nextai-testing <id> FAIL "Button doesn't work"
```
Behavior:
- Logs failure with notes to testing.md
- Triggers investigator automatically
- Investigator writes investigation report to testing.md
- Returns to implementation phase with investigation context

**Mode 3: Conversational FAIL (when notes missing)**
```bash
/nextai-testing <id> FAIL
```
Behavior:
- Asks operator for failure details
- Then triggers investigator
- Writes investigation report
- Returns to implementation

### Part 4: Investigator Integration

**Trigger:** Automatic on any FAIL status

**Investigation Report Structure:**
- Root Cause: Description of what's wrong
- Affected Files: File paths and line numbers
- Suggested Fix: Concrete recommendation for implementation agent

**Integration:**
- Report written to testing.md under current test session
- Context provided to implementation agent when returning to implementation phase
- Investigation considers attachments folder automatically

## Key Decisions

### 1. Hybrid Approach for /testing Command
- PASS = streamlined, no questions
- FAIL = detailed investigation required
- Conversational fallback when details missing

### 2. Single File for Testing
- testing.md is the single source of truth
- Contains both "what to test" (checklist) and "what happened" (sessions)
- Eliminates need for separate verification documents

### 3. Automatic Investigator on FAIL
- No manual trigger needed
- Investigator runs immediately after FAIL
- Provides structured context for fixes

### 4. Attachments Folder Auto-Check
- Both PASS and FAIL modes check attachments/
- Screenshots and logs automatically considered
- No manual file attachment needed

## Out of Scope

### Deferred for Future
**Scope Change Flow:** When operator wants to change requirements during testing (different from test failure). This would need a separate flow beyond simple PASS/FAIL.

Reasoning: Keep initial testing flow simple with clear pass/fail semantics. Scope changes are a different workflow.

## Constraints

### Technical
- Must maintain backward compatibility with existing features in todo/
- testing.md format must be parseable by CLI commands
- Investigation reports must integrate with implementation agent context

### Workflow
- Refinement phase must complete successfully before testing
- Testing phase can cycle back to implementation multiple times
- Each test session must be logged separately

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

1. `.claude/skills/refinement-spec-writer/SKILL.md`
   - Add testing.md generation logic
   - Remove manual verification from tasks.md instructions

2. `.nextai/templates/commands/refine.md`
   - Update task structure instructions
   - Add testing.md creation requirements

3. `.nextai/templates/commands/testing.md`
   - New hybrid flow with investigator
   - Document PASS/FAIL modes
   - Integration with attachments folder

4. `src/cli/commands/testing.ts`
   - Support quick mode (--status pass)
   - Support inline notes (--status fail --notes "...")
   - Attachments folder auto-check
   - Investigator trigger on FAIL

5. `.claude/skills/testing-investigator/SKILL.md` (possibly new)
   - Investigation patterns for failed tests
   - Report structure templates
   - Context gathering from attachments

## Visual Assets
No mockups or wireframes required. This is a CLI/workflow feature with text-based output.

## Reusability
- Leverage existing investigator patterns from debugging workflows
- Reuse attachment folder checking logic if it exists
- Follow existing markdown formatting patterns in other .md files (tasks.md, summary.md)

## Confidence Level
**95% - Ready for specification**

All requirements are well-defined from operator feedback session. No ambiguities remain. Ready to proceed to technical specification phase.
