# Feature Summary: Handle Spec Changes in Testing

## Overview

This feature extends the testing-investigator skill to intelligently detect specification changes during test failure investigation. When a test fails, the Investigator agent now classifies the failure as either a bug or a specification change, prompting users for approval before automatically resetting the feature to the product refinement phase.

## Key Changes

### Testing-Investigator Skill Extension

- Added Phase 0: Classification to the testing-investigator skill workflow
- Implemented classification criteria to distinguish between bugs and specification changes
- Established 70% confidence threshold for spec change detection
- Defined structured JSON output format for classification results

### Enhanced Testing Command

**File:** `src/cli/commands/testing.ts`

- Enhanced `triggerInvestigator()` function with spec change detection logic
- Added `handleSpecChangeApproval()` for interactive user approval workflow
- Implemented `approveSpecChange()` to handle approved spec changes:
  - Appends spec change description to initialization.md
  - Resets feature phase to product_refinement
  - Logs metrics for tracking
- Implemented `declineSpecChange()` to treat declined changes as bugs
- Created `logSpecChangeMetrics()` for JSONL metrics tracking in spec-changes.jsonl

### Metrics System

- New metrics file: `nextai/metrics/spec-changes.jsonl`
- Tracks all spec change events with:
  - Timestamp
  - Feature ID
  - Failure description
  - User decision (approved/declined/cancelled)
  - Original phase

### Comprehensive Test Coverage

**File:** `tests/unit/cli/commands/testing-spec-changes.test.ts`

- 23 new unit tests covering:
  - Metrics logging and JSONL format validation
  - Initialization.md spec change appending behavior
  - Edge case handling (missing files, error conditions)
  - Classification logic and confidence thresholds
  - User decision handling (Yes/No/Cancel)

## Implementation Highlights

### User Approval Flow

When a spec change is detected with >70% confidence, users are presented with:

1. Failure description (from test notes)
2. Investigator's reasoning for classification
3. Confidence percentage
4. Clear explanation of consequences
5. Three options:
   - **Yes**: Approve spec change and restart refinement
   - **No**: Treat as bug and return to implementation
   - **Cancel**: Stop and wait for manual input

### Robust Error Handling

- Missing spec.md: Defaults to bug investigation with helpful guidance
- Missing initialization.md: Logs warning but continues execution
- Phase update failures: Displays error message with details
- Metrics write failures: Non-critical, logs warning without blocking workflow

### Integration Points

- Reuses existing `selectOption()` from prompt utilities
- Uses `updateFeaturePhase()` for state management
- Follows established metrics patterns for JSONL logging
- Ready for Agent SDK integration (TODO markers included)

## Files Modified

1. `resources/skills/testing-investigator/SKILL.md` - Added Phase 0: Classification section
2. `src/cli/commands/testing.ts` - Implemented all core spec change detection functions
3. `tests/unit/cli/commands/testing-spec-changes.test.ts` - Created comprehensive test suite

## Testing Results

- All 541 tests pass (including 23 new spec change tests)
- Build successful with no TypeScript compilation errors
- All edge cases properly handled with graceful error recovery

## Implementation Notes

### Classification Criteria

**Spec Change (>70% confidence):**
- Changes agreed-upon behavior/features described in spec.md
- Adds new functionality not mentioned in original spec.md
- Requires significant code changes (not single-line fixes)

**Bug (≤70% confidence, default):**
- Simple fixes like changing sort order or formatting
- Restores original intended behavior from spec.md
- Single-line code changes or minor adjustments
- Code does not match what spec.md describes

### Agent Integration

The implementation includes placeholder logic for agent classification. Once the Agent SDK is available, the mock classification response (lines 103-108 in testing.ts) should be replaced with actual Investigator agent invocation.

## Related Documentation

- Feature artifacts: `nextai/done/20251221_handle-spec-changes-in-testing/`
- Testing-investigator skill: `resources/skills/testing-investigator/SKILL.md`
- Testing command: `src/cli/commands/testing.ts`
- Test suite: `tests/unit/cli/commands/testing-spec-changes.test.ts`

## Next Steps for Future Work

- Replace mock classification response with actual Agent SDK integration
- Consider adding metrics analysis CLI command for spec change insights
- Potentially make confidence threshold configurable in nextai.config.json
