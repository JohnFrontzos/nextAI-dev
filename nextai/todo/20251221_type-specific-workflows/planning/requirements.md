# Requirements: Type-Specific Workflows - Simplification Questions

## Summary

The user has identified potential over-complexity in the current type-specific workflows specification. This requirements document addresses two key simplification questions that will reduce complexity while maintaining the core goal of reducing --force bypasses.

## Context

The original spec proposed differentiated workflows and validation rules per type (feature, bug, task). During implementation planning, the user identified two areas where the spec may be unnecessarily complex:

1. Task completion validation thresholds varying by type (100% vs 75%)
2. PHASE_ORDER array handling with type-specific phase sequences

## Questions to Answer

### Question 1: tasks.md Validation per Type

**Current Spec Proposal:**
- Feature/Bug: tasks.md required, 100% task completion required
- Task: tasks.md optional, 75% threshold if present

**User's Concern:**
"Why change our validation of tasks for every type? Tasks are there to implement all, no?"

**Proposed Answer:**

Keep it simple - ALL types should require:
- tasks.md is REQUIRED for all types
- 100% task completion REQUIRED for all types (or use --force to bypass)

**Rationale:**

1. **Consistency**: The 75% threshold adds complexity without clear benefit. Tasks are implementation checklists, not aspirational goals. If a task isn't needed, delete it.

2. **Production data doesn't support 75% threshold**: The 52% of --force bypasses were for "Not all tasks complete" - but this doesn't mean tasks needed a lower threshold. It means:
   - Tasks were created but became unnecessary (should be deleted)
   - Work evolved and tasks became obsolete (should be updated)
   - Tasks were poorly scoped initially (should be refined)

3. **The real problem isn't task completion strictness**: The --force bypasses happened because:
   - Bugs were forced to write product requirements.md (ACTUAL PROBLEM - fixed by bug_investigation phase)
   - Tasks were forced through product_refinement (ACTUAL PROBLEM - fixed by skipping that phase)
   - NOT because 100% task completion was too strict

4. **Optional tasks.md adds two validation paths**: Spec showed TaskTechSpecValidator and TaskImplementationValidator with special "if tasks.md exists" logic. This is more code to maintain for unclear benefit.

5. **Inline tasks in spec.md is already allowed**: Nothing prevents putting implementation steps in spec.md. The tasks.md file is for tracking, not planning. If someone wants inline steps, they can use spec.md.

**Recommendation:**

SIMPLIFY to uniform task validation:
- ALL types require tasks.md with at least one task checkbox
- ALL types require 100% completion to advance from implementation to review
- Use --force if tasks become obsolete (that's what it's for)

**Changes to Spec:**
- Remove TaskTechSpecValidator (use standard TechSpecValidator)
- Remove TaskImplementationValidator (use standard ImplementationValidator)
- Remove 75% threshold logic entirely
- Update requirements.md to reflect uniform task validation

### Question 2: PHASE_ORDER Array

**Current Code:**
```typescript
export const PHASE_ORDER: Phase[] = [
  'created',
  'product_refinement',
  'tech_spec',
  'implementation',
  'review',
  'testing',
  'complete',
];

export function getNextPhase(currentPhase: Phase): Phase | null {
  const currentIndex = phaseIndex(currentPhase);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[currentIndex + 1];
}
```

**Current Spec Proposal:**
"Keep PHASE_ORDER for backward compatibility" but add bug_investigation to the array.

**The Problem:**
With type-specific workflows:
- Feature: 7 phases (no bug_investigation)
- Bug: 8 phases (includes bug_investigation)
- Task: 6 phases (skips product_refinement)

If PHASE_ORDER is a single array, `getNextPhase()` will return wrong results. For example:
- Bug in 'created' phase: getNextPhase() would return 'product_refinement' (WRONG - should be 'bug_investigation')
- Task in 'created' phase: getNextPhase() would return 'product_refinement' (WRONG - should be 'tech_spec')

**Proposed Answer:**

Option B with refinement: Use VALID_TRANSITIONS for all phase flow logic, deprecate PHASE_ORDER helpers.

**Detailed Solution:**

1. **Keep PHASE_ORDER as "all possible phases"** for reference only (used by legacy features via backward compatibility mechanism)

2. **Deprecate `getNextPhase(phase)` and `phaseIndex(phase)`** - these are not type-aware and will give wrong results

3. **Use VALID_TRANSITIONS for all phase flow logic**:
   ```typescript
   // OLD (wrong for type-specific workflows):
   const next = getNextPhase(feature.phase);

   // NEW (correct):
   const validTransitions = VALID_TRANSITIONS[feature.type][feature.phase];
   const next = validTransitions[0]; // or present choices if multiple
   ```

4. **Add type-aware helper** if needed:
   ```typescript
   export function getPhaseFlow(type: FeatureType): Phase[] {
     // Returns the complete phase sequence for this type
     switch (type) {
       case 'feature':
         return ['created', 'product_refinement', 'tech_spec', 'implementation', 'review', 'testing', 'complete'];
       case 'bug':
         return ['created', 'bug_investigation', 'product_refinement', 'tech_spec', 'implementation', 'review', 'testing', 'complete'];
       case 'task':
         return ['created', 'tech_spec', 'implementation', 'review', 'testing', 'complete'];
     }
   }

   export function getNextPhaseForFeature(feature: Feature): Phase | null {
     const validTransitions = VALID_TRANSITIONS[feature.type][feature.phase];
     if (validTransitions.length === 0) return null;
     if (validTransitions.length === 1) return validTransitions[0];
     // Multiple transitions (e.g., review can go to testing or back to implementation)
     // Caller must decide based on context (review pass/fail)
     return null; // Caller should check VALID_TRANSITIONS directly for multi-option
   }
   ```

5. **Update all call sites**:
   - phase-detection.ts: Update `getNextPhase()` to be type-aware or deprecate
   - show.ts: Use `getPhaseFlow(feature.type)` for display
   - advance.ts: Use `VALID_TRANSITIONS[feature.type][feature.phase]` for validation
   - resume.ts: Use type-aware helpers

**Rationale:**

- CLEAN: Single source of truth is VALID_TRANSITIONS
- SIMPLE: No need to maintain parallel PHASE_ORDER arrays per type
- CORRECT: Type-aware from the start, no wrong phase suggestions
- BACKWARD COMPATIBLE: Legacy features use LEGACY_TRANSITIONS which is phase-based, not type-based

**Changes to Spec:**
- Update PHASE_ORDER to include bug_investigation (all possible phases)
- Mark PHASE_ORDER as "reference only, used by legacy workflow"
- Add getPhaseFlow(type) helper for displaying type-specific workflows
- Add getNextPhaseForFeature(feature) as type-aware replacement for getNextPhase()
- Update all code examples to use VALID_TRANSITIONS directly
- Document deprecation of phaseIndex() and getNextPhase()

## Updated Type-Specific Workflows

### Feature Workflow (7 phases - unchanged)
```
created → product_refinement → tech_spec → implementation → review → testing → complete
```

**Validation:**
- product_refinement: requires requirements.md
- tech_spec: requires spec.md + tasks.md
- implementation: requires 100% task completion
- testing: standard comprehensive testing

### Bug Workflow (8 phases - adds investigation)
```
created → bug_investigation → product_refinement → tech_spec → implementation → review → testing → complete
```

**Validation:**
- bug_investigation: requires investigation.md with root cause
- product_refinement: requires requirements.md (fix scope/impact validation)
- tech_spec: requires spec.md + tasks.md
- implementation: requires 100% task completion
- testing: requires regression test documentation

### Task Workflow (6 phases - streamlined)
```
created → tech_spec → implementation → review → testing → complete
```

**Validation:**
- tech_spec: requires spec.md + tasks.md
- implementation: requires 100% task completion
- testing: lighter validation (simpler testing)

## Updated Validation Rules

### Phase: tech_spec
| Type | Validation |
|------|------------|
| Feature | Require spec.md + tasks.md |
| Bug | Require spec.md + tasks.md |
| Task | Require spec.md + tasks.md |

**SIMPLIFIED**: All types have same validation.

### Phase: implementation
| Type | Validation |
|------|------------|
| Feature | 100% task completion required |
| Bug | 100% task completion required |
| Task | 100% task completion required |

**SIMPLIFIED**: All types have same validation.

## Updated Technical Approach

### What Changes from Original Spec

**REMOVED:**
- TaskTechSpecValidator class
- TaskImplementationValidator class
- 75% threshold logic
- Optional tasks.md behavior
- `getNextPhase(phase)` function (deprecated)
- `phaseIndex(phase)` function (deprecated)

**ADDED:**
- `getPhaseFlow(type)` - returns phase sequence for a type
- `getNextPhaseForFeature(feature)` - type-aware next phase helper

**KEPT:**
- BugInvestigationValidator
- BugTestingValidator (regression test focus)
- TaskTestingValidator (lighter validation)
- Type-specific VALID_TRANSITIONS structure
- Backward compatibility mechanism

### Simplified Implementation

**Validation layer becomes much simpler:**

```typescript
// ONE set of validators for all types:
export class TechSpecValidator implements PhaseValidator {
  targetPhase: Phase = 'implementation';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    if (!existsWithContent(join(featureDir, 'spec.md'))) {
      issues.push({ level: 'error', message: 'spec.md is missing or empty' });
    }

    if (!existsWithContent(join(featureDir, 'tasks.md'))) {
      issues.push({ level: 'error', message: 'tasks.md is missing or empty' });
    }

    return createResult(issues);
  }
}

export class ImplementationValidator implements PhaseValidator {
  targetPhase: Phase = 'review';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const progress = getTaskProgress(join(featureDir, 'tasks.md'));

    if (progress.total === 0) {
      issues.push({ level: 'error', message: 'No tasks found in tasks.md' });
    } else if (!progress.isComplete) {
      issues.push({
        level: 'error',
        message: `Not all tasks complete: ${progress.completed}/${progress.total} done`,
      });
    }

    return createResult(issues);
  }
}
```

**Only 3 type-specific validators needed:**
1. BugInvestigationValidator (bugs only)
2. BugTestingValidator (regression test requirement)
3. TaskTestingValidator (lighter validation)

## Success Metrics

### Primary Metric
Reduction in --force bypass usage from baseline of 52% for task completion.

**Note**: The reduction should come from:
- Bugs skipping product_refinement (8 instances eliminated)
- Tasks skipping product_refinement (unknown instances eliminated)
- NOT from lowering task completion standards

### Secondary Metrics
1. Zero validation errors for type-specific phase transitions
2. Investigator agent successfully creates investigation.md for 100% of bugs
3. Bugs no longer bypass requirements.md in investigation phase
4. Tasks advance through streamlined workflow without product_refinement bypass
5. Existing features continue to work without modification

## Out of Scope

### Explicitly NOT Changing
1. Task completion threshold - stays at 100% for all types
2. tasks.md requirement - stays required for all types
3. Optional task tracking - if you want inline tasks, use spec.md for notes and tasks.md for tracking

## Acceptance Criteria

### Core Functionality
- [ ] PhaseSchema includes 'bug_investigation' enum value
- [ ] PHASE_ORDER includes all possible phases (reference only)
- [ ] VALID_TRANSITIONS is Record<FeatureType, Record<Phase, Phase[]>>
- [ ] Tasks skip product_refinement phase entirely
- [ ] Bugs use bug_investigation phase before product_refinement
- [ ] Phase validators apply type-specific rules ONLY where needed

### Simplified Validation
- [ ] ALL types require tasks.md (no optional behavior)
- [ ] ALL types require 100% task completion (no 75% threshold)
- [ ] TaskTechSpecValidator is NOT created (use standard TechSpecValidator)
- [ ] TaskImplementationValidator is NOT created (use standard ImplementationValidator)

### Type-Aware Helpers
- [ ] getPhaseFlow(type) returns correct phase sequence per type
- [ ] getNextPhaseForFeature(feature) returns type-aware next phase
- [ ] getNextPhase() is marked deprecated or made type-aware
- [ ] phaseIndex() is marked deprecated or removed
- [ ] All call sites updated to use type-aware helpers

### Testing-Specific Validators
- [ ] BugTestingValidator checks for regression test documentation
- [ ] TaskTestingValidator has lighter validation requirements
- [ ] FeatureTestingValidator maintains comprehensive validation

### CLI and Display
- [ ] CLI commands respect type-specific transitions
- [ ] Error messages include feature type and type-specific guidance
- [ ] nextai show displays type-specific workflow using getPhaseFlow()
- [ ] Existing features continue to work (backward compatible)

### Documentation
- [ ] Documentation updated to reflect simplified approach
- [ ] Note that ALL types require 100% task completion
- [ ] Document deprecation of phaseIndex() and getNextPhase()

## Visual Assets

None required (CLI-only feature).

## Reusability Notes

### Existing Components to Reuse
1. Investigator agent (resources/agents/investigator.md)
2. root-cause-tracing skill
3. systematic-debugging skill
4. Product Owner agent (extend for bug fix validation)
5. Existing TechSpecValidator
6. Existing ImplementationValidator

### New Reusable Patterns
1. Type-specific validation factory pattern (SIMPLIFIED - fewer type-specific validators)
2. Type-aware error message formatter
3. Workflow routing based on type
4. getPhaseFlow(type) helper for displaying workflows
5. Backward compatibility mechanism

## Open Questions for Technical Architect

### Question 1: Task Validation - ANSWERED
**Decision**: Keep uniform 100% task completion requirement for all types. Do not create TaskTechSpecValidator or TaskImplementationValidator.

### Question 2: PHASE_ORDER Array - ANSWERED
**Decision**: Keep PHASE_ORDER as reference only (all possible phases). Use VALID_TRANSITIONS for all phase flow logic. Add type-aware helpers getPhaseFlow() and getNextPhaseForFeature().

### Question 3: Deprecation Strategy
Should we:
- A) Mark getNextPhase() and phaseIndex() as deprecated with warnings
- B) Update them to be type-aware (breaking change - now require feature parameter)
- C) Remove them entirely and update all call sites

**Recommendation**: Option A - deprecate with warnings, update call sites to use new helpers, remove in future version.

## Notes

This simplified approach reduces implementation complexity while maintaining the core goal: eliminate --force bypasses by providing appropriate workflows per type.

The key insight is that the 52% --force bypass rate wasn't caused by overly strict task completion rules - it was caused by forcing bugs and tasks through product_refinement. By addressing the actual root cause (wrong phases for wrong types), we don't need to complicate task validation.

Keep it simple: tasks are there to implement all. If a task becomes unnecessary, delete it. That's what --force is for - exceptional cases, not routine workflow.
