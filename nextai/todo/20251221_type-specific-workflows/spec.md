# Type-Specific Workflows - Simplified

## Overview

This feature implements differentiated phase workflows and validation rules for the three feature types (feature, bug, task) to eliminate unnecessary friction in the NextAI development lifecycle. The implementation uses type-specific phase transitions and targeted validation rules while maintaining backward compatibility with existing features.

**Key Principle:** Keep it simple. The goal is to fix the actual problem (wrong phases for wrong types), not to complicate task validation.

## Requirements Summary

### Problem Statement

Production analysis revealed that 52% of validation bypasses occur because all types currently follow identical workflows designed for full features. The real issue:
- Bugs were forced to write product requirements.md (should write investigation.md)
- Tasks were forced through product_refinement (should skip it)
- NOT that 100% task completion was too strict

### User Needs

- **Bug fixes** need investigation documentation, not product requirements, and should focus on regression testing
- **Tasks** should skip product_refinement entirely (go straight to tech_spec)
- **Features** should maintain the full workflow with comprehensive requirements and testing
- **ALL types** require 100% task completion (if a task becomes unnecessary, delete it)

### Success Metrics

- Reduce `--force` bypass usage from 52% baseline
- Zero validation errors for type-specific phase transitions
- 100% of bugs successfully create investigation.md
- Existing features continue working without modification

## Technical Approach

### Type-Specific Phase Flows

**Feature (7 phases - unchanged):**
```
created → product_refinement → tech_spec → implementation → review → testing → complete
```

**Bug (8 phases - adds investigation):**
```
created → bug_investigation → product_refinement → tech_spec → implementation → review → testing → complete
```

**Task (6 phases - streamlined):**
```
created → tech_spec → implementation → review → testing → complete
```

### Simplified Validation Rules

**SIMPLIFIED:** All types use the same validators for most phases. Only 3 type-specific validators needed:

1. **BugInvestigationValidator** - Bugs only, requires investigation.md
2. **BugTestingValidator** - Regression test focus for bugs
3. **TaskTestingValidator** - Lighter testing validation for tasks

**Uniform validation for all types:**
- tech_spec phase: ALL types require spec.md + tasks.md (use standard TechSpecValidator)
- implementation phase: ALL types require 100% task completion (use standard ImplementationValidator)

### Backward Compatibility Strategy

Use a **creation date threshold** approach. Features created before deployment use the legacy type-agnostic workflow. Features created after deployment use type-specific workflows.

**Implementation:** Compare `created_at` timestamp to `LEGACY_WORKFLOW_CUTOFF_DATE` constant. No schema migration required.

### PHASE_ORDER Handling

**SIMPLIFIED APPROACH:**

1. **PHASE_ORDER** = all possible phases (reference only, used by legacy features)
2. **VALID_TRANSITIONS** = single source of truth for phase flow logic
3. **Deprecate** `getNextPhase(phase)` and `phaseIndex(phase)` - not type-aware
4. **Add** type-aware helpers:
   - `getPhaseFlow(type)` - returns phase sequence for a type
   - `getNextPhaseForFeature(feature)` - returns next phase based on feature type

## Architecture

### Component Changes

```
src/schemas/ledger.ts
├── Add 'bug_investigation' to PhaseSchema enum
├── Add VALID_TRANSITIONS: Record<FeatureType, Record<Phase, Phase[]>>
├── Add LEGACY_WORKFLOW_CUTOFF_DATE constant
├── Add getPhaseFlow(type): Phase[] helper
├── Add getNextPhaseForFeature(feature): Phase | null helper
├── Add isLegacyWorkflow(feature): boolean helper
├── Add getValidTransitionsForFeature(feature): Phase[] helper
└── Keep PHASE_ORDER for backward compatibility (all possible phases)

src/core/validation/
├── phase-validators.ts (MODIFIED)
│   ├── Add BugInvestigationValidator class
│   ├── Update getValidatorForPhase to accept (phase, type, isLegacy) parameters
│   └── Route to type-specific validators where needed
├── type-specific-validators.ts (NEW - only 3 validators)
│   ├── BugTestingValidator (regression test requirement)
│   └── TaskTestingValidator (lighter validation)
└── No TaskTechSpecValidator or TaskImplementationValidator (use standard validators)

src/core/state/ledger.ts
├── Update validateFeatureForPhase to check isLegacyWorkflow(feature)
├── Update to use getValidTransitionsForFeature instead of VALID_TRANSITIONS lookup
├── Pass feature.type and isLegacy to getValidatorForPhase
└── Update error messages to include feature type context

src/cli/commands/show.ts
├── Import getPhaseFlow helper
├── Display type-specific workflow visualization
└── Show current phase in context of type-specific flow

resources/templates/commands/refine.md
├── Add type detection logic (parse type from nextai show --json)
├── Add bug workflow routing (created → investigator → architect, skip product owner)
├── Add task workflow routing (created → architect directly, skip product owner)
└── Add feature workflow routing (created → product owner → architect, unchanged)
```

### Data Flow

```
CLI Command (e.g., nextai advance)
    ↓
getFeature(projectRoot, featureId)
    ↓
isLegacyWorkflow(feature) → determines workflow version
    ↓
validateFeatureForPhase(projectRoot, featureId, newPhase)
    ↓
getValidatorForPhase(phase, feature.type, workflowVersion)
    ↓
Type-aware validator validates artifacts
    ↓
updateLedgerPhase if validation passes
```

## Implementation Details

### 1. Schema Changes (src/schemas/ledger.ts)

```typescript
// Add bug_investigation to PhaseSchema
export const PhaseSchema = z.enum([
  'created',
  'bug_investigation',      // NEW
  'product_refinement',
  'tech_spec',
  'implementation',
  'review',
  'testing',
  'complete',
]);

// Workflow cutoff date (features created before this use legacy workflow)
export const LEGACY_WORKFLOW_CUTOFF_DATE = '2025-12-21T00:00:00.000Z';

// Type-specific phase transitions (SINGLE SOURCE OF TRUTH)
export const VALID_TRANSITIONS: Record<FeatureType, Record<Phase, Phase[]>> = {
  feature: {
    created: ['product_refinement'],
    bug_investigation: [],  // Not used by features
    product_refinement: ['tech_spec'],
    tech_spec: ['implementation'],
    implementation: ['review'],
    review: ['testing', 'implementation'],
    testing: ['complete', 'implementation'],
    complete: [],
  },
  bug: {
    created: ['bug_investigation'],
    bug_investigation: ['product_refinement'],
    product_refinement: ['tech_spec'],
    tech_spec: ['implementation'],
    implementation: ['review'],
    review: ['testing', 'implementation'],
    testing: ['complete', 'implementation'],
    complete: [],
  },
  task: {
    created: ['tech_spec'],
    bug_investigation: [],  // Not used by tasks
    product_refinement: [],  // Not used by tasks
    tech_spec: ['implementation'],
    implementation: ['review'],
    review: ['testing', 'implementation'],
    testing: ['complete', 'implementation'],
    complete: [],
  },
};

// Keep PHASE_ORDER for reference (all possible phases)
// Used by legacy features via backward compatibility mechanism
export const PHASE_ORDER: Phase[] = [
  'created',
  'bug_investigation',
  'product_refinement',
  'tech_spec',
  'implementation',
  'review',
  'testing',
  'complete',
];

// Type-aware helper: get phase sequence for a type
export function getPhaseFlow(type: FeatureType): Phase[] {
  switch (type) {
    case 'feature':
      return [
        'created',
        'product_refinement',
        'tech_spec',
        'implementation',
        'review',
        'testing',
        'complete',
      ];
    case 'bug':
      return [
        'created',
        'bug_investigation',
        'product_refinement',
        'tech_spec',
        'implementation',
        'review',
        'testing',
        'complete',
      ];
    case 'task':
      return [
        'created',
        'tech_spec',
        'implementation',
        'review',
        'testing',
        'complete',
      ];
  }
}

// Type-aware helper: get next phase for a feature
export function getNextPhaseForFeature(feature: Feature): Phase | null {
  const validTransitions = VALID_TRANSITIONS[feature.type][feature.phase];
  if (validTransitions.length === 0) return null;
  if (validTransitions.length === 1) return validTransitions[0];
  // Multiple transitions (e.g., review can go to testing or back to implementation)
  // Caller must decide based on context (review pass/fail)
  return null; // Caller should check VALID_TRANSITIONS directly for multi-option
}

// Helper to determine if feature uses legacy workflow
export function isLegacyWorkflow(feature: Feature): boolean {
  return new Date(feature.created_at) < new Date(LEGACY_WORKFLOW_CUTOFF_DATE);
}

// Helper to get valid transitions for a feature (type-aware or legacy)
export function getValidTransitionsForFeature(feature: Feature): Phase[] {
  if (isLegacyWorkflow(feature)) {
    // Legacy: use old VALID_TRANSITIONS structure
    const LEGACY_TRANSITIONS: Record<Phase, Phase[]> = {
      created: ['product_refinement'],
      bug_investigation: ['product_refinement'],
      product_refinement: ['tech_spec'],
      tech_spec: ['implementation'],
      implementation: ['review'],
      review: ['testing', 'implementation'],
      testing: ['complete', 'implementation'],
      complete: [],
    };
    return LEGACY_TRANSITIONS[feature.phase];
  }

  // Type-specific workflow
  return VALID_TRANSITIONS[feature.type][feature.phase] || [];
}
```

### 2. Validation Layer - Simplified

**Modified: src/core/validation/phase-validators.ts**

```typescript
// Add new BugInvestigationValidator (only type-specific validator in this file)
export class BugInvestigationValidator implements PhaseValidator {
  targetPhase: Phase = 'product_refinement';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const investigationPath = join(featureDir, 'planning', 'investigation.md');

    if (!existsWithContent(investigationPath)) {
      issues.push({
        level: 'error',
        message: 'investigation.md is missing or empty',
      });
    } else {
      const content = readFileSync(investigationPath, 'utf-8');

      // Check for root cause section
      if (!content.toLowerCase().includes('root cause')) {
        issues.push({
          level: 'warning',
          message: 'investigation.md should contain root cause analysis',
        });
      }
    }

    return createResult(issues);
  }
}

// Standard TechSpecValidator - used by ALL types (no TaskTechSpecValidator needed)
export class TechSpecValidator implements PhaseValidator {
  targetPhase: Phase = 'implementation';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const specPath = join(featureDir, 'spec.md');
    const tasksPath = join(featureDir, 'tasks.md');

    if (!existsWithContent(specPath)) {
      issues.push({ level: 'error', message: 'spec.md is missing or empty' });
    }

    // tasks.md REQUIRED for ALL types
    if (!existsWithContent(tasksPath)) {
      issues.push({ level: 'error', message: 'tasks.md is missing or empty' });
    } else {
      const content = readFileSync(tasksPath, 'utf-8');
      if (!content.match(/^[-*]\s+\[[\sx]\]/m)) {
        issues.push({
          level: 'warning',
          message: 'tasks.md should contain task checkboxes (- [ ] format)',
        });
      }
    }

    return createResult(issues);
  }
}

// Standard ImplementationValidator - used by ALL types (no TaskImplementationValidator needed)
export class ImplementationValidator implements PhaseValidator {
  targetPhase: Phase = 'review';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const tasksPath = join(featureDir, 'tasks.md');
    const progress = getTaskProgress(tasksPath);

    if (progress.total === 0) {
      issues.push({ level: 'error', message: 'No tasks found in tasks.md' });
    } else if (!progress.isComplete) {
      // 100% completion required for ALL types
      issues.push({
        level: 'error',
        message: `Not all tasks complete: ${progress.completed}/${progress.total} done`,
      });
    }

    return createResult(issues);
  }
}

// Update getValidatorForPhase to be type-aware
export function getValidatorForPhase(
  phase: Phase,
  type: FeatureType,
  isLegacy: boolean
): PhaseValidator | null {
  if (isLegacy) {
    // Return legacy validators (existing behavior)
    return legacyValidators[phase];
  }

  // Type-specific validators (SIMPLIFIED - only 3 type-specific validators)
  switch (phase) {
    case 'created':
      return new CreatedValidator();

    case 'bug_investigation':
      if (type === 'bug') {
        return new BugInvestigationValidator();
      }
      return null;  // Invalid phase for this type

    case 'product_refinement':
      if (type === 'task') {
        return null;  // Tasks skip this phase
      }
      return new ProductRefinementValidator();

    case 'tech_spec':
      // ALL types use standard TechSpecValidator
      return new TechSpecValidator();

    case 'implementation':
      // ALL types use standard ImplementationValidator (100% completion)
      return new ImplementationValidator();

    case 'review':
      return new ReviewValidator();

    case 'testing':
      if (type === 'bug') {
        return new BugTestingValidator();
      }
      if (type === 'task') {
        return new TaskTestingValidator();
      }
      return new TestingValidator();

    case 'complete':
      return null;

    default:
      return null;
  }
}
```

**New file: src/core/validation/type-specific-validators.ts**

```typescript
// ONLY 3 TYPE-SPECIFIC VALIDATORS (removed TaskTechSpecValidator and TaskImplementationValidator)

// BugTestingValidator - regression focus
export class BugTestingValidator implements PhaseValidator {
  targetPhase: Phase = 'complete';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const testingPath = join(featureDir, 'testing.md');

    if (!existsWithContent(testingPath)) {
      issues.push({ level: 'error', message: 'testing.md is missing or empty' });
    } else {
      const content = readFileSync(testingPath, 'utf-8').toLowerCase();

      // Check for regression test mention
      if (!content.includes('regression')) {
        issues.push({
          level: 'warning',
          message: 'Bug testing should include regression test validation',
        });
      }

      // Check for pass status
      if (!content.includes('status: pass') && !content.includes('**status:** pass')) {
        issues.push({
          level: 'error',
          message: 'No passing test found in testing.md',
          expected: 'Status: pass',
          actual: 'No passing status found',
        });
      }
    }

    return createResult(issues);
  }
}

// TaskTestingValidator - lighter requirements
export class TaskTestingValidator implements PhaseValidator {
  targetPhase: Phase = 'complete';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const testingPath = join(featureDir, 'testing.md');

    if (!existsWithContent(testingPath)) {
      issues.push({ level: 'error', message: 'testing.md is missing or empty' });
    } else {
      const content = readFileSync(testingPath, 'utf-8').toLowerCase();

      if (!content.includes('status: pass') && !content.includes('**status:** pass')) {
        issues.push({
          level: 'error',
          message: 'No passing test found in testing.md',
          expected: 'Status: pass',
          actual: 'No passing status found',
        });
      }
    }

    return createResult(issues);
  }
}
```

### 3. Ledger State Management (src/core/state/ledger.ts)

```typescript
// Update validateFeatureForPhase to be type-aware
export async function validateFeatureForPhase(
  projectRoot: string,
  featureId: string,
  newPhase: Phase,
  options: { basePath?: 'todo' | 'done' } = {}
): Promise<PhaseUpdateResult> {
  const ledger = loadLedger(projectRoot);
  const feature = ledger.features.find((f) => f.id === featureId);

  if (!feature) {
    return { success: false, error: `Feature '${featureId}' not found` };
  }

  const fromPhase = feature.phase;
  const isLegacy = isLegacyWorkflow(feature);

  // Check if transition is valid (type-aware or legacy)
  const validTransitions = getValidTransitionsForFeature(feature);

  if (!validTransitions.includes(newPhase)) {
    const errorMsg = isLegacy
      ? `Cannot transition from '${fromPhase}' to '${newPhase}'`
      : `Cannot transition ${feature.type} from '${fromPhase}' to '${newPhase}'. Valid transitions: ${validTransitions.join(', ')}`;

    return { success: false, error: errorMsg };
  }

  // Run validation for current phase (type-aware)
  const validator = getValidatorForPhase(fromPhase, feature.type, isLegacy);

  if (validator) {
    const basePath = options.basePath || 'todo';
    const featurePath = basePath === 'done'
      ? getDonePath(projectRoot, featureId)
      : getFeaturePath(projectRoot, featureId);

    const result = await validator.validate(featurePath);

    if (!result.valid) {
      return {
        success: false,
        error: `Validation failed for ${feature.type} in ${fromPhase} phase`,
        errors: result.errors,
        warnings: result.warnings,
      };
    }

    return {
      success: true,
      warnings: result.warnings,
    };
  }

  return { success: true };
}
```

### 4. CLI Commands (src/cli/commands/show.ts)

```typescript
// Update show command to display type-specific workflow
const phaseFlow = getPhaseFlow(feature.type);
const isLegacy = isLegacyWorkflow(feature);

console.log(chalk.bold('Workflow:'));
const flowStr = phaseFlow
  .map(p => p === feature.phase ? chalk.yellow(`[${p}]`) : chalk.dim(p))
  .join(' → ');
console.log(`  ${flowStr}`);

if (isLegacy) {
  console.log(chalk.dim('  (legacy workflow)'));
}
```

### 5. Template Updates (resources/templates/commands/refine.md)

```markdown
## Type-Specific Routing

Check feature type from ledger:
Run: `nextai show $ARGUMENTS --json`
Parse the `type` field.

If type is `bug` and phase is `created`:
- Launch investigator agent FIRST
- Then launch technical architect (skip product owner)

If type is `task` and phase is `created`:
- Skip product owner entirely
- Launch technical architect directly

If type is `feature` and phase is `created`:
- Launch product owner for requirements gathering
- Then launch technical architect
```

## API/Interface Changes

### New Exports

**src/schemas/ledger.ts:**
```typescript
export const LEGACY_WORKFLOW_CUTOFF_DATE: string;
export function getPhaseFlow(type: FeatureType): Phase[];
export function getNextPhaseForFeature(feature: Feature): Phase | null;
export function isLegacyWorkflow(feature: Feature): boolean;
export function getValidTransitionsForFeature(feature: Feature): Phase[];
```

**src/core/validation/phase-validators.ts:**
```typescript
export class BugInvestigationValidator implements PhaseValidator;
export function getValidatorForPhase(
  phase: Phase,
  type: FeatureType,
  isLegacy: boolean
): PhaseValidator | null;
```

**src/core/validation/type-specific-validators.ts:**
```typescript
export class BugTestingValidator implements PhaseValidator;
export class TaskTestingValidator implements PhaseValidator;
// No TaskTechSpecValidator or TaskImplementationValidator
```

### Deprecated Functions

**src/schemas/ledger.ts:**
```typescript
// Deprecated (not type-aware - use getNextPhaseForFeature instead)
export function getNextPhase(phase: Phase): Phase | null;
export function phaseIndex(phase: Phase): number;
```

## Data Model

### Schema Changes

**Phase enum addition:**
```typescript
type Phase =
  | 'created'
  | 'bug_investigation'  // NEW
  | 'product_refinement'
  | 'tech_spec'
  | 'implementation'
  | 'review'
  | 'testing'
  | 'complete';
```

**New constants:**
```typescript
LEGACY_WORKFLOW_CUTOFF_DATE = '2025-12-21T00:00:00.000Z'
VALID_TRANSITIONS: Record<FeatureType, Record<Phase, Phase[]>>
```

### No Database Migration Required

Backward compatibility uses `created_at` timestamp comparison, requiring no schema migration. Existing features automatically use legacy workflow.

## Security Considerations

### Input Validation

- Feature type validated against allowed enum values (`feature`, `bug`, `task`)
- Phase transitions validated against type-specific allowed transitions
- All file path operations use existing path sanitization

### Backward Compatibility

- Legacy features (created before cutoff date) continue using original workflow
- No data loss or corruption risk from feature type handling
- Validation bypass logging continues to work (audit trail maintained)

## Error Handling

### Type-Specific Error Messages

**Invalid phase transition:**
```
Error: Cannot transition bug from 'created' to 'tech_spec'.
Valid transitions from 'created' for bugs: bug_investigation

Hint: Bugs must go through investigation phase first.
Run: /nextai-refine <id> to start bug investigation
```

**Missing type-specific artifact:**
```
Error: Cannot advance bug from bug_investigation to product_refinement.
Validation failed:
  - investigation.md is missing or empty

Hint: Create investigation.md with root cause analysis.
Run: /nextai-refine <id> to launch investigator agent
```

**Task completion (uniform for all types):**
```
Error: Cannot advance from implementation to review.
Validation failed:
  - Not all tasks complete: 8/10 done

Hint: Complete remaining tasks or use --force to bypass.
```

### Graceful Degradation

- If validator factory returns `null` for invalid phase/type combo, treat as validation pass (fail open)
- Legacy workflow fallback if `isLegacyWorkflow` logic fails
- Existing `--force` flag continues to bypass all type-specific validation

## Alternatives Considered

### 1. Task Completion Validation

**Chosen: Uniform 100% completion for all types**
- Pros: Simple, consistent, no special cases
- Cons: None - the real problem was wrong phases, not strict task completion

**Rejected: 75% threshold for tasks**
- Pros: More flexible for exploratory work
- Cons: Adds complexity, creates two validation code paths, not addressing actual problem

### 2. PHASE_ORDER Array Handling

**Chosen: Keep as reference only, use VALID_TRANSITIONS as source of truth**
- Pros: Clean, single source of truth, type-aware from start
- Cons: None - this is the correct approach

**Rejected: Type-specific PHASE_ORDER arrays**
- Pros: Explicit ordering per type
- Cons: More complex, breaks existing code, redundant with VALID_TRANSITIONS

### 3. Backward Compatibility

**Chosen: Creation date threshold**
- Pros: Simple, no schema changes, automatic segmentation
- Cons: Requires hardcoded cutoff date

**Rejected: Schema version field**
- Pros: Explicit versioning
- Cons: Requires schema migration, adds field to every feature

## Testing Strategy

Project uses Vitest with unit, integration, and e2e test suites. Coverage thresholds enforced.

**New test files:**
- `tests/unit/schemas/ledger.test.ts` - Test type-aware helpers
- `tests/unit/core/validation/type-specific-validators.test.ts` - Test 3 type-specific validators
- `tests/unit/core/state/ledger.test.ts` - Add type-specific transition tests

**Test focus:**
1. Legacy workflow detection works correctly
2. Type-specific transitions enforced correctly
3. BugInvestigationValidator requires investigation.md
4. ALL types require 100% task completion (no 75% threshold)
5. Type-aware error messages display correctly
6. getPhaseFlow() returns correct sequences per type
7. getNextPhaseForFeature() returns type-aware next phase

## Notes

This simplified approach eliminates unnecessary complexity while solving the actual problem: wrong phases for wrong types.

**Key Simplifications:**
1. Removed TaskTechSpecValidator (use standard TechSpecValidator)
2. Removed TaskImplementationValidator (use standard ImplementationValidator)
3. Removed 75% threshold logic entirely
4. Removed optional tasks.md behavior
5. Only 3 type-specific validators needed (down from 5)

**Why This Works:**
The 52% --force bypass rate wasn't caused by overly strict task completion rules - it was caused by forcing bugs and tasks through product_refinement. By addressing the root cause (wrong phases for wrong types), we don't need to complicate task validation.

**Philosophy:**
Tasks are implementation checklists. If a task becomes unnecessary, delete it. That's what --force is for - exceptional cases, not routine workflow.
