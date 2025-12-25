# Testing Plan: Fix initLedger Overwrite Bug

## Overview

This testing plan ensures the `initLedger()` fix correctly preserves existing ledgers while handling corrupted cases gracefully. Testing covers unit tests, integration tests, and manual verification.

## Unit Test Cases

### File: `tests/unit/cli/utils/config.test.ts`

#### Test Suite: `initLedger()`

##### Test 1: Creates Empty Ledger When None Exists

**Objective**: Verify first-time initialization creates empty ledger

**Setup**:
```typescript
const testContext = createTestProject();
const stateDir = join(testContext.projectRoot, '.nextai', 'state');
mkdirSync(stateDir, { recursive: true });
// No ledger file created
```

**Execution**:
```typescript
const ledger = initLedger(testContext.projectRoot);
```

**Assertions**:
- `ledger` is defined
- `ledger.features` is an empty array
- Ledger file exists at `.nextai/state/ledger.json`
- File contains valid JSON matching `LedgerSchema`

**Expected Result**: Pass - New empty ledger created

---

##### Test 2: Preserves Existing Valid Ledger

**Objective**: Verify re-initialization preserves existing features

**Setup**:
```typescript
const testContext = createTestProject();
initNextAIStructure(testContext.projectRoot);

// Add test features
const feature1 = addFeature(testContext.projectRoot, 'Feature One', 'feature');
const feature2 = addFeature(testContext.projectRoot, 'Feature Two', 'bug');
const feature3 = addFeature(testContext.projectRoot, 'Feature Three', 'task');

const originalLedger = loadLedger(testContext.projectRoot);
```

**Execution**:
```typescript
const ledger = initLedger(testContext.projectRoot);
```

**Assertions**:
- `ledger.features.length` equals 3
- `ledger.features` contains feature1, feature2, feature3
- Feature IDs match original: `feature1.id`, `feature2.id`, `feature3.id`
- All feature properties preserved (title, type, phase, timestamps)
- Ledger file unchanged (same content)

**Expected Result**: Pass - Existing ledger returned without modification

---

##### Test 3: Replaces Corrupted Ledger with Invalid JSON

**Objective**: Verify corrupted JSON is replaced with empty ledger

**Setup**:
```typescript
const testContext = createTestProject();
initNextAIStructure(testContext.projectRoot);

// Write invalid JSON
const ledgerPath = getLedgerPath(testContext.projectRoot);
writeFileSync(ledgerPath, '{ invalid json }', 'utf-8');

// Spy on console.warn
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
```

**Execution**:
```typescript
const ledger = initLedger(testContext.projectRoot);
```

**Assertions**:
- `warnSpy` called with message containing "corrupted"
- `ledger.features` is empty array
- Ledger file contains valid JSON
- File validates against `LedgerSchema`

**Cleanup**:
```typescript
warnSpy.mockRestore();
```

**Expected Result**: Pass - Warning logged, new empty ledger created

---

##### Test 4: Replaces Ledger with Schema Validation Failure

**Objective**: Verify invalid schema is replaced with empty ledger

**Setup**:
```typescript
const testContext = createTestProject();
initNextAIStructure(testContext.projectRoot);

// Write valid JSON but invalid schema (missing 'features' field)
const ledgerPath = getLedgerPath(testContext.projectRoot);
writeFileSync(ledgerPath, JSON.stringify({ invalid: 'schema' }), 'utf-8');

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
```

**Execution**:
```typescript
const ledger = initLedger(testContext.projectRoot);
```

**Assertions**:
- `warnSpy` called with message containing "corrupted"
- `ledger.features` is empty array
- Ledger file now has valid schema

**Cleanup**:
```typescript
warnSpy.mockRestore();
```

**Expected Result**: Pass - Warning logged, new valid ledger created

---

##### Test 5: Idempotent Behavior

**Objective**: Verify multiple calls preserve data

**Setup**:
```typescript
const testContext = createTestProject();
initNextAIStructure(testContext.projectRoot);

const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');
const originalLedger = loadLedger(testContext.projectRoot);
```

**Execution**:
```typescript
const ledger1 = initLedger(testContext.projectRoot);
const ledger2 = initLedger(testContext.projectRoot);
const ledger3 = initLedger(testContext.projectRoot);
```

**Assertions**:
- `ledger1.features.length` equals 1
- `ledger2.features.length` equals 1
- `ledger3.features.length` equals 1
- All three ledgers contain same feature with same ID
- No warnings logged
- Ledger file content identical after all calls

**Expected Result**: Pass - Data preserved across multiple calls

---

##### Test 6: Preserves Empty But Valid Ledger

**Objective**: Verify empty valid ledger is not recreated

**Setup**:
```typescript
const testContext = createTestProject();
initNextAIStructure(testContext.projectRoot);

// initNextAIStructure already creates empty ledger
const originalContent = readFileSync(
  getLedgerPath(testContext.projectRoot),
  'utf-8'
);

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
```

**Execution**:
```typescript
const ledger = initLedger(testContext.projectRoot);
```

**Assertions**:
- `ledger.features` is empty array
- `warnSpy` not called
- Ledger file content unchanged (matches `originalContent`)

**Cleanup**:
```typescript
warnSpy.mockRestore();
```

**Expected Result**: Pass - Empty ledger preserved without warning

---

##### Test 7: Handles Missing State Directory

**Objective**: Verify graceful handling when state directory missing

**Setup**:
```typescript
const testContext = createTestProject();
// Don't create .nextai/state directory
```

**Execution**:
```typescript
const ledger = initLedger(testContext.projectRoot);
```

**Assertions**:
- `ledger.features` is empty array
- State directory created: `.nextai/state/`
- Ledger file created: `.nextai/state/ledger.json`
- No errors thrown

**Expected Result**: Pass - Directory and ledger created successfully

---

## Integration Test Cases

### File: `tests/integration/init/reinit.test.ts`

#### Test Suite: `Re-initialization Scenarios`

##### Integration Test 1: Re-initialization Preserves Ledger State

**Objective**: Verify full project re-initialization preserves ledger

**Setup**:
```typescript
const testContext = createTestProject();

// First initialization
scaffoldProject(testContext.projectRoot, 'Test Project');

// Add features
const feature1 = addFeature(testContext.projectRoot, 'Feature 1', 'feature');
const feature2 = addFeature(testContext.projectRoot, 'Bug Fix', 'bug');

// Update phases
await updateFeaturePhase(testContext.projectRoot, feature1.id, 'product_refinement');

const originalLedger = loadLedger(testContext.projectRoot);
```

**Execution**:
```typescript
// Re-initialize (simulates user running nextai init again)
scaffoldProject(testContext.projectRoot, 'Test Project');
```

**Assertions**:
- Ledger contains both features
- Feature phases preserved
- Feature metadata unchanged (IDs, titles, types, timestamps)
- Config file updated (if applicable)
- Templates updated (expected behavior)
- No errors or warnings about data loss

**Expected Result**: Pass - Full state preserved during re-init

---

##### Integration Test 2: Package Update Scenario

**Objective**: Verify package update flow preserves ledger

**Setup**:
```typescript
const testContext = createTestProject();

// Simulate existing installation
scaffoldProject(testContext.projectRoot, 'My Project');

// Add features in various phases
const f1 = addFeature(testContext.projectRoot, 'Complete Feature', 'feature');
const f2 = addFeature(testContext.projectRoot, 'In Progress', 'feature');
const f3 = addFeature(testContext.projectRoot, 'Blocked Bug', 'bug');

await updateFeaturePhase(testContext.projectRoot, f1.id, 'complete', { force: true });
await updateFeaturePhase(testContext.projectRoot, f2.id, 'implementation', { force: true });
blockFeature(testContext.projectRoot, f3.id, 'Waiting for external fix');

const originalLedger = loadLedger(testContext.projectRoot);
```

**Execution**:
```typescript
// Simulate package update (re-scaffold without force)
scaffoldProject(testContext.projectRoot, 'My Project');
```

**Assertions**:
- Ledger contains all 3 features
- f1 still in 'complete' phase
- f2 still in 'implementation' phase
- f3 still 'created' phase with blocked_reason preserved
- Session file updated (expected)
- Config and profile unchanged or safely updated

**Expected Result**: Pass - Complex ledger state fully preserved

---

##### Integration Test 3: Corrupted Ledger Recovery During Re-init

**Objective**: Verify re-init recovers from corrupted ledger

**Setup**:
```typescript
const testContext = createTestProject();

// Initialize normally
scaffoldProject(testContext.projectRoot, 'Test Project');

// Corrupt the ledger
const ledgerPath = getLedgerPath(testContext.projectRoot);
writeFileSync(ledgerPath, 'corrupt data', 'utf-8');

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
```

**Execution**:
```typescript
scaffoldProject(testContext.projectRoot, 'Test Project');
```

**Assertions**:
- `warnSpy` called with message about corruption
- Project successfully initialized
- New empty ledger created
- Config and profile valid
- All directories created
- No errors thrown

**Cleanup**:
```typescript
warnSpy.mockRestore();
```

**Expected Result**: Pass - Graceful recovery from corruption

---

##### Integration Test 4: First-time vs Re-init Behavior Consistency

**Objective**: Verify consistent behavior across init scenarios

**Setup**:
```typescript
const testContext1 = createTestProject();
const testContext2 = createTestProject();

// First-time init in context1
scaffoldProject(testContext1.projectRoot, 'Project 1');
const ledger1 = loadLedger(testContext1.projectRoot);

// Re-init scenario in context2
scaffoldProject(testContext2.projectRoot, 'Project 2');
scaffoldProject(testContext2.projectRoot, 'Project 2'); // Re-init
const ledger2 = loadLedger(testContext2.projectRoot);
```

**Assertions**:
- Both ledgers have same structure
- Both have empty features arrays
- Both validate against schema
- Same directory structure created
- Same template files created

**Expected Result**: Pass - Consistent behavior

---

## Manual Verification Steps

### Manual Test 1: Normal Re-initialization

**Prerequisites**: NextAI CLI built and available

**Steps**:
1. Create new directory: `mkdir test-reinit && cd test-reinit`
2. Initialize: `nextai init`
3. Add feature: `nextai feature "Test Feature"`
4. Verify ledger: `cat .nextai/state/ledger.json` (should show 1 feature)
5. Re-initialize: `nextai init`
6. Verify ledger preserved: `cat .nextai/state/ledger.json` (should still show 1 feature)
7. Verify no error messages
8. Add another feature: `nextai feature "Second Feature"`
9. Verify both features present: `nextai ls`

**Expected Result**: All features preserved, no data loss

---

### Manual Test 2: Corrupted Ledger Recovery

**Prerequisites**: NextAI CLI built and available

**Steps**:
1. Create new directory: `mkdir test-corrupt && cd test-corrupt`
2. Initialize: `nextai init`
3. Add feature: `nextai feature "Test Feature"`
4. Corrupt ledger: `echo "invalid json" > .nextai/state/ledger.json`
5. Re-initialize: `nextai init`
6. Verify warning message displayed about corruption
7. Verify new empty ledger created: `cat .nextai/state/ledger.json`
8. Verify project works: `nextai feature "New Feature"`

**Expected Result**: Warning shown, new ledger created, project functional

---

### Manual Test 3: Package Update Simulation

**Prerequisites**:
- Current version of NextAI installed
- Test project with existing ledger

**Steps**:
1. Create project with current version
2. Add several features in different phases
3. Note ledger state: `cat .nextai/state/ledger.json`
4. Simulate update by re-running init: `nextai init`
5. Verify ledger unchanged: `cat .nextai/state/ledger.json`
6. Verify features still accessible: `nextai ls`
7. Verify all phases preserved

**Expected Result**: Ledger state completely preserved

---

### Manual Test 4: Empty Ledger Preservation

**Prerequisites**: NextAI CLI built and available

**Steps**:
1. Create new directory: `mkdir test-empty && cd test-empty`
2. Initialize: `nextai init`
3. Verify empty ledger: `cat .nextai/state/ledger.json` (should show `{"features":[]}`)
4. Re-initialize: `nextai init`
5. Verify no warning messages
6. Verify ledger still valid: `cat .nextai/state/ledger.json`

**Expected Result**: No warnings, empty ledger preserved

---

### Manual Test 5: Concurrent Access Safety

**Prerequisites**: NextAI CLI built

**Steps**:
1. Initialize project
2. Add features
3. Open ledger.json in editor (don't save)
4. Run `nextai init` in terminal
5. Verify ledger preserved (not editor content)
6. Close editor without saving
7. Verify ledger still valid

**Expected Result**: File system state correctly preserved

---

## Regression Test Cases

### Regression Test 1: Existing Unit Tests Still Pass

**Objective**: Ensure no breaking changes to existing functionality

**Execution**:
```bash
npm test -- ledger.test.ts
```

**Assertions**:
- All existing ledger tests pass
- No new failures introduced
- Test coverage maintained or improved

**Expected Result**: All tests pass

---

### Regression Test 2: Existing Integration Tests Still Pass

**Objective**: Verify system-level functionality unchanged

**Execution**:
```bash
npm test -- tests/integration/
```

**Assertions**:
- All integration tests pass
- No timeout or performance regressions
- CLI commands work as before

**Expected Result**: All tests pass

---

### Regression Test 3: CLI Commands Work Correctly

**Objective**: Verify CLI still functions with updated config utils

**Test Commands**:
- `nextai init`
- `nextai feature "Test"`
- `nextai ls`
- `nextai status <id>`
- `nextai status <id> --phase product_refinement`

**Assertions**:
- All commands execute successfully
- Ledger updates correctly
- No errors or warnings

**Expected Result**: All commands work

---

## Performance Test Cases

### Performance Test 1: Initialization Speed

**Objective**: Verify no performance regression

**Setup**:
```typescript
const testContext = createTestProject();
```

**Execution**:
```typescript
const start = performance.now();
initLedger(testContext.projectRoot);
const duration = performance.now() - start;
```

**Assertions**:
- `duration` < 50ms (should be nearly instant)
- No blocking operations
- File I/O optimized

**Expected Result**: Fast initialization (< 50ms)

---

### Performance Test 2: Large Ledger Preservation

**Objective**: Verify performance with many features

**Setup**:
```typescript
const testContext = createTestProject();
initNextAIStructure(testContext.projectRoot);

// Add 100 features
for (let i = 0; i < 100; i++) {
  addFeature(testContext.projectRoot, `Feature ${i}`, 'feature');
}
```

**Execution**:
```typescript
const start = performance.now();
const ledger = initLedger(testContext.projectRoot);
const duration = performance.now() - start;
```

**Assertions**:
- `ledger.features.length` equals 100
- `duration` < 100ms (should be fast even with large ledger)
- All features preserved

**Expected Result**: Fast even with 100 features (< 100ms)

---

## Edge Case Test Cases

### Edge Case 1: Read-Only Ledger File

**Objective**: Verify behavior when ledger is read-only

**Setup**: Create ledger, make it read-only (platform-specific)

**Expected Behavior**: Error thrown when trying to save, caught by application

**Test Priority**: Low (handled by file system errors)

---

### Edge Case 2: Ledger with Future Schema Version

**Objective**: Handle ledger from future version

**Setup**: Create ledger with unknown fields (forward compatibility)

**Expected Behavior**: Schema validation may pass if extra fields allowed, otherwise corrupted ledger handling

**Test Priority**: Medium

---

### Edge Case 3: Very Large Feature Titles

**Objective**: Ensure no buffer overflow or truncation issues

**Setup**: Create ledger with features having 500+ character titles

**Expected Behavior**: Preserved correctly (no limits in schema)

**Test Priority**: Low

---

## Test Coverage Goals

### Coverage Targets
- **Line Coverage**: 100% of modified lines in `initLedger()`
- **Branch Coverage**: 100% of branches (file exists, valid/invalid ledger)
- **Function Coverage**: 100% of `initLedger()` function
- **Integration Coverage**: All re-init scenarios covered

### Coverage Verification
```bash
npm test -- --coverage --collectCoverageFrom="src/cli/utils/config.ts"
```

**Success Criteria**:
- All coverage targets met
- No uncovered lines in `initLedger()`

---

## Test Execution Order

1. **Unit Tests First**: Verify core logic in isolation
2. **Integration Tests Second**: Verify system behavior
3. **Manual Tests Third**: User-facing validation
4. **Regression Tests Fourth**: Ensure no breakage
5. **Performance Tests Fifth**: Verify efficiency

---

## Success Criteria

All tests must pass for implementation to be considered complete:

- [ ] All 7 unit tests pass
- [ ] All 4 integration tests pass
- [ ] All 5 manual verification steps successful
- [ ] All 3 regression tests pass
- [ ] Both performance tests pass
- [ ] 100% code coverage achieved
- [ ] No new errors or warnings
- [ ] Documentation updated

---

## Test Maintenance

After implementation:
- Add tests to CI/CD pipeline
- Update test documentation if new patterns introduced
- Monitor for flaky tests
- Update tests if schema changes in future
