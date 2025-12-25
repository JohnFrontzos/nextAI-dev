# Technical Specification: Repair Command Ledger Reconstruction

## Problem Statement

The `repair` command currently only validates existing ledger entries and removes orphan entries (ledger entries without corresponding feature folders). It does not scan the file system to detect missing ledger entries, making it unable to recover from ledger data loss scenarios.

### Current Behavior

When `nextai repair` runs, it performs these checks (in `src/cli/commands/repair.ts:137-209`):

1. Validates `config.json` exists
2. Validates `profile.json` exists
3. Validates `ledger.json` is valid JSON
4. Checks for orphan ledger entries (ledger entry exists but folder missing)
5. Checks if `agents/` and `skills/` directories exist

### The Gap

The repair command does NOT:
- Scan `nextai/todo/` directory for feature folders
- Scan `nextai/done/` directory for archived feature folders
- Detect features that exist on disk but are missing from the ledger
- Provide a way to reconstruct lost ledger entries

### Impact

When Bug #1 (initLedger overwrite) occurs and clears the ledger, users have no automated way to restore their lost feature tracking data. The repair command reports "Project is healthy" even when 23 features exist in `done/` with no ledger entries.

## Solution Design

### High-Level Approach

Extend the `checkProject()` function to perform bidirectional validation:

1. **Existing check**: Ledger entry → Feature folder (orphan detection)
2. **New check**: Feature folder → Ledger entry (missing entry detection)

### Implementation Strategy

Add two new scanning checks to `checkProject()`:

1. **Scan `nextai/todo/` directory**
   - Read all subdirectories
   - For each directory, check if a corresponding ledger entry exists
   - If missing, offer to reconstruct the entry from `initialization.md`

2. **Scan `nextai/done/` directory**
   - Read all subdirectories
   - For each directory, check if a corresponding ledger entry exists
   - If missing, offer to reconstruct the entry with `phase: complete`

### Metadata Extraction

To reconstruct ledger entries, we need to extract metadata from existing files:

**Source**: `planning/initialization.md` (present in all features)

**Format**:
```markdown
# [Type]: [Title]

## Description
...
```

**Extraction Logic**:
1. Read first heading: `# Bug: Fix something` or `# Feature: New thing`
2. Parse type from heading prefix (Bug, Feature, Task)
3. Parse title from heading suffix
4. Default to type='feature' if parsing fails
5. Use folder name as fallback title if file missing

### Phase Detection

For features in `todo/`:
- Check which artifacts exist to infer the current phase
- Use existing `getRequiredArtifactsForPhase()` logic in reverse
- Default to `created` if only `initialization.md` exists

For features in `done/`:
- Always use `phase: complete`

### Data Structure

```typescript
interface MissingLedgerEntry {
  featureId: string;
  title: string;
  type: FeatureType;
  phase: Phase;
  location: 'todo' | 'done';
}
```

## Implementation Approach

### 1. Add Helper Functions

**File**: `src/cli/commands/repair.ts`

```typescript
/**
 * Extract feature metadata from initialization.md
 */
function extractFeatureMetadata(featurePath: string): {
  title: string;
  type: FeatureType;
} {
  const initPath = join(featurePath, 'planning', 'initialization.md');

  if (!existsSync(initPath)) {
    return {
      title: basename(featurePath),
      type: 'feature'
    };
  }

  const content = readFileSync(initPath, 'utf-8');
  const firstLine = content.split('\n')[0];
  const match = firstLine.match(/^#\s+(Bug|Feature|Task):\s+(.+)$/i);

  if (match) {
    const typeStr = match[1].toLowerCase();
    const type = ['bug', 'feature', 'task'].includes(typeStr)
      ? typeStr as FeatureType
      : 'feature';
    return {
      title: match[2].trim(),
      type
    };
  }

  // Fallback
  return {
    title: basename(featurePath),
    type: 'feature'
  };
}

/**
 * Detect phase from existing artifacts
 */
function detectPhaseFromArtifacts(featurePath: string): Phase {
  // Check artifacts in reverse order (most complete first)
  if (existsSync(join(featurePath, 'review.md'))) {
    return 'testing';
  }
  if (existsSync(join(featurePath, 'tasks.md'))) {
    return 'implementation';
  }
  if (existsSync(join(featurePath, 'spec.md'))) {
    return 'tech_spec';
  }
  if (existsSync(join(featurePath, 'planning', 'requirements.md'))) {
    return 'product_refinement';
  }
  // Default: only initialization.md exists
  return 'created';
}
```

### 2. Extend checkProject() Function

**File**: `src/cli/commands/repair.ts`

Add after the orphan check (around line 183):

```typescript
// Check for missing ledger entries in todo/
const contentDir = getNextAIContentDir(projectRoot);
const todoDir = join(contentDir, 'todo');

if (existsSync(todoDir)) {
  const todoFeatures = readdirSync(todoDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const featureId of todoFeatures) {
    const inLedger = ledger.features.some(f => f.id === featureId);
    if (!inLedger) {
      const featurePath = join(todoDir, featureId);
      const metadata = extractFeatureMetadata(featurePath);
      const phase = detectPhaseFromArtifacts(featurePath);

      issues.push({
        type: 'warning',
        message: `Missing ledger entry for todo/${featureId} (${metadata.type}: ${metadata.title})`,
        fix: () => {
          const newLedger = loadLedger(projectRoot);
          const now = new Date().toISOString();
          const feature: Feature = {
            id: featureId,
            title: metadata.title,
            type: metadata.type,
            phase: phase,
            blocked_reason: null,
            retry_count: 0,
            created_at: now,
            updated_at: now,
          };
          newLedger.features.push(feature);
          saveLedger(projectRoot, newLedger);
        },
      });
    }
  }
}

// Check for missing ledger entries in done/
const doneDir = join(contentDir, 'done');

if (existsSync(doneDir)) {
  const doneFeatures = readdirSync(doneDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const featureId of doneFeatures) {
    const inLedger = ledger.features.some(f => f.id === featureId);
    if (!inLedger) {
      const featurePath = join(doneDir, featureId);
      const metadata = extractFeatureMetadata(featurePath);

      issues.push({
        type: 'warning',
        message: `Missing ledger entry for done/${featureId} (${metadata.type}: ${metadata.title})`,
        fix: () => {
          const newLedger = loadLedger(projectRoot);
          const now = new Date().toISOString();
          const feature: Feature = {
            id: featureId,
            title: metadata.title,
            type: metadata.type,
            phase: 'complete',
            blocked_reason: null,
            retry_count: 0,
            created_at: now,
            updated_at: now,
          };
          newLedger.features.push(feature);
          saveLedger(projectRoot, newLedger);
        },
      });
    }
  }
}
```

### 3. Add Required Imports

**File**: `src/cli/commands/repair.ts`

Add to existing imports:

```typescript
import { readdirSync, readFileSync } from 'fs';
import { basename } from 'path';
import { getNextAIContentDir } from '../utils/config.js';
import type { Feature, FeatureType } from '../../schemas/ledger.js';
```

## Edge Cases to Handle

### 1. Invalid Folder Names
- **Issue**: Folder names that don't match the expected ID format
- **Solution**: Process all directories; rely on metadata extraction
- **Fallback**: Use folder name as feature ID and title

### 2. Missing initialization.md
- **Issue**: Feature folder exists but `initialization.md` is missing
- **Solution**: Still create ledger entry using folder name as title
- **Default**: type='feature', title=featureId

### 3. Malformed initialization.md
- **Issue**: File exists but doesn't match expected format
- **Solution**: Use fallback parsing (read first line, extract what we can)
- **Graceful degradation**: Better to have incomplete entry than none

### 4. Duplicate Feature IDs
- **Issue**: Feature exists in both todo/ and done/ with same ID
- **Solution**: Prioritize done/ entry (feature was completed)
- **Warning**: Log this as an anomaly but don't fail

### 5. Race Conditions
- **Issue**: Ledger modified between check and fix
- **Solution**: Reload ledger in fix() callback before modifying
- **Protection**: Use fresh loadLedger() call in each fix function

### 6. Partial Metadata
- **Issue**: Title or type cannot be determined
- **Solution**: Use safe defaults (folder name, 'feature' type)
- **Recovery**: User can manually correct via `nextai status --edit`

### 7. Timestamp Preservation
- **Issue**: Cannot determine original created_at timestamp
- **Solution**: Use current timestamp for reconstructed entries
- **Limitation**: Historical accuracy lost (acceptable for recovery)

## Testing Strategy

### Unit Tests

**File**: `tests/unit/cli/repair.test.ts` (new file)

```typescript
describe('Repair - Metadata Extraction', () => {
  it('extracts title and type from initialization.md');
  it('handles malformed initialization.md gracefully');
  it('uses fallback when initialization.md missing');
  it('detects correct phase from artifacts');
  it('defaults to created phase when only init exists');
});
```

### Integration Tests

**File**: `tests/integration/cli/repair.test.ts`

Add new test cases:

```typescript
describe('Repair - Ledger Reconstruction', () => {
  it('detects missing ledger entry for todo/ feature');
  it('detects missing ledger entry for done/ feature');
  it('reconstructs ledger entry with correct metadata');
  it('handles multiple missing entries');
  it('preserves existing ledger entries during reconstruction');
  it('correctly detects phase from artifact files');
  it('handles feature with missing initialization.md');
});
```

### Manual Verification

1. **Setup scenario**:
   ```bash
   # Create features
   nextai new "Test Feature 1"
   nextai new "Test Bug" --type bug

   # Manually corrupt ledger (backup first)
   cp .nextai/state/ledger.json .nextai/state/ledger.backup.json
   echo '{"features":[]}' > .nextai/state/ledger.json
   ```

2. **Run repair**:
   ```bash
   nextai repair --check-only
   # Should report: Missing ledger entry for todo/...

   nextai repair --apply
   # Should restore entries
   ```

3. **Verify**:
   ```bash
   nextai list
   # Should show all features restored
   ```

### Test Data Requirements

Create test fixtures with:
- Feature in todo/ with complete initialization.md
- Feature in done/ with complete initialization.md
- Feature with malformed initialization.md
- Feature with missing initialization.md
- Feature with various phase artifacts (spec.md, tasks.md, etc.)

## Performance Considerations

### Directory Scanning
- Use `readdirSync` with `{ withFileTypes: true }` for efficiency
- Single pass to filter directories (no separate stat calls)
- Estimated: O(n) where n = number of items in directory

### File Reading
- Only read first line of initialization.md (not entire file)
- Use streaming or line-by-line reading for large files
- Estimated: O(m) where m = number of missing entries

### Ledger Operations
- Reload ledger for each fix to avoid stale data
- Batch operations not feasible (user may want to fix selectively)
- Acceptable: Repair is an infrequent operation

## Backwards Compatibility

- No breaking changes to existing repair functionality
- New checks are additive (extend existing behavior)
- Existing tests should continue to pass
- CLI interface unchanged (same flags: --check-only, --apply)

## Security Considerations

- Validate that scanned directories are within nextai/ folder
- Sanitize feature IDs to prevent path traversal
- Validate metadata before adding to ledger
- Use Zod schema validation for reconstructed features

## Logging and Observability

Add verbose logging for debugging:

```typescript
if (verbose) {
  logger.dim(`  Scanning todo/ directory...`);
  logger.dim(`  Found ${todoFeatures.length} feature folders`);
  logger.dim(`  Scanning done/ directory...`);
  logger.dim(`  Found ${doneFeatures.length} archived features`);
}
```

## Success Criteria

- User can run `nextai repair --apply` after ledger data loss
- All features in `todo/` and `done/` are restored to ledger
- Metadata (title, type) is accurately extracted from files
- Phase is correctly inferred for active features
- Completed features are marked with `phase: complete`
- Existing repair functionality continues to work
- All tests pass (unit + integration)
- Manual recovery scenario succeeds
