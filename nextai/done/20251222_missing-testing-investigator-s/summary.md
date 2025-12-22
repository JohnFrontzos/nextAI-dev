# Feature Summary: Fix sync --force to update resources from package

## Overview

This bug fix ensures users can receive new skills, agents, and commands after updating the NextAI package via `npm install`. Previously, running `nextai sync --force` only overwrote files in the client directory (`.claude/` or `.opencode/`) but did not update resources in `.nextai/` from the package. This meant users who initialized projects with older versions could not access new skills like `testing-investigator` without running `nextai init --force`, which could overwrite customizations.

## Key Changes

**Modified:**
- `src/cli/commands/sync.ts` - Added resource update logic when `--force` flag is used (26 lines)
  - Lines 150-172: Conditional block checks for force flag and calls `copyResourcesToNextAI()`
  - Displays spinner feedback with success/warning/fail states
  - Handles errors gracefully (warns but continues sync)
  - Logs detailed counts for agents, skills, and commands

**Added:**
- `tests/unit/core/sync/resources.test.ts` - Comprehensive unit tests (9 test cases)
  - Verifies `copyResourcesToNextAI()` restores missing skills, agents, and commands
  - Tests multiple missing resources and idempotent behavior
  - Validates manifest includes all current skills including `testing-investigator`

- `tests/integration/cli/sync.test.ts` - Integration tests (3 new test cases)
  - Verifies sync completes successfully with and without force flag
  - Tests force flag behavior in sync workflow
  - Ensures backward compatibility with normal sync operations

## Implementation Notes

**Root Cause:**
The `--force` flag in `nextai sync --force` only forced overwrite of files in the client directory, not resources in `.nextai/`. The normal sync path (lines 147-191) did not call `copyResourcesToNextAI()`, which meant new skills added to the package were never copied to existing projects unless the package version changed (triggering auto-update).

**Solution:**
Modified the normal sync path to call `copyResourcesToNextAI()` when the `--force` flag is set. This aligns with user expectations that `--force` means "update everything, including resources".

**Backward Compatibility:**
- Normal sync without force flag remains unchanged
- Version-based auto-update path is unaffected
- Only adds behavior when force flag is explicitly used

**User Experience:**
Users now see clear feedback when resources are updated:
```
✔ Updating NextAI resources...
  Agents: 7
  Skills: 8
  Commands: 12

✔ Synced to Claude Code
  Commands: 12
  Agents: 7
  Skills: 8
```

## Testing Results

**Unit Tests:** 9 tests added, all passing
- Resource manifest validation
- Missing skill restoration
- Multiple resource restoration
- Idempotent behavior

**Integration Tests:** 3 tests added, all passing
- Force flag behavior
- Normal sync without force
- Backward compatibility

**Manual Testing:** Completed successfully
- Verified missing skills are restored with `sync --force`
- Verified normal sync behavior unchanged
- Tested error handling with read-only directories
- Confirmed all resource types (agents, skills, commands) update correctly

**Test Coverage:**
- Total: 546 tests passed
- No new failures introduced
- 7 pre-existing failures unrelated to this change

## Related Documentation

**Bug Report:** `nextai/todo/20251222_missing-testing-investigator-s/planning/initialization.md`

**Root Cause Analysis:** `nextai/todo/20251222_missing-testing-investigator-s/planning/investigation.md`

**Technical Specification:** `nextai/todo/20251222_missing-testing-investigator-s/spec.md`

**Code Review:** `nextai/todo/20251222_missing-testing-investigator-s/review.md` - PASS (all criteria met)

## User Impact

Users upgrading from older versions of NextAI can now:
1. Update package with `npm install`
2. Run `nextai sync --force` to receive new skills
3. Access new features like `testing-investigator` without re-initializing

This fix eliminates the need to run `nextai init --force` (which could overwrite customizations) and provides a safe, incremental way to update project resources after package updates.
