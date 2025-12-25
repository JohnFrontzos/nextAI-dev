# Implementation Tasks

## Phase 1: Helper Functions

- [ ] Add imports to `src/cli/commands/repair.ts`
  - [ ] Add `readdirSync, readFileSync` from 'fs'
  - [ ] Add `basename` from 'path'
  - [ ] Add `getNextAIContentDir` from '../utils/config.js'
  - [ ] Add `Feature, FeatureType` types from '../../schemas/ledger.js'

- [ ] Implement `extractFeatureMetadata()` helper function
  - [ ] Check if `planning/initialization.md` exists
  - [ ] Read first line from file
  - [ ] Parse heading format: `# [Type]: [Title]`
  - [ ] Extract type (Bug, Feature, Task)
  - [ ] Extract title
  - [ ] Return fallback values if parsing fails
  - [ ] Handle missing file gracefully (use folder name)

- [ ] Implement `detectPhaseFromArtifacts()` helper function
  - [ ] Check for `review.md` → return 'testing'
  - [ ] Check for `tasks.md` → return 'implementation'
  - [ ] Check for `spec.md` → return 'tech_spec'
  - [ ] Check for `planning/requirements.md` → return 'product_refinement'
  - [ ] Default to 'created' if only initialization.md exists

## Phase 2: Todo Directory Scanning

- [ ] Add todo/ directory scanning to `checkProject()`
  - [ ] Get `nextai/todo/` path using `getNextAIContentDir()`
  - [ ] Check if directory exists
  - [ ] Use `readdirSync` with `{ withFileTypes: true }`
  - [ ] Filter to directories only
  - [ ] Map to directory names (feature IDs)

- [ ] Implement missing entry detection for todo/
  - [ ] Loop through todo feature IDs
  - [ ] Check if feature ID exists in ledger
  - [ ] Skip if already in ledger
  - [ ] Extract metadata using `extractFeatureMetadata()`
  - [ ] Detect phase using `detectPhaseFromArtifacts()`
  - [ ] Create RepairIssue with warning type
  - [ ] Include descriptive message with type and title
  - [ ] Add fix() callback function

- [ ] Implement fix() callback for todo/ entries
  - [ ] Reload ledger (prevent stale data)
  - [ ] Create Feature object with:
    - [ ] id = featureId
    - [ ] title from metadata
    - [ ] type from metadata
    - [ ] phase from detection
    - [ ] blocked_reason = null
    - [ ] retry_count = 0
    - [ ] created_at = current timestamp
    - [ ] updated_at = current timestamp
  - [ ] Push feature to ledger.features array
  - [ ] Save ledger using `saveLedger()`

## Phase 3: Done Directory Scanning

- [ ] Add done/ directory scanning to `checkProject()`
  - [ ] Get `nextai/done/` path using `getNextAIContentDir()`
  - [ ] Check if directory exists
  - [ ] Use `readdirSync` with `{ withFileTypes: true }`
  - [ ] Filter to directories only
  - [ ] Map to directory names (feature IDs)

- [ ] Implement missing entry detection for done/
  - [ ] Loop through done feature IDs
  - [ ] Check if feature ID exists in ledger
  - [ ] Skip if already in ledger
  - [ ] Extract metadata using `extractFeatureMetadata()`
  - [ ] Create RepairIssue with warning type
  - [ ] Include descriptive message with type and title
  - [ ] Add fix() callback function

- [ ] Implement fix() callback for done/ entries
  - [ ] Reload ledger (prevent stale data)
  - [ ] Create Feature object with:
    - [ ] id = featureId
    - [ ] title from metadata
    - [ ] type from metadata
    - [ ] phase = 'complete' (always)
    - [ ] blocked_reason = null
    - [ ] retry_count = 0
    - [ ] created_at = current timestamp
    - [ ] updated_at = current timestamp
  - [ ] Push feature to ledger.features array
  - [ ] Save ledger using `saveLedger()`

## Phase 4: Verbose Logging

- [ ] Add verbose logging for todo/ scanning
  - [ ] Log "Scanning todo/ directory..." if verbose
  - [ ] Log "Found N feature folders" if verbose

- [ ] Add verbose logging for done/ scanning
  - [ ] Log "Scanning done/ directory..." if verbose
  - [ ] Log "Found N archived features" if verbose

## Phase 5: Unit Tests

- [ ] Create `tests/unit/cli/repair-helpers.test.ts`
  - [ ] Setup test fixtures directory
  - [ ] Create sample initialization.md files

- [ ] Test `extractFeatureMetadata()`
  - [ ] Test extracting Bug type and title
  - [ ] Test extracting Feature type and title
  - [ ] Test extracting Task type and title
  - [ ] Test case-insensitive type parsing
  - [ ] Test malformed heading (missing colon)
  - [ ] Test malformed heading (invalid format)
  - [ ] Test missing initialization.md
  - [ ] Test empty initialization.md
  - [ ] Verify fallback to folder name

- [ ] Test `detectPhaseFromArtifacts()`
  - [ ] Test with only initialization.md → 'created'
  - [ ] Test with requirements.md → 'product_refinement'
  - [ ] Test with spec.md → 'tech_spec'
  - [ ] Test with tasks.md → 'implementation'
  - [ ] Test with review.md → 'testing'
  - [ ] Test with multiple artifacts → highest phase
  - [ ] Test with empty directory → 'created'

## Phase 6: Integration Tests

- [ ] Update `tests/integration/cli/repair.test.ts`
  - [ ] Add new describe block: 'Repair - Ledger Reconstruction'

- [ ] Test missing todo/ entry detection
  - [ ] Create project with feature
  - [ ] Scaffold feature folder
  - [ ] Manually remove from ledger
  - [ ] Run repair --check-only
  - [ ] Verify issue detected
  - [ ] Verify issue type is 'warning'
  - [ ] Verify message includes feature ID

- [ ] Test missing done/ entry detection
  - [ ] Create project with feature
  - [ ] Archive feature to done/
  - [ ] Manually remove from ledger
  - [ ] Run repair --check-only
  - [ ] Verify issue detected
  - [ ] Verify phase is 'complete'

- [ ] Test ledger reconstruction with --apply
  - [ ] Create multiple features
  - [ ] Clear ledger (keep backup)
  - [ ] Run repair --apply
  - [ ] Verify all features restored
  - [ ] Verify metadata matches original
  - [ ] Verify phases detected correctly

- [ ] Test mixed scenario (todo + done missing entries)
  - [ ] Create features in todo/ and done/
  - [ ] Remove some from ledger
  - [ ] Run repair --apply
  - [ ] Verify all missing entries restored
  - [ ] Verify existing entries preserved

- [ ] Test edge cases
  - [ ] Feature with missing initialization.md
  - [ ] Feature with malformed initialization.md
  - [ ] Empty todo/ and done/ directories
  - [ ] Ledger already complete (no issues)

## Phase 7: Manual Testing

- [ ] Test full recovery scenario
  - [ ] Create new project
  - [ ] Add several features (different types)
  - [ ] Progress features to different phases
  - [ ] Complete and archive some features
  - [ ] Backup ledger
  - [ ] Clear ledger (simulate Bug #1)
  - [ ] Run `nextai repair --check-only`
  - [ ] Verify all missing entries reported
  - [ ] Run `nextai repair --apply`
  - [ ] Verify ledger reconstructed
  - [ ] Run `nextai list` to verify features visible
  - [ ] Compare with backup (metadata matches)

- [ ] Test with existing nextai-dev project
  - [ ] Run repair on actual project
  - [ ] Verify no false positives
  - [ ] Check performance with 23+ features

## Phase 8: Documentation

- [ ] Update CLI help text if needed
- [ ] Add comment documentation to new functions
- [ ] Ensure JSDoc comments are complete

## Phase 9: Final Validation

- [ ] Run all tests: `npm test`
- [ ] Run linter: `npm run lint`
- [ ] Run type check: `npm run type-check`
- [ ] Test in dev environment
- [ ] Verify no regressions in existing repair functionality
- [ ] Verify acceptance criteria met:
  - [ ] Repair scans `nextai/todo/` for feature folders
  - [ ] Repair scans `nextai/done/` for archived feature folders
  - [ ] Missing ledger entries are detected and reported
  - [ ] User can choose to add missing entries to ledger
  - [ ] Feature metadata (title, type, phase) is read from files
  - [ ] Tests added for ledger reconstruction scenario
