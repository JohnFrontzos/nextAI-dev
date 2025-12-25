# Technical Specification: Fix initLedger Overwrite Bug

## Problem Statement

### Current Behavior
The `initLedger()` function in `src/cli/utils/config.ts` (lines 208-212) unconditionally creates an empty ledger and overwrites any existing ledger data during project re-initialization. This causes data loss when:

1. Users run `nextai init` in an already initialized project
2. Users update the npm package and the initialization code is re-run
3. `scaffoldProject()` is called, which always invokes `initLedger()`

### Call Chain
```
nextai init (or npm update)
  -> init.ts
    -> scaffoldProject() (src/core/scaffolding/project.ts:50)
      -> initLedger() (src/cli/utils/config.ts:208)
        -> Always creates emptyLedger()
        -> Overwrites existing ledger.json
        -> DATA LOSS
```

### Impact
- **Severity**: Critical - Data loss
- **Scope**: All users who re-initialize or update the package
- **Evidence**: 23 features in `nextai/done/` but ledger only had 4 features after incident

## Solution Design

### Core Principle
Preserve existing valid ledgers; only create new empty ledger when none exists or when existing one is corrupted.

### Modified Behavior
```typescript
export function initLedger(projectRoot: string): Ledger {
  const ledgerPath = getLedgerPath(projectRoot);

  // Step 1: Check if ledger file exists
  if (existsSync(ledgerPath)) {
    try {
      // Step 2: Attempt to load and validate existing ledger
      return loadLedger(projectRoot);
    } catch (error) {
      // Step 3: Only create new ledger if existing one is corrupted
      console.warn('Existing ledger corrupted, creating new one');
      // Fall through to create new ledger
    }
  }

  // Step 4: Create new empty ledger only if none exists or corrupted
  const ledger = emptyLedger();
  saveLedger(projectRoot, ledger);
  return ledger;
}
```

### Key Design Decisions

1. **Leverage Existing Validation**: Use `loadLedger()` which already validates against `LedgerSchema` and throws `NextAIError` with code `LEDGER_CORRUPTED` on invalid data.

2. **Conservative Approach**: Only replace ledger when truly corrupted (parse errors, schema validation failures).

3. **User Communication**: Warn users when replacing corrupted ledger, but don't throw error to allow initialization to continue.

4. **No Breaking Changes**: Function signature remains the same, preserves backward compatibility.

## Implementation Approach

### Files to Modify
1. `src/cli/utils/config.ts` - Update `initLedger()` function

### Dependencies
All required functions and error codes already exist:
- `getLedgerPath()` - Already in config.ts
- `loadLedger()` - Already in config.ts, validates with LedgerSchema
- `existsSync` - Already imported from 'fs'
- `emptyLedger()` - Already imported from schemas
- `saveLedger()` - Already in config.ts

### Error Handling Strategy

The `loadLedger()` function already handles two error cases:

1. **File doesn't exist**: Returns `emptyLedger()` (lines 178-180)
   - Note: This means if ledgerPath exists as file, loadLedger won't return empty

2. **File exists but corrupted**: Throws `NextAIError` with `LEDGER_CORRUPTED` code (lines 182-201)
   - JSON parse errors
   - Schema validation failures

Our implementation catches exceptions from `loadLedger()` when file exists, warns user, and creates new ledger.

### Idempotency
After this fix, `initLedger()` becomes idempotent:
- Calling it multiple times on same project preserves existing data
- Safe to call during re-initialization
- Safe to call after package updates

## Edge Cases to Handle

### 1. No Existing Ledger
**Scenario**: First-time initialization
**Behavior**: Create new empty ledger
**Test**: Verify empty ledger created

### 2. Valid Existing Ledger
**Scenario**: Re-initialization with existing features
**Behavior**: Preserve existing ledger, return it
**Test**: Verify features preserved after re-init

### 3. Corrupted Ledger File
**Scenario**: Ledger file exists but contains invalid JSON or fails schema validation
**Behavior**: Warn user, create new empty ledger
**Test**: Create invalid ledger, verify warning and new ledger creation

### 4. Ledger File with Empty Features Array
**Scenario**: Valid ledger structure but no features
**Behavior**: Preserve the ledger (it's valid)
**Test**: Verify empty but valid ledger is preserved

### 5. Ledger State Directory Missing
**Scenario**: `.nextai/state/` directory doesn't exist
**Behavior**: `getLedgerPath()` returns path, `existsSync()` returns false, new ledger created
**Test**: Verify directory is created and ledger initialized

### 6. File Permission Issues
**Scenario**: Cannot read existing ledger due to permissions
**Behavior**: `loadLedger()` throws error, caught and new ledger created
**Test**: Manual verification (difficult to test cross-platform)

## Testing Strategy

### Unit Tests

Create: `tests/unit/cli/utils/config.test.ts` (if doesn't exist) or add to existing

**Test Cases**:

1. `initLedger() creates empty ledger when none exists`
   - Setup: Clean project root
   - Action: Call `initLedger()`
   - Verify: Ledger file created with empty features array

2. `initLedger() preserves existing valid ledger`
   - Setup: Create ledger with test features
   - Action: Call `initLedger()`
   - Verify: Returns same ledger with features intact

3. `initLedger() replaces corrupted ledger`
   - Setup: Create file with invalid JSON
   - Action: Call `initLedger()`
   - Verify: Warning logged, new empty ledger created

4. `initLedger() handles schema validation failure`
   - Setup: Create valid JSON but invalid schema (e.g., missing required fields)
   - Action: Call `initLedger()`
   - Verify: Warning logged, new empty ledger created

5. `initLedger() is idempotent`
   - Setup: Valid ledger with features
   - Action: Call `initLedger()` multiple times
   - Verify: Same features preserved across all calls

### Integration Tests

Create: `tests/integration/reinit.test.ts`

**Test Cases**:

1. `Re-initialization preserves ledger state`
   - Setup: Initialize project, add features
   - Action: Run `scaffoldProject()` again (simulates re-init)
   - Verify: Features still in ledger

2. `Package update scenario preserves data`
   - Setup: Full project with ledger, config, profile
   - Action: Call `scaffoldProject()` (simulates update flow)
   - Verify: Ledger preserved, config updated

### Manual Verification Steps

1. **Before Fix**:
   - Initialize project
   - Add test features via CLI
   - Re-run `nextai init`
   - Verify data loss occurs

2. **After Fix**:
   - Same steps as above
   - Verify data preserved

3. **Corrupted Ledger Recovery**:
   - Create corrupted ledger manually
   - Re-run `nextai init`
   - Verify warning message and new ledger creation

## Backward Compatibility

### Breaking Changes
None. The function signature remains identical.

### Migration Path
No migration needed. The fix is transparent to existing workflows.

### Affected Workflows
All workflows benefit from fix:
- `nextai init` - Now safe to re-run
- Package updates - Ledger preserved
- Repair operations - Corrupted ledgers replaced automatically

## Security Considerations

### No New Attack Vectors
- No new file operations introduced
- Reuses existing validated functions
- No external input processing

### Data Integrity
- Enhanced: Prevents accidental data loss
- Validation: Leverages existing schema validation
- Recovery: Automatic recovery from corrupted state

## Performance Impact

### Minimal Overhead
- One additional `existsSync()` check (negligible)
- One `loadLedger()` call when file exists (already optimized)
- No impact on first-time initialization

### No Scalability Concerns
- Ledger files are small (feature metadata only)
- Operations are synchronous file I/O (appropriate for CLI)

## Rollout Plan

### Phase 1: Implementation
1. Update `initLedger()` function
2. Add unit tests
3. Add integration tests

### Phase 2: Testing
1. Run existing test suite
2. Run new test suite
3. Manual verification

### Phase 3: Release
1. Include in next patch release
2. Document in CHANGELOG as bug fix
3. Update UPGRADING.md if needed (likely not necessary)

## Success Metrics

### Functional Success
- All unit tests pass
- All integration tests pass
- Manual verification scenarios pass

### User Impact
- No reported data loss incidents after fix
- Re-initialization works safely
- Package updates preserve user data

## Alternative Approaches Considered

### Alternative 1: Always Merge with Filesystem
**Approach**: Rebuild ledger from `nextai/todo/` and `nextai/done/` directories on each init
**Pros**: Automatically recovers from ledger corruption
**Cons**:
- Much more complex implementation
- Slower performance (filesystem scan)
- May introduce inconsistencies if directories manually edited
- Out of scope for this bug fix

**Decision**: Rejected - Over-engineered for this fix. Could be separate feature.

### Alternative 2: Add Backup Before Overwrite
**Approach**: Backup existing ledger before overwriting
**Pros**: Data recovery possible
**Cons**:
- Doesn't prevent the problem
- Adds complexity
- Users may not know backup exists

**Decision**: Rejected - Doesn't solve root cause.

### Alternative 3: Prompt User
**Approach**: Prompt user to confirm overwrite
**Pros**: User control
**Cons**:
- Breaks automation/CI workflows
- Poor UX for CLI tool
- Should never need to ask (preserve is correct default)

**Decision**: Rejected - Preserve should be default behavior.

## Documentation Updates

### Code Documentation
- Add JSDoc comment to `initLedger()` explaining preservation behavior
- Document the error handling for corrupted ledgers

### User Documentation
- Update CHANGELOG.md with bug fix entry
- No user-facing documentation changes needed (fix is transparent)

### Developer Documentation
- Add note in architecture docs about ledger preservation
- Document idempotent initialization pattern

## Future Enhancements

This fix is minimal and focused. Related future work:

1. **Ledger Repair Command**: Add `nextai repair ledger` to rebuild from filesystem
2. **Ledger Validation Command**: Add `nextai validate` to check ledger integrity
3. **Automatic Backups**: Periodic ledger snapshots
4. **Ledger History**: Track changes over time

These are out of scope for this critical bug fix.
