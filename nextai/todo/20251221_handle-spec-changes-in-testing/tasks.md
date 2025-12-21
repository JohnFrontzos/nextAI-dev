# Implementation Tasks

## Pre-implementation

- [ ] Review existing testing command in `src/cli/commands/testing.ts`
- [ ] Review testing-investigator skill in `resources/skills/testing-investigator/SKILL.md`
- [ ] Review prompt utilities in `src/cli/utils/prompts.ts`
- [ ] Review phase management in `src/core/state/ledger.ts`
- [ ] Review metrics patterns in `src/core/metrics/metrics-writer.ts`

## Core Implementation

### 1. Extend testing-investigator Skill

- [ ] Open `resources/skills/testing-investigator/SKILL.md`
- [ ] Add "Phase 0: Classification" section before "Phase 1: Context Gathering"
- [ ] Document classification criteria (SPEC_CHANGE vs BUG)
- [ ] Define confidence threshold (70%)
- [ ] Document output format (classification, confidence, reasoning, specChangeDescription)
- [ ] Specify that BUG classification continues to Phase 1
- [ ] Specify that SPEC_CHANGE with >70% confidence returns early for user approval

### 2. Enhance triggerInvestigator Function

**File**: `src/cli/commands/testing.ts`

- [ ] Add imports for `selectOption`, `ensureDir`
- [ ] Get feature paths (spec.md, testing.md, tasks.md)
- [ ] Check if spec.md exists (edge case handling)
- [ ] If missing, log warning and return (default to bug)
- [ ] Invoke Investigator agent with testing-investigator skill
- [ ] Pass feature context: failure notes, spec path, testing path, attachments
- [ ] Parse agent classification response
- [ ] If BUG or confidence <70%, log and return (existing flow)
- [ ] If SPEC_CHANGE and confidence >=70%, call `handleSpecChangeApproval()`

### 3. User Approval Prompt

**File**: `src/cli/commands/testing.ts`

- [ ] Create `handleSpecChangeApproval()` function
- [ ] Display spec change detection with logger.warn()
- [ ] Show failure description (truncated to 200 chars)
- [ ] Show agent's reasoning
- [ ] Show confidence percentage
- [ ] Explain consequences (3 steps)
- [ ] Use `selectOption()` for Yes/No/Cancel prompt
- [ ] Handle each decision with switch statement

### 4. Approval Action: Yes Path

**File**: `src/cli/commands/testing.ts`

- [ ] Create `approveSpecChange()` function
- [ ] Build path to initialization.md
- [ ] Create spec change entry with timestamp
- [ ] Append to initialization.md (create section if needed)
- [ ] Handle missing initialization.md with warning
- [ ] Call `logSpecChangeMetrics()` with "approved" decision
- [ ] Reset phase to product_refinement using `updateFeaturePhase()`
- [ ] Use skipValidation: true option
- [ ] Check if phase update succeeded
- [ ] Display success message and next command
- [ ] Use `printNextCommand()` for consistency

### 5. Decline Action: No Path

**File**: `src/cli/commands/testing.ts`

- [ ] Create `declineSpecChange()` function
- [ ] Call `logSpecChangeMetrics()` with "declined" decision
- [ ] Log message that it will be treated as bug
- [ ] Note that investigator will write bug report
- [ ] Explain that phase already transitioned to implementation
- [ ] Display next steps message

### 6. Cancel Action

**File**: `src/cli/commands/testing.ts`

- [ ] Handle "cancel" case in switch statement
- [ ] Display cancellation message
- [ ] Note that feature remains in testing phase
- [ ] Suggest running /nextai-testing again when ready
- [ ] Do NOT log metrics for cancelled decision
- [ ] Do NOT modify any files

### 7. Metrics Logging

**File**: `src/cli/commands/testing.ts`

- [ ] Create `logSpecChangeMetrics()` function
- [ ] Accept parameters: projectRoot, featureId, userDecision, description
- [ ] Build path to `nextai/metrics/spec-changes.jsonl`
- [ ] Ensure metrics directory exists with `ensureDir()`
- [ ] Create metric entry object with timestamp, featureId, failureDescription, userDecision, originalPhase
- [ ] Convert to JSON string and append newline
- [ ] Append to JSONL file
- [ ] Wrap in try/catch - metrics are non-critical
- [ ] Log error to logger.dim() if write fails

### 8. Error Handling

- [ ] Handle missing spec.md gracefully (warning + return)
- [ ] Handle empty failure notes (existing validation sufficient)
- [ ] Handle phase update failure (display error + error message)
- [ ] Handle metrics write failure (log warning + continue)
- [ ] Handle missing initialization.md (warning when appending)
- [ ] Validate feature is in testing phase (already handled by testing command)

### 9. Agent Integration

**Note**: This task depends on the agent SDK implementation. For now:

- [ ] Add TODO comment for agent invocation
- [ ] Document expected input: feature paths, failure notes, attachments
- [ ] Document expected output: classification object with structure from spec
- [ ] Create mock classification response for testing
- [ ] Add placeholder for actual agent invocation

## Unit Tests

The project uses Vitest for unit testing (confirmed in `nextai/docs/technical-guide.md`).

### Test File Setup

- [ ] Create `tests/unit/cli/commands/testing-spec-changes.test.ts`
- [ ] Set up test fixtures for feature folder structure
- [ ] Mock file system operations (existsSync, appendFileSync)
- [ ] Mock user prompts (selectOption)
- [ ] Mock phase management (updateFeaturePhase)

### Metrics Logging Tests

- [ ] Test `logSpecChangeMetrics()` creates JSONL file
- [ ] Test JSONL append format (one object per line)
- [ ] Test metric structure matches schema
- [ ] Test metrics directory creation
- [ ] Test error handling for write failures

### Approval Flow Tests

- [ ] Test `handleSpecChangeApproval()` displays correct information
- [ ] Test "yes" path calls approveSpecChange()
- [ ] Test "no" path calls declineSpecChange()
- [ ] Test "cancel" path does nothing

### Spec Change Approval Tests

- [ ] Test `approveSpecChange()` appends to initialization.md
- [ ] Test initialization.md section creation
- [ ] Test timestamp formatting
- [ ] Test phase reset to product_refinement
- [ ] Test metrics logging with "approved" decision
- [ ] Test error handling for missing initialization.md

### Spec Change Decline Tests

- [ ] Test `declineSpecChange()` logs metrics with "declined"
- [ ] Test appropriate messages displayed

### Edge Case Tests

- [ ] Test missing spec.md returns early
- [ ] Test missing initialization.md shows warning
- [ ] Test phase update failure displays error
- [ ] Test metrics write failure doesn't crash
