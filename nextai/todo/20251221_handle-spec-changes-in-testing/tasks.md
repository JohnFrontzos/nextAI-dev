# Implementation Tasks

## Pre-implementation

- [x] Review existing testing command in `src/cli/commands/testing.ts`
- [x] Review testing-investigator skill in `resources/skills/testing-investigator/SKILL.md`
- [x] Review prompt utilities in `src/cli/utils/prompts.ts`
- [x] Review phase management in `src/core/state/ledger.ts`
- [x] Review metrics patterns in `src/core/metrics/metrics-writer.ts`

## Core Implementation

### 1. Extend testing-investigator Skill

- [x] Open `resources/skills/testing-investigator/SKILL.md`
- [x] Add "Phase 0: Classification" section before "Phase 1: Context Gathering"
- [x] Document classification criteria (SPEC_CHANGE vs BUG)
- [x] Define confidence threshold (70%)
- [x] Document output format (classification, confidence, reasoning, specChangeDescription)
- [x] Specify that BUG classification continues to Phase 1
- [x] Specify that SPEC_CHANGE with >70% confidence returns early for user approval

### 2. Enhance triggerInvestigator Function

**File**: `src/cli/commands/testing.ts`

- [x] Add imports for `selectOption`, `ensureDir`
- [x] Get feature paths (spec.md, testing.md, tasks.md)
- [x] Check if spec.md exists (edge case handling)
- [x] If missing, log warning and return (default to bug)
- [x] Invoke Investigator agent with testing-investigator skill
- [x] Pass feature context: failure notes, spec path, testing path, attachments
- [x] Parse agent classification response
- [x] If BUG or confidence <70%, log and return (existing flow)
- [x] If SPEC_CHANGE and confidence >=70%, call `handleSpecChangeApproval()`

### 3. User Approval Prompt

**File**: `src/cli/commands/testing.ts`

- [x] Create `handleSpecChangeApproval()` function
- [x] Display spec change detection with logger.warn()
- [x] Show failure description (truncated to 200 chars)
- [x] Show agent's reasoning
- [x] Show confidence percentage
- [x] Explain consequences (3 steps)
- [x] Use `selectOption()` for Yes/No/Cancel prompt
- [x] Handle each decision with switch statement

### 4. Approval Action: Yes Path

**File**: `src/cli/commands/testing.ts`

- [x] Create `approveSpecChange()` function
- [x] Build path to initialization.md
- [x] Create spec change entry with timestamp
- [x] Append to initialization.md (create section if needed)
- [x] Handle missing initialization.md with warning
- [x] Call `logSpecChangeMetrics()` with "approved" decision
- [x] Reset phase to product_refinement using `updateFeaturePhase()`
- [x] Use skipValidation: true option
- [x] Check if phase update succeeded
- [x] Display success message and next command
- [x] Use `printNextCommand()` for consistency

### 5. Decline Action: No Path

**File**: `src/cli/commands/testing.ts`

- [x] Create `declineSpecChange()` function
- [x] Call `logSpecChangeMetrics()` with "declined" decision
- [x] Log message that it will be treated as bug
- [x] Note that investigator will write bug report
- [x] Explain that phase already transitioned to implementation
- [x] Display next steps message

### 6. Cancel Action

**File**: `src/cli/commands/testing.ts`

- [x] Handle "cancel" case in switch statement
- [x] Display cancellation message
- [x] Note that feature remains in testing phase
- [x] Suggest running /nextai-testing again when ready
- [x] Do NOT log metrics for cancelled decision
- [x] Do NOT modify any files

### 7. Metrics Logging

**File**: `src/cli/commands/testing.ts`

- [x] Create `logSpecChangeMetrics()` function
- [x] Accept parameters: projectRoot, featureId, userDecision, description
- [x] Build path to `nextai/metrics/spec-changes.jsonl`
- [x] Ensure metrics directory exists with `ensureDir()`
- [x] Create metric entry object with timestamp, featureId, failureDescription, userDecision, originalPhase
- [x] Convert to JSON string and append newline
- [x] Append to JSONL file
- [x] Wrap in try/catch - metrics are non-critical
- [x] Log error to logger.dim() if write fails

### 8. Error Handling

- [x] Handle missing spec.md gracefully (warning + return)
- [x] Handle empty failure notes (existing validation sufficient)
- [x] Handle phase update failure (display error + error message)
- [x] Handle metrics write failure (log warning + continue)
- [x] Handle missing initialization.md (warning when appending)
- [x] Validate feature is in testing phase (already handled by testing command)

### 9. Agent Integration

**Note**: This task depends on the agent SDK implementation. For now:

- [x] Add TODO comment for agent invocation
- [x] Document expected input: feature paths, failure notes, attachments
- [x] Document expected output: classification object with structure from spec
- [x] Create mock classification response for testing
- [x] Add placeholder for actual agent invocation

## Unit Tests

The project uses Vitest for unit testing (confirmed in `nextai/docs/technical-guide.md`).

### Test File Setup

- [x] Create `tests/unit/cli/commands/testing-spec-changes.test.ts`
- [x] Set up test fixtures for feature folder structure
- [x] Mock file system operations (existsSync, appendFileSync)
- [x] Mock user prompts (selectOption)
- [x] Mock phase management (updateFeaturePhase)

### Metrics Logging Tests

- [x] Test `logSpecChangeMetrics()` creates JSONL file
- [x] Test JSONL append format (one object per line)
- [x] Test metric structure matches schema
- [x] Test metrics directory creation
- [x] Test error handling for write failures

### Approval Flow Tests

- [x] Test `handleSpecChangeApproval()` displays correct information
- [x] Test "yes" path calls approveSpecChange()
- [x] Test "no" path calls declineSpecChange()
- [x] Test "cancel" path does nothing

### Spec Change Approval Tests

- [x] Test `approveSpecChange()` appends to initialization.md
- [x] Test initialization.md section creation
- [x] Test timestamp formatting
- [x] Test phase reset to product_refinement
- [x] Test metrics logging with "approved" decision
- [x] Test error handling for missing initialization.md

### Spec Change Decline Tests

- [x] Test `declineSpecChange()` logs metrics with "declined"
- [x] Test appropriate messages displayed

### Edge Case Tests

- [x] Test missing spec.md returns early
- [x] Test missing initialization.md shows warning
- [x] Test phase update failure displays error
- [x] Test metrics write failure doesn't crash
