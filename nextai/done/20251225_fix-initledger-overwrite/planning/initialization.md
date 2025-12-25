# Bug: Fix initLedger overwrite

## Original Request
When running `nextai init` or updating the npm package, the `initLedger()` function in `config.ts` unconditionally creates an empty ledger and overwrites any existing data. This causes users to lose all feature tracking. The function should check if a valid ledger exists and preserve it.

## Type
bug

## Initial Context

### Root Cause Identified
**File:** `src/cli/utils/config.ts` (lines 208-212)

```typescript
export function initLedger(projectRoot: string): Ledger {
  const ledger = emptyLedger();  // Always creates empty!
  saveLedger(projectRoot, ledger);
  return ledger;
}
```

**Call chain:**
1. User runs `nextai init` or updates npm package
2. `init.ts` calls `scaffoldProject()`
3. `scaffoldProject()` unconditionally calls `initLedger()` (line 50 in project.ts)
4. `initLedger()` creates empty ledger and overwrites existing file
5. All feature data is lost

### Evidence
- Ledger had 4 features after partial recovery
- `nextai/done/` directory has 23 archived features
- Data was lost during package update/re-initialization

### Severity
**Critical** - Data loss issue affecting all users who re-initialize

## Acceptance Criteria
- [ ] `initLedger()` checks if valid ledger exists before overwriting
- [ ] Existing ledger is preserved during re-init
- [ ] Only corrupted/invalid ledgers are replaced with empty one
- [ ] Add integration test for re-initialization scenario

## Proposed Fix

```typescript
export function initLedger(projectRoot: string): Ledger {
  const ledgerPath = getLedgerPath(projectRoot);

  // Preserve existing ledger if it exists and is valid
  if (existsSync(ledgerPath)) {
    try {
      return loadLedger(projectRoot);
    } catch (error) {
      // Only create empty ledger if existing one is corrupted
      console.warn('Existing ledger corrupted, creating new one');
    }
  }

  // Create new empty ledger only if none exists
  const ledger = emptyLedger();
  saveLedger(projectRoot, ledger);
  return ledger;
}
```

## Attachments
None
