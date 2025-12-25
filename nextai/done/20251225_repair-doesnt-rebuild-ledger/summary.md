# Feature Summary: Repair Doesn't Rebuild Ledger

## Overview

This bug fix extends the `nextai repair` command to perform bidirectional ledger validation. Previously, repair could only detect orphan ledger entries (entries without corresponding folders). Now it can also detect and reconstruct missing ledger entries for features that exist on disk but are absent from the ledger, enabling recovery from ledger data loss scenarios.

## Key Changes

### Files Modified
- `src/cli/commands/repair.ts` - Added ledger reconstruction logic
- `tests/unit/cli/commands/repair-helpers.test.ts` - New unit tests (20 tests)
- `tests/integration/cli/repair.test.ts` - New integration tests (12 tests)

### New Capabilities
- Scans `nextai/todo/` directory for feature folders missing from ledger
- Scans `nextai/done/` directory for archived features missing from ledger
- Extracts metadata (title, type) from `planning/initialization.md`
- Detects phase from existing artifacts (spec.md, tasks.md, review.md, etc.)
- Creates fixable `RepairIssue` warnings for user to apply

### Helper Functions Added
- `extractFeatureMetadata()` - Parses title and type from initialization.md
- `detectPhaseFromArtifacts()` - Infers phase from which files exist

## Implementation Notes

### Edge Cases Handled
- Missing `initialization.md` - Uses folder name as title, defaults to 'feature' type
- Malformed heading format - Graceful fallback to folder name
- File read errors - Try-catch with fallback values
- Race conditions - Ledger reloaded in each fix callback

### Design Decisions
- Features in `done/` always get `phase: complete`
- Uses current timestamp for reconstructed entries (historical data unavailable)
- Creates warnings (not errors) so user can choose which entries to restore

## Testing

- 20 unit tests for helper functions
- 12 integration tests for ledger reconstruction scenarios
- All 605 tests pass

## Related Documentation

- [Technical Specification](../todo/20251225_repair-doesnt-rebuild-ledger/planning/spec.md)
- [Implementation Tasks](../todo/20251225_repair-doesnt-rebuild-ledger/planning/tasks.md)
- [Code Review](../todo/20251225_repair-doesnt-rebuild-ledger/review.md)
