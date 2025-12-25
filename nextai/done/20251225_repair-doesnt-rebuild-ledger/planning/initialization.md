# Bug: Repair doesn't rebuild ledger

## Original Request
The repair command only removes orphan entries but doesn't scan `todo/` and `done/` directories to add missing ledger entries. This makes it unable to recover from ledger data loss (e.g., when Bug #1 - initLedger overwrite - occurs).

## Type
bug

## Initial Context

### Root Cause Identified
**File:** `src/cli/commands/repair.ts` (lines 137-209)

The `checkProject()` function only performs these checks:
1. Validates `config.json` exists
2. Validates `profile.json` exists
3. Validates `ledger.json` is valid JSON
4. Checks for orphan ledger entries (ledger entry → no folder)
5. Checks if agents/ and skills/ directories exist

### What's Missing
The repair command does NOT:
- Scan `nextai/todo/` directory for features
- Scan `nextai/done/` directory for archived features
- Add missing features to the ledger
- Reconstruct ledger from actual feature directories on disk

### Current Behavior (lines 168-183)
```typescript
// Check for orphan features (ledger entry but no folder)
for (const feature of ledger.features) {
  if (feature.phase !== 'complete') {
    const featureDir = getFeaturePath(projectRoot, feature.id);
    if (!existsSync(featureDir)) {
      issues.push({
        type: 'warning',
        message: `Orphan ledger entry: ${feature.id} (folder missing)`,
        fix: () => { /* removes from ledger */ },
      });
    }
  }
}
```

This only handles one direction: ledger entries without folders.
It doesn't handle: folders without ledger entries.

### Why Repair Appears to Do Nothing
When user runs `nextai repair` after ledger is cleared:
1. Ledger is valid JSON (just empty/incomplete) ✓
2. No orphan entries exist (nothing in ledger to be orphaned) ✓
3. It finds "no issues"
4. Exits with "Project is healthy"

Meanwhile, 23 features exist in `done/` with no ledger entries.

### Severity
**High** - Makes Bug #1 (initLedger overwrite) unrecoverable

### Relationship to Other Bugs
This bug makes Bug #1 much worse:
- Bug #1 clears the ledger
- Bug #2 prevents recovery from Bug #1
- Users have no way to restore their lost data

## Acceptance Criteria
- [ ] Repair scans `nextai/todo/` for feature folders
- [ ] Repair scans `nextai/done/` for archived feature folders
- [ ] Missing ledger entries are detected and reported
- [ ] User can choose to add missing entries to ledger
- [ ] Feature metadata (title, type, phase) is read from `initialization.md`
- [ ] Add tests for ledger reconstruction scenario

## Proposed Fix

Add to `checkProject()` function:

```typescript
// Check for missing ledger entries (folder exists but no ledger entry)
const todoDir = join(getNextAIContentDir(projectRoot), 'todo');
const doneDir = join(getNextAIContentDir(projectRoot), 'done');

if (existsSync(todoDir)) {
  const todoFeatures = readdirSync(todoDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const featureId of todoFeatures) {
    const inLedger = ledger.features.some(f => f.id === featureId);
    if (!inLedger) {
      issues.push({
        type: 'warning',
        message: `Missing ledger entry for todo/${featureId}`,
        fix: () => {
          // Read initialization.md to get title and type
          // Detect phase from folder contents
          // Add entry to ledger
        },
      });
    }
  }
}

// Similar logic for done/ directory (phase: complete)
```

## Attachments
None
