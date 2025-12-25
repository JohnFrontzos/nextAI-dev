# Feature Summary: Fix initLedger Overwrite Bug

## Overview
Fixed a critical data loss bug in the `initLedger()` function that unconditionally overwrote existing ledger data during project re-initialization.

## Key Changes
- Modified `src/cli/utils/config.ts` - `initLedger()` now preserves existing valid ledgers
- Added comprehensive unit tests in `tests/unit/cli/utils/config.test.ts`
- Function is now idempotent - safe to call multiple times without data loss

## Implementation Notes
The fix leverages existing `loadLedger()` validation. Only replaces ledger when corrupted (invalid JSON or schema validation failure). Warns users when replacing corrupted ledger.

## Test Coverage
- 10 unit test cases covering all edge cases
- Tests for: no existing ledger, valid ledger preservation, corrupted JSON, schema validation, idempotency, empty but valid ledger

## Related Documentation
- Archive: `nextai/done/20251225_fix-initledger-overwrite/`
