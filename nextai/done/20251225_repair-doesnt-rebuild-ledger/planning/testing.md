# Testing Plan

## Overview

This testing plan ensures the repair command can successfully reconstruct missing ledger entries by scanning the file system and extracting metadata from feature directories.

## Unit Tests

### File: `tests/unit/cli/repair-helpers.test.ts` (new file)

#### Test Suite: extractFeatureMetadata()

**Purpose**: Verify metadata extraction from initialization.md files

##### Test: Extracts Bug type and title
```typescript
it('extracts Bug type and title from initialization.md', () => {
  // Setup: Create temp dir with initialization.md
  // Content: "# Bug: Fix the login issue"
  const result = extractFeatureMetadata(tempDir);
  expect(result.type).toBe('bug');
  expect(result.title).toBe('Fix the login issue');
});
```

##### Test: Extracts Feature type and title
```typescript
it('extracts Feature type and title from initialization.md', () => {
  // Content: "# Feature: Add dark mode"
  const result = extractFeatureMetadata(tempDir);
  expect(result.type).toBe('feature');
  expect(result.title).toBe('Add dark mode');
});
```

##### Test: Extracts Task type and title
```typescript
it('extracts Task type and title from initialization.md', () => {
  // Content: "# Task: Update documentation"
  const result = extractFeatureMetadata(tempDir);
  expect(result.type).toBe('task');
  expect(result.title).toBe('Update documentation');
});
```

##### Test: Case-insensitive type parsing
```typescript
it('handles case-insensitive type parsing', () => {
  // Content: "# BUG: Something broken"
  const result = extractFeatureMetadata(tempDir);
  expect(result.type).toBe('bug');
  expect(result.title).toBe('Something broken');
});
```

##### Test: Malformed heading without colon
```typescript
it('uses fallback when heading has no colon', () => {
  // Content: "# Bug fix"
  const result = extractFeatureMetadata(tempDir);
  expect(result.type).toBe('feature'); // Default
  expect(result.title).toBe(basename(tempDir)); // Folder name
});
```

##### Test: Missing initialization.md
```typescript
it('uses folder name when initialization.md missing', () => {
  // Setup: No initialization.md file
  const result = extractFeatureMetadata(tempDir);
  expect(result.type).toBe('feature'); // Default
  expect(result.title).toBe(basename(tempDir));
});
```

##### Test: Empty initialization.md
```typescript
it('handles empty initialization.md file', () => {
  // Setup: Empty file
  const result = extractFeatureMetadata(tempDir);
  expect(result.type).toBe('feature');
  expect(result.title).toBe(basename(tempDir));
});
```

##### Test: Multiline title handling
```typescript
it('extracts only first line as title', () => {
  // Content: "# Feature: Add\nmultiline\ntitle"
  const result = extractFeatureMetadata(tempDir);
  expect(result.title).toBe('Add'); // Not including newlines
});
```

---

#### Test Suite: detectPhaseFromArtifacts()

**Purpose**: Verify phase detection based on existing artifact files

##### Test: Only initialization.md exists
```typescript
it('returns created when only initialization.md exists', () => {
  // Setup: Create only planning/initialization.md
  const phase = detectPhaseFromArtifacts(tempDir);
  expect(phase).toBe('created');
});
```

##### Test: Requirements.md exists
```typescript
it('returns product_refinement when requirements.md exists', () => {
  // Setup: Create planning/initialization.md + planning/requirements.md
  const phase = detectPhaseFromArtifacts(tempDir);
  expect(phase).toBe('product_refinement');
});
```

##### Test: Spec.md exists
```typescript
it('returns tech_spec when spec.md exists', () => {
  // Setup: Create planning/ files + spec.md
  const phase = detectPhaseFromArtifacts(tempDir);
  expect(phase).toBe('tech_spec');
});
```

##### Test: Tasks.md exists
```typescript
it('returns implementation when tasks.md exists', () => {
  // Setup: Create planning/ files + spec.md + tasks.md
  const phase = detectPhaseFromArtifacts(tempDir);
  expect(phase).toBe('implementation');
});
```

##### Test: Review.md exists
```typescript
it('returns testing when review.md exists', () => {
  // Setup: Create all previous files + review.md
  const phase = detectPhaseFromArtifacts(tempDir);
  expect(phase).toBe('testing');
});
```

##### Test: Multiple artifacts (highest phase wins)
```typescript
it('returns highest phase when multiple artifacts exist', () => {
  // Setup: Create spec.md, tasks.md, review.md
  const phase = detectPhaseFromArtifacts(tempDir);
  expect(phase).toBe('testing'); // Highest
});
```

##### Test: Empty directory
```typescript
it('returns created for empty directory', () => {
  // Setup: No files
  const phase = detectPhaseFromArtifacts(tempDir);
  expect(phase).toBe('created');
});
```

---

## Integration Tests

### File: `tests/integration/cli/repair.test.ts` (extend existing)

#### Test Suite: Repair - Ledger Reconstruction

**Purpose**: End-to-end testing of ledger reconstruction functionality

##### Test: Detects missing ledger entry for todo/ feature
```typescript
it('detects missing ledger entry for todo/ feature', () => {
  // Setup
  const feature = createFeature('Test Feature');
  scaffoldFeature(projectRoot, feature.id, feature.title, 'feature');

  // Remove from ledger
  const ledger = loadLedger(projectRoot);
  ledger.features = ledger.features.filter(f => f.id !== feature.id);
  saveLedger(projectRoot, ledger);

  // Verify folder exists but not in ledger
  expect(featureFolderExists(projectRoot, feature.id)).toBe(true);
  expect(getFeature(projectRoot, feature.id)).toBeUndefined();

  // Note: Actual CLI execution would be tested with exec/spawn
});
```

##### Test: Detects missing ledger entry for done/ feature
```typescript
it('detects missing ledger entry for done/ feature', () => {
  // Setup
  const feature = createFeature('Completed Feature');
  scaffoldFeature(projectRoot, feature.id, feature.title, 'feature');

  // Archive to done/
  archiveFeature(projectRoot, feature.id);

  // Remove from ledger
  const ledger = loadLedger(projectRoot);
  ledger.features = ledger.features.filter(f => f.id !== feature.id);
  saveLedger(projectRoot, ledger);

  // Verify in done/ but not in ledger
  const donePath = getDonePath(projectRoot, feature.id);
  expect(existsSync(donePath)).toBe(true);
  expect(getFeature(projectRoot, feature.id)).toBeUndefined();
});
```

##### Test: Reconstructs ledger entry with correct metadata
```typescript
it('reconstructs ledger entry with correct metadata', () => {
  // Setup
  const originalTitle = 'Test Bug Fix';
  const originalType = 'bug';
  const feature = addFeature(projectRoot, originalTitle, originalType);
  scaffoldFeature(projectRoot, feature.id, originalTitle, originalType);

  // Simulate ledger loss
  saveLedger(projectRoot, { features: [] });

  // Run repair --apply (via programmatic call or CLI exec)
  // ... apply fixes ...

  // Verify reconstruction
  const restored = getFeature(projectRoot, feature.id);
  expect(restored).toBeDefined();
  expect(restored.title).toBe(originalTitle);
  expect(restored.type).toBe(originalType);
  expect(restored.phase).toBe('created');
});
```

##### Test: Handles multiple missing entries
```typescript
it('handles multiple missing entries', () => {
  // Setup multiple features
  const features = [
    createFeature('Feature 1'),
    createFeature('Feature 2'),
    createFeature('Feature 3'),
  ];

  features.forEach(f => {
    scaffoldFeature(projectRoot, f.id, f.title, 'feature');
  });

  // Clear ledger
  saveLedger(projectRoot, { features: [] });

  // Run repair
  // ... apply fixes ...

  // Verify all restored
  const ledger = loadLedger(projectRoot);
  expect(ledger.features.length).toBe(3);
  expect(ledger.features.map(f => f.id)).toContain(features[0].id);
  expect(ledger.features.map(f => f.id)).toContain(features[1].id);
  expect(ledger.features.map(f => f.id)).toContain(features[2].id);
});
```

##### Test: Preserves existing ledger entries during reconstruction
```typescript
it('preserves existing ledger entries during reconstruction', () => {
  // Setup
  const existing = createFeature('Existing Feature');
  scaffoldFeature(projectRoot, existing.id, existing.title, 'feature');

  const missing = addFeature(projectRoot, 'Missing Feature', 'feature');
  scaffoldFeature(projectRoot, missing.id, missing.title, 'feature');

  // Remove only one from ledger
  const ledger = loadLedger(projectRoot);
  ledger.features = ledger.features.filter(f => f.id !== missing.id);
  saveLedger(projectRoot, ledger);

  // Run repair
  // ... apply fixes ...

  // Verify both present
  const final = loadLedger(projectRoot);
  expect(final.features.length).toBe(2);
  expect(getFeature(projectRoot, existing.id)).toBeDefined();
  expect(getFeature(projectRoot, missing.id)).toBeDefined();
});
```

##### Test: Correctly detects phase from artifact files
```typescript
it('correctly detects phase from artifact files', () => {
  // Setup feature with spec.md and tasks.md
  const feature = createFeature('In Progress Feature');
  scaffoldFeature(projectRoot, feature.id, feature.title, 'feature');

  // Create spec and tasks files
  const featurePath = getFeaturePath(projectRoot, feature.id);
  writeFileSync(join(featurePath, 'spec.md'), '# Spec');
  writeFileSync(join(featurePath, 'tasks.md'), '# Tasks');

  // Remove from ledger
  saveLedger(projectRoot, { features: [] });

  // Run repair
  // ... apply fixes ...

  // Verify phase detected as implementation
  const restored = getFeature(projectRoot, feature.id);
  expect(restored.phase).toBe('implementation');
});
```

##### Test: Handles feature with missing initialization.md
```typescript
it('handles feature with missing initialization.md', () => {
  // Setup feature folder without initialization.md
  const featureId = '20251225_test-feature';
  const featurePath = getFeaturePath(projectRoot, featureId);
  ensureDir(featurePath);

  // Clear ledger
  saveLedger(projectRoot, { features: [] });

  // Run repair
  // ... apply fixes ...

  // Verify entry created with fallback values
  const restored = getFeature(projectRoot, featureId);
  expect(restored).toBeDefined();
  expect(restored.id).toBe(featureId);
  expect(restored.title).toBe(featureId); // Fallback to folder name
  expect(restored.type).toBe('feature'); // Default type
});
```

---

## Manual Verification Steps

### Scenario 1: Full Recovery from Ledger Loss

**Setup**:
1. Create a new test project:
   ```bash
   mkdir test-repair-recovery
   cd test-repair-recovery
   npm init -y
   npm install /path/to/nextai
   npx nextai init
   ```

2. Create diverse features:
   ```bash
   npx nextai new "Feature: Add user auth"
   npx nextai new "Bug: Fix login error" --type bug
   npx nextai new "Task: Update docs" --type task
   ```

3. Progress features to different phases:
   ```bash
   # Progress first feature through workflow
   npx nextai status <id1> --phase product_refinement
   npx nextai status <id1> --phase tech_spec

   # Complete and archive one feature
   npx nextai status <id2> --phase complete
   ```

4. Backup ledger:
   ```bash
   cp .nextai/state/ledger.json .nextai/state/ledger.backup.json
   ```

5. Simulate Bug #1 (ledger loss):
   ```bash
   echo '{"features":[]}' > .nextai/state/ledger.json
   ```

**Test Steps**:

1. Verify ledger is empty:
   ```bash
   npx nextai list
   # Expected: No features listed
   ```

2. Run repair in check mode:
   ```bash
   npx nextai repair --check-only
   ```

   **Expected output**:
   - Warning: Missing ledger entry for todo/20251225_add-user-auth (feature: Feature: Add user auth)
   - Warning: Missing ledger entry for todo/20251225_update-docs (task: Task: Update docs)
   - Warning: Missing ledger entry for done/20251225_fix-login-error (bug: Bug: Fix login error)
   - Message: "Run with --apply to fix 3 issue(s)"
   - Exit code: 1

3. Apply fixes:
   ```bash
   npx nextai repair --apply
   ```

   **Expected output**:
   - Fixed: Missing ledger entry for todo/...
   - Fixed: Missing ledger entry for done/...
   - Success: Repair complete: 3 fix(es) applied
   - Exit code: 0

4. Verify restoration:
   ```bash
   npx nextai list
   ```

   **Expected**:
   - All 3 features visible
   - Correct titles and types
   - Correct phases (tech_spec for #1, created for #2, complete for #3)

5. Compare with backup:
   ```bash
   cat .nextai/state/ledger.json
   cat .nextai/state/ledger.backup.json
   ```

   **Expected**:
   - All feature IDs match
   - Titles and types match
   - Phases match (or correctly inferred)
   - Timestamps different (acceptable)

**Cleanup**:
```bash
cd ..
rm -rf test-repair-recovery
```

---

### Scenario 2: Performance with Large Project

**Setup**:
1. Use existing nextai-dev project (has 23+ done features)
2. Backup ledger
3. Note current ledger state

**Test Steps**:

1. Run repair on intact project:
   ```bash
   npx nextai repair --check-only
   ```

   **Expected**:
   - No issues found
   - Exit code: 0
   - Execution time < 1 second

2. Partially corrupt ledger (remove 5 entries):
   ```bash
   # Edit .nextai/state/ledger.json manually
   # Remove 5 feature entries
   ```

3. Run repair:
   ```bash
   npx nextai repair --check-only
   ```

   **Expected**:
   - 5 missing entries detected
   - Correct metadata extracted
   - Execution time < 2 seconds

4. Verify verbose output:
   ```bash
   npx nextai repair --check-only -v
   ```

   **Expected**:
   - "Scanning todo/ directory..."
   - "Found N feature folders"
   - "Scanning done/ directory..."
   - "Found 23 archived features"

**Cleanup**:
```bash
# Restore ledger from backup
cp .nextai/state/ledger.backup.json .nextai/state/ledger.json
```

---

### Scenario 3: Edge Cases

#### Test A: Malformed initialization.md
**Setup**:
```bash
# Create feature with malformed init file
npx nextai new "Test Feature"
# Edit initialization.md: Remove "# Feature:" prefix
echo "Just a title" > nextai/todo/<id>/planning/initialization.md
```

**Test**:
```bash
# Remove from ledger
echo '{"features":[]}' > .nextai/state/ledger.json
npx nextai repair --apply
```

**Expected**:
- Entry restored with fallback values
- Title = folder name
- Type = 'feature' (default)

#### Test B: Empty directories
**Setup**:
```bash
# Ensure empty todo/ and done/
rm -rf nextai/todo/*
rm -rf nextai/done/*
echo '{"features":[]}' > .nextai/state/ledger.json
```

**Test**:
```bash
npx nextai repair --check-only
```

**Expected**:
- "Project is healthy"
- No warnings
- Exit code: 0

#### Test C: Feature in both todo/ and done/
**Setup**:
```bash
# Create feature
npx nextai new "Duplicate Test"
# Copy to done/ (artificial scenario)
cp -r nextai/todo/<id> nextai/done/<id>
# Clear ledger
echo '{"features":[]}' > .nextai/state/ledger.json
```

**Test**:
```bash
npx nextai repair --apply
npx nextai list
```

**Expected**:
- Both entries restored
- One in todo/ with inferred phase
- One in done/ with phase='complete'
- No errors (duplicate IDs handled)

---

## Acceptance Criteria Validation

After all tests pass, verify:

- [x] Repair scans `nextai/todo/` for feature folders
  - Verified by: Integration test + Manual Scenario 1

- [x] Repair scans `nextai/done/` for archived feature folders
  - Verified by: Integration test + Manual Scenario 1

- [x] Missing ledger entries are detected and reported
  - Verified by: All integration tests + Manual Scenario 1 step 2

- [x] User can choose to add missing entries to ledger
  - Verified by: --check-only vs --apply behavior in Manual Scenario 1

- [x] Feature metadata (title, type, phase) is read from initialization.md
  - Verified by: Unit tests for extractFeatureMetadata + Integration tests

- [x] Tests added for ledger reconstruction scenario
  - Verified by: This entire testing plan

---

## Test Execution Checklist

- [ ] Run unit tests: `npm test tests/unit/cli/repair-helpers.test.ts`
- [ ] Run integration tests: `npm test tests/integration/cli/repair.test.ts`
- [ ] Execute Manual Scenario 1 (full recovery)
- [ ] Execute Manual Scenario 2 (performance)
- [ ] Execute Manual Scenario 3 (edge cases A, B, C)
- [ ] Verify all tests pass
- [ ] Verify no regressions in existing repair tests
- [ ] Verify acceptance criteria met

---

## Success Metrics

- **Unit test coverage**: 100% for new helper functions
- **Integration test coverage**: 7+ test cases covering main scenarios
- **Manual verification**: All 3 scenarios pass
- **Performance**: Repair completes in < 2 seconds for 30+ features
- **Reliability**: No false positives or false negatives in detection
- **User experience**: Clear, actionable error messages
