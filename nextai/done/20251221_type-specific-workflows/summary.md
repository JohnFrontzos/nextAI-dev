# Type-Specific Workflows - Summary

## Overview

This feature implements differentiated phase workflows and validation rules for the three feature types (feature, bug, task) in the NextAI framework. The implementation eliminates unnecessary friction in the development lifecycle by providing type-appropriate workflows, reducing the need for validation bypasses from 52% baseline.

The key principle: keep it simple. The goal was to fix the actual problem (wrong phases for wrong types), not to complicate task validation.

## Key Changes

### 1. Type-Specific Phase Flows

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

### 2. New Bug Investigation Phase

- Added `bug_investigation` phase to the PhaseSchema enum
- Bugs now document root cause analysis in `planning/investigation.md` before proceeding to requirements
- Leverages existing investigator agent and debugging skills
- BugInvestigationValidator ensures investigation.md exists with root cause analysis

### 3. Simplified Validation Rules

**Core Principle:** ALL types require 100% task completion and tasks.md. No special cases.

The simplified approach uses standard validators for most phases:
- **tech_spec phase:** ALL types use standard TechSpecValidator (requires spec.md + tasks.md)
- **implementation phase:** ALL types use standard ImplementationValidator (requires 100% task completion)

Only 3 type-specific validators needed:
1. **BugInvestigationValidator** - Validates investigation.md for bugs
2. **BugTestingValidator** - Requires regression test documentation for bugs
3. **TaskTestingValidator** - Lighter testing validation for tasks

### 4. Type-Aware Workflow Management

New helper functions in `src/schemas/ledger.ts`:
- `getPhaseFlow(type)` - Returns phase sequence for a feature type
- `getNextPhaseForFeature(feature)` - Returns next phase based on feature type
- `getValidTransitionsForFeature(feature)` - Returns valid transitions for a feature

### 5. No Legacy Workflow Support

The implementation applies type-specific workflows immediately to ALL features. No legacy mode or cutoff dates. This simplifies the codebase and ensures consistent behavior.

### 6. Metrics Tracking

Added `feature_type` field to ValidationBypassEventSchema to track bypass rates per type:
- Enables monitoring of which types use `--force` most frequently
- Supports data-driven workflow improvements
- Baseline: 52% of bypasses were for task completion validation

## Files Modified

### Core Schema Changes
- `src/schemas/ledger.ts` - Added bug_investigation phase, type-specific VALID_TRANSITIONS, type-aware helpers
- `src/schemas/history.ts` - Added feature_type to ValidationBypassEventSchema

### Validation Layer
- `src/core/validation/phase-validators.ts` - Added BugInvestigationValidator, updated getValidatorForPhase for type-awareness
- `src/core/validation/type-specific-validators.ts` - NEW file with BugTestingValidator and TaskTestingValidator

### State Management
- `src/core/state/ledger.ts` - Updated validateFeatureForPhase for type-aware validation
- `src/core/state/history.ts` - Added logValidationBypass with featureType parameter, added getBypassCountsByType

### CLI Layer
- `src/cli/commands/show.ts` - Updated to display type-specific workflow visualization
- `src/cli/commands/advance.ts` - Uses type-aware validation

### Templates
- `resources/templates/commands/refine.md` - Added type-specific routing (bug → investigator, task → architect, feature → product owner)

## Testing

### Test Coverage
- 588 tests total (all passing)
- Unit tests for type-specific phase flows and helpers
- Unit tests for all 3 type-specific validators
- Integration tests for type-specific transitions
- Metrics tracking tests

### Test Sessions

**Session 1 - 12/22/2025, 11:03 AM**
- Status: FAIL
- Notes: Initial implementation had legacy workflow support (LEGACY_WORKFLOW_CUTOFF_DATE). Feedback requested removal of legacy mode and addition of integration tests and metrics tracking.

**Session 2 - 12/22/2025, 11:18 AM**
- Status: PASS
- Notes: All testing feedback addressed. Legacy workflow removed, integration tests added (5 new tests in advance.test.ts), metrics tracking per type added. Build passes, all 588 tests pass.

### Integration Tests Added

Five comprehensive integration tests in `tests/integration/cli/advance.test.ts`:
1. Bug cannot transition from created to product_refinement
2. Bug can transition from created to bug_investigation
3. Task can transition from created to tech_spec
4. Task cannot transition from created to product_refinement
5. Feature must go through product_refinement

All tests verify error messages include feature type context and suggest valid transitions.

## Impact

### For Users

**Bugs:**
- No longer required to write product requirements.md when fixing bugs
- Investigation phase provides focused root cause documentation
- Regression testing validation ensures bugs don't reoccur

**Tasks:**
- Skip product_refinement entirely, reducing overhead for implementation-only work
- Streamlined workflow from created → tech_spec → implementation
- Lighter testing validation appropriate for task scope

**Features:**
- No changes to existing full workflow
- Continue to benefit from comprehensive requirements and testing validation

### For Developers

**Simplified Codebase:**
- No legacy workflow support reduces complexity
- Uniform task validation (100% completion for all types)
- Only 3 type-specific validators (down from potential 5+)

**Better Error Messages:**
- Error messages now include feature type context
- Suggestions show valid transitions for the specific type
- Type-appropriate hints guide users to correct commands

**Metrics Visibility:**
- Track validation bypass rates per feature type
- Data-driven insights for future workflow improvements
- Identify which types need workflow refinement

## Metrics

- Tasks completed: 145/145 (100%)
- Test sessions: 2 (final: PASS)
- Review rounds: 1 (PASS with recommendations)
- All 588 tests passing
- Clean build with no errors

## Design Decisions

### Why No Legacy Workflow?

The team decided to apply type-specific workflows immediately to all features rather than maintaining backward compatibility with a legacy mode. This decision:
- Simplifies the codebase significantly
- Ensures consistent behavior across all features
- Allows immediate benefit from type-specific workflows
- Any issues with existing features can be resolved with repair command or phase reset

### Why Uniform Task Completion?

The original spec proposed 75% task completion threshold for tasks. After analysis, the team determined:
- The 52% --force bypass rate wasn't caused by strict task completion
- The real problem was forcing bugs and tasks through product_refinement
- Tasks are implementation checklists - if unnecessary, delete them
- Uniform validation (100% for all types) is simpler and more consistent

### Why Only 3 Type-Specific Validators?

By keeping task validation uniform across all types, only 3 type-specific validators are needed:
1. BugInvestigationValidator (bugs only need investigation.md)
2. BugTestingValidator (bugs need regression test documentation)
3. TaskTestingValidator (tasks have lighter testing requirements)

All other phases use standard validators, reducing code complexity and maintenance burden.

## Related Documentation

- Specification: `nextai/done/20251221_type-specific-workflows/spec.md`
- Implementation Tasks: `nextai/done/20251221_type-specific-workflows/tasks.md`
- Code Review: `nextai/done/20251221_type-specific-workflows/review.md`
- Testing Report: `nextai/done/20251221_type-specific-workflows/testing.md`
- Requirements Analysis: `nextai/done/20251221_type-specific-workflows/planning/requirements.md`

## Future Considerations

### Monitoring

Track validation bypass rates per feature type to identify:
- Which types still experience friction
- Whether the new workflows achieve the goal of reducing --force usage
- Opportunities for further workflow refinement

### Potential Enhancements

Based on usage data, consider:
- Additional type-specific validators if patterns emerge
- Workflow adjustments based on bypass metrics
- Enhanced error messages with type-specific examples

### Migration Path

For any existing features experiencing issues with type-specific workflows:
1. Use `nextai repair` to diagnose state issues
2. Reset to created phase if needed to restart with correct workflow
3. Update feature artifacts to match type-appropriate requirements
