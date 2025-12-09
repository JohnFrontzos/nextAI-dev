# Feature Complete: Remove Feature Command

## Summary

Implemented `/nextai-remove` command that allows users to safely remove unwanted or obsolete features from the NextAI workflow. The command moves features from `nextai/todo/` to `nextai/removed/` (a safe archive location) and removes them from the ledger, requiring user confirmation before proceeding. This provides a safety net against accidental deletions while keeping the active workspace clean.

## Key Changes

- **CLI Command Handler** (`src/cli/commands/remove.ts`) - User-facing command with validation and confirmation prompt
- **Removal Utility** (`src/cli/utils/remove.ts`) - Core removal logic with `moveToRemoved()` and `getRemovedPath()` functions
- **Ledger Function** (`src/core/state/ledger.ts`) - Added `removeFeature()` to remove ledger entries and log history events
- **History Schema** (`src/schemas/history.ts`) - Extended with `FeatureRemovedEventSchema` for audit trail
- **Slash Command Template** (`resources/templates/commands/remove.md`) - AI client integration for Claude Code

## Implementation Highlights

**Safety-First Design:**
- Non-destructive operation: files moved to `nextai/removed/`, not deleted
- Always requires user confirmation (no force flag or bypass option)
- Complete audit trail via history logging
- Atomic operation with clear error recovery instructions

**User Experience:**
- Clear feature details displayed before confirmation
- Descriptive success messages showing folder locations
- Graceful error handling for missing features, permission issues, and partial state changes
- Follows existing NextAI command patterns for consistency

**Technical Approach:**
- Reuses `renameSync` with fallback to copy+delete for cross-device moves
- Validates features exist in `nextai/todo/` only (excludes `nextai/done/`)
- Uses Commander.js for CLI with ora spinners and chalk for polished UX
- Proper error recovery if folder moves but ledger update fails

## Files Modified

**New Files:**
- `src/cli/commands/remove.ts` - Command handler
- `src/cli/utils/remove.ts` - Removal utilities
- `resources/templates/commands/remove.md` - Slash command template

**Modified Files:**
- `src/cli/index.ts` - Registered `removeCommand`
- `src/core/state/ledger.ts` - Added `removeFeature()` function
- `src/schemas/history.ts` - Added `FeatureRemovedEventSchema` to discriminated union

## Testing Notes

**Manual Testing:**
- Tested successful removal of active feature (PASS)
- Confirmed feature moved from `nextai/todo/` to `nextai/removed/`
- Verified ledger entry removed
- Verified history event logged correctly

**Test Results:**
- Test Run (12/09/2025): PASS - Successfully deleted a feature, command works as expected

**Automated Tests:**
- Unit and integration tests deferred to future work (documented in tasks.md)
- Code structure is testable with clear inputs/outputs and mockable dependencies

## Related Documentation

- [Technical Specification](../todo/20251209_delete-slash-command-for-todo/spec.md)
- [Requirements](../todo/20251209_delete-slash-command-for-todo/planning/requirements.md)
- [Code Review](../todo/20251209_delete-slash-command-for-todo/review.md)

## Completed

2025-12-09
