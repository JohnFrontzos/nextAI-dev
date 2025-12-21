# Redesign Testing Flow

## Overview

This feature redesigns the testing workflow in NextAI to properly separate implementation tasks from manual verification, improve testing command UX, and automatically trigger investigation when tests fail. The feature eliminates the problematic "Manual Verification" section in tasks.md and introduces a dedicated testing.md file that serves as the single source of truth for both test checklists and test session history.

## Requirements Summary

### Problem Statement

**Problem 1: Manual Verification in tasks.md**
- The technical-architect generates tasks.md with a "Manual Verification" section
- This causes task validation to fail (tasks aren't completable by AI)
- Operators are forced to use --force to bypass validation
- Task counts are inflated with non-implementation work

**Problem 2: Testing Flow UX Issues**
- Testing command always asks conversational questions even when operator provides arguments
- No automatic investigation when tests fail
- Attachments folder not automatically checked
- Multiple test sessions lack proper logging structure

### Solution Components

1. **tasks.md Fix**: Remove manual verification from spec-writer skill and refine command template
2. **testing.md Creation**: Generate during refinement with manual test checklist and test sessions placeholder
3. **/testing Command Improvements**: Hybrid approach supporting quick PASS and detailed FAIL flows
4. **Investigator Integration**: Automatic investigation trigger on test failures

## Technical Approach

### Part 1: Fix tasks.md Generation

Modify the spec-writer skill to explicitly prohibit manual verification sections in tasks.md. Update the refine command template to reinforce this constraint.

### Part 2: Generate testing.md During Refinement

Extend the spec-writer skill to create a third output file (testing.md) alongside spec.md and tasks.md. This file will contain:
- Manual Test Checklist section (populated during refinement)
- Test Sessions section (placeholder for /testing phase)

### Part 3: Enhance /testing Command

Redesign the testing command to support three modes:
1. Quick PASS mode - minimal friction for passing tests
2. FAIL with inline notes - provides context for investigation
3. Conversational FAIL - fallback when notes are missing

### Part 4: Integrate Investigator on FAIL

Automatically trigger the investigator agent when tests fail, writing investigation reports directly into testing.md under the current test session.

## Architecture

### Component Changes

```
┌─────────────────────────────────────────────────────────────┐
│              Refinement Phase (Modified)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  technical-architect + refinement-spec-writer        │   │
│  │                                                       │   │
│  │  Outputs:                                            │   │
│  │  - spec.md (unchanged)                               │   │
│  │  - tasks.md (NO manual verification)                 │   │
│  │  - testing.md (NEW - manual test checklist)          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Testing Phase (Redesigned)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             /nextai-testing Command                   │   │
│  │                                                       │   │
│  │  Mode 1: PASS                                        │   │
│  │  - Log to testing.md                                 │   │
│  │  - Check attachments folder                          │   │
│  │  - Advance to complete                               │   │
│  │                                                       │   │
│  │  Mode 2: FAIL                                        │   │
│  │  - Log failure to testing.md                         │   │
│  │  - Auto-trigger investigator agent                   │   │
│  │  - Investigator writes report to testing.md          │   │
│  │  - Return to implementation phase                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Refinement Phase:**
```
requirements.md → technical-architect → {
  spec.md (technical specification)
  tasks.md (implementation only)
  testing.md (test checklist + sessions placeholder)
}
```

**Testing Phase - PASS:**
```
operator input → testing command → {
  append test session to testing.md
  check attachments folder
  advance phase to complete
}
```

**Testing Phase - FAIL:**
```
operator input → testing command → {
  append test session to testing.md
  trigger investigator agent → {
    analyze failure
    write investigation report to testing.md
  }
  return to implementation phase
}
```

## Implementation Details

### File Modifications

#### 1. `.claude/skills/refinement-spec-writer/SKILL.md`

**Changes:**
- Add Phase 4: Write testing.md
- Update Phase 3 to explicitly prohibit manual verification sections
- Include testing.md template with Manual Test Checklist and Test Sessions sections

**New Section Structure:**
```markdown
### Phase 4: Write testing.md
Create a testing document with manual test checklist:

# Testing

## Manual Test Checklist
<!-- Generated during refinement based on spec.md Testing Strategy -->
- [ ] Test 1
- [ ] Test 2

---

## Test Sessions
<!-- Populated during /testing phase -->

**IMPORTANT:** This is where manual verification goes, NOT in tasks.md.
```

#### 2. `.nextai/templates/commands/refine.md`

**Changes:**
- Update technical-architect instructions to include testing.md creation
- Add explicit prohibition of manual verification in tasks.md
- Update completion verification to check for testing.md

**Modified Section:**
```markdown
**Instructions for the technical-architect subagent:**

...

Then proceed with your workflow:
1. Follow the refinement-spec-writer skill for writing spec.md, tasks.md, and testing.md

...

### tasks.md structure:
- Pre-implementation tasks
- Core implementation tasks (checkbox format)
- Unit tests (only if project has test framework)

> CRITICAL: Do NOT include Manual Verification section - use testing.md instead.
```

#### 3. `.nextai/templates/commands/testing.md`

**Major Redesign:**
- Remove conversational questions for PASS mode
- Add quick mode support (--status pass)
- Add FAIL mode with investigator integration
- Add attachments folder auto-check
- Update logging structure for test sessions

**New Flow:**
```markdown
## Step 4: Gather Test Results (Modified)

Check if operator provided --status in arguments:

**If --status was provided:**
- Use the provided status
- Skip conversational questions
- Proceed directly to logging

**If --status was NOT provided:**
- Ask: "Did the feature work as expected? (pass/fail)"
- If fail and no --notes: Ask for failure details

## Step 5: Log Results (Modified)

**If status is PASS:**
- Run: `nextai testing $ARGUMENTS --status pass --notes "<notes>"`
- Check attachments folder automatically
- Advance to completion

**If status is FAIL:**
- Run: `nextai testing $ARGUMENTS --status fail --notes "<notes>"`
- Trigger investigator agent (NEW)
- Return to implementation
```

#### 4. `src/cli/commands/testing.ts`

**Changes:**
- Make --status optional (defaults to conversational mode)
- Add attachments folder auto-check logic
- Integrate investigator trigger on FAIL
- Update testing.md format for test sessions
- Update test entry generation to match new structure

**New Functions:**
```typescript
// Auto-check attachments folder
function checkAttachmentsFolder(projectRoot: string, featureId: string): string[]

// Trigger investigator on failure
async function triggerInvestigator(
  projectRoot: string,
  featureId: string,
  failureNotes: string
): Promise<void>

// Update test entry format for sessions
function generateTestSessionEntry(
  sessionNumber: number,
  status: 'pass' | 'fail',
  notes: string,
  attachments: string[]
): string
```

#### 5. `.claude/skills/testing-investigator/SKILL.md` (New)

**Purpose:** Guide investigator agent during test failure investigation

**Structure:**
- Investigation methodology for test failures
- Report template for testing.md
- Attachment analysis patterns
- Root cause identification steps

## API/Interface Changes

### CLI Command Changes

**Before:**
```bash
nextai testing <id> --status <pass|fail> --notes "<text>" --attachments "<paths>"
# --status was required
```

**After:**
```bash
# Quick PASS
nextai testing <id> --status pass

# FAIL with notes
nextai testing <id> --status fail --notes "Button doesn't work on Android 12"

# Conversational (no status provided)
nextai testing <id>
# Will prompt for status and notes
```

**New Options:**
- `--status` is now optional (enables conversational mode)
- Attachments folder is auto-checked (--attachments still supported for manual specification)

### Agent Output Changes

**technical-architect agent now outputs:**
- spec.md
- tasks.md (without manual verification)
- testing.md (new)

## Data Model

### testing.md Structure

**Initial State (after refinement):**
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

**After Test Session(s):**
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

**Attachments:**
- attachments/evidence/android-screenshot.png

#### Investigation Report
**Root Cause:** Missing null check in handleY()
**Affected Files:** src/handlers/y.ts:45
**Suggested Fix:** Add null check before accessing property

### Session 2 - 2025-12-12 14:15
**Status:** PASS
**Notes:** Fixed null check, verified on Android 12 and 14
```

### Session Counter

Track session numbers in testing.md to provide sequential numbering. Parse existing sessions on each test run.

## Security Considerations

No security impact. This is a workflow and file structure change.

## Error Handling

### Validation Errors

**Missing testing.md after refinement:**
```
Error: testing.md not found
This file should be created during refinement phase.
Run: /nextai-refine <id> to regenerate
```

**Invalid test status:**
```
Error: Invalid status. Use "pass" or "fail"
```

**Testing phase check:**
- Existing validation ensures feature is in "testing" phase
- No changes needed to phase validation logic

### Investigator Failures

If investigator fails to complete:
- Log error to testing.md under current session
- Include partial investigation results if available
- Still return to implementation phase
- Operator can manually add investigation notes

**Investigator Error Entry:**
```markdown
#### Investigation Report
**Status:** Investigation failed
**Error:** [error message]
**Partial Findings:** [any partial results]
**Next Steps:** Manual investigation required
```

## Testing Strategy

### Unit Tests

**Files to test:**
- `src/cli/commands/testing.ts`
  - Test session numbering logic
  - Test attachments folder checking
  - Test entry generation with new format

**New test cases:**
```typescript
describe('testing command', () => {
  describe('session numbering', () => {
    it('should start at session 1 for new testing.md', () => {})
    it('should increment session number for existing sessions', () => {})
  })

  describe('attachments auto-check', () => {
    it('should find files in attachments/evidence/', () => {})
    it('should return empty array if folder does not exist', () => {})
  })

  describe('test entry generation', () => {
    it('should generate session entry with proper format', () => {})
    it('should include investigation report section for FAIL', () => {})
  })
})
```

### Manual Testing

After implementing this feature:
1. Verify tasks.md no longer contains manual verification section
2. Verify testing.md is created during refinement
3. Test quick PASS mode
4. Test FAIL mode with investigator integration
5. Verify attachments folder auto-check
6. Test conversational mode fallback

### Integration Testing

**Workflow tests:**
1. Run /nextai-refine and verify three outputs (spec.md, tasks.md, testing.md)
2. Verify tasks.md has no manual verification section
3. Run /nextai-testing with PASS status
4. Run /nextai-testing with FAIL status and verify investigator trigger
5. Verify test sessions are properly numbered

## Alternatives Considered

### Alternative 1: Keep Manual Verification in tasks.md

**Rejected because:**
- Breaks task validation (tasks must be AI-completable)
- Forces operators to use --force
- Inflates task counts
- Confuses phase boundaries

### Alternative 2: Single testing.md File vs Separate checklist.md

**Considered:** Separate files for checklist (checklist.md) and results (testing.md)

**Rejected because:**
- Adds complexity with two files
- Operators need to check both files
- Single file provides better context (what to test + what happened)
- Checklist items can be checked off as sessions pass

### Alternative 3: Fully Automated Testing

**Considered:** Skip manual testing entirely, rely on unit tests only

**Rejected because:**
- Some features require human verification (UX, visual design)
- Not all projects have comprehensive test coverage
- Manual testing catches integration issues
- Human-in-the-loop is a core NextAI principle

### Alternative 4: Interactive Investigation Prompt

**Considered:** Ask operator if they want to investigate after FAIL

**Rejected because:**
- Every FAIL needs investigation
- Adds unnecessary friction
- Operator can ignore investigation report if not needed
- Automatic trigger ensures consistent workflow

### Alternative 5: Investigator Writes to Separate File

**Considered:** Create investigation.md instead of writing to testing.md

**Rejected because:**
- Context split across multiple files
- Investigation is part of test session history
- Inline reports provide better traceability
- Follows single-file principle (testing.md = all testing info)

## Implementation Notes

### Phase Transition Rules

**Current:**
- testing (PASS) → complete
- testing (FAIL) → implementation

**No changes needed** - existing phase transition logic handles this correctly.

### Backward Compatibility

**Features already in todo/:**
- Will not have testing.md until next refinement
- Existing testing.md format (if manually created) will be preserved
- CLI will create testing.md header if file doesn't exist (already implemented)

**Features in done/:**
- No impact - archived features are not modified

### Skill Discovery

testing-investigator skill must be placed at `.claude/skills/testing-investigator/SKILL.md` (flat structure, not in subdirectories) for Claude Code to discover it.

### Command Template Updates

Both `.nextai/templates/commands/` and `.claude/commands/` need updates:
- .nextai is source of truth
- Run `nextai sync` to sync to .claude
- Version tracking ensures updates propagate correctly
