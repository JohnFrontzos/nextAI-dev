# Implementation Tasks

## Pre-implementation

- [x] Review existing phase validator architecture in src/core/validation/phase-validators.ts
- [x] Review existing ledger state management in src/core/state/ledger.ts
- [x] Review show command implementation in src/cli/commands/show.ts
- [x] Understand current VALID_TRANSITIONS structure and phase detection logic

## Core Implementation

### Schema Layer (src/schemas/ledger.ts)

- [x] Add 'bug_investigation' to PhaseSchema enum
- [x] Add LEGACY_WORKFLOW_CUTOFF_DATE constant (set to '2025-12-21T00:00:00.000Z')
- [x] Replace VALID_TRANSITIONS with type-specific Record<FeatureType, Record<Phase, Phase[]>> structure
- [x] Add feature type workflows for 'feature', 'bug', and 'task' types
- [x] Update PHASE_ORDER to include 'bug_investigation' (all possible phases)
- [x] Add isLegacyWorkflow(feature: Feature): boolean helper
- [x] Add getValidTransitionsForFeature(feature: Feature): Phase[] helper with legacy support
- [x] Add getPhaseFlow(type: FeatureType): Phase[] helper
- [x] Add getNextPhaseForFeature(feature: Feature): Phase | null helper

### Validation Layer - Type-Specific Validators

**Modify src/core/validation/phase-validators.ts:**
- [x] Add BugInvestigationValidator class (validates investigation.md exists and has root cause)
- [x] Update getValidatorForPhase signature to accept (phase, type, isLegacy) parameters
- [x] Implement legacy workflow validator routing in getValidatorForPhase
- [x] Implement type-specific validator routing in getValidatorForPhase
- [x] Route to BugInvestigationValidator for bug type in bug_investigation phase
- [x] Route to standard TechSpecValidator for ALL types in tech_spec phase
- [x] Route to standard ImplementationValidator for ALL types in implementation phase
- [x] Return null for invalid phase/type combinations (tasks skip product_refinement)
- [x] Import and route to BugTestingValidator and TaskTestingValidator

**Create src/core/validation/type-specific-validators.ts:**
- [x] Create new file with PhaseValidator interface import
- [x] Implement BugTestingValidator class (regression test validation)
- [x] Implement TaskTestingValidator class (lighter validation, no regression requirement)
- [x] Export both validator classes

### Ledger State Management (src/core/state/ledger.ts)

- [x] Import isLegacyWorkflow and getValidTransitionsForFeature helpers
- [x] Import updated getValidatorForPhase with new signature
- [x] Update validateFeatureForPhase to check isLegacyWorkflow(feature)
- [x] Update validateFeatureForPhase to use getValidTransitionsForFeature instead of VALID_TRANSITIONS lookup
- [x] Update validateFeatureForPhase to pass feature.type and isLegacy to getValidatorForPhase
- [x] Update transition validation error messages to include feature type context
- [x] Update error messages to show valid transitions for the feature type

### CLI Layer - Show Command (src/cli/commands/show.ts)

- [x] Import getPhaseFlow and isLegacyWorkflow helpers
- [x] Update show command to call getPhaseFlow(feature.type) for workflow display
- [x] Update workflow visualization to highlight current phase in type-specific flow
- [x] Add legacy workflow indicator if isLegacyWorkflow(feature) is true

### Template Updates (resources/templates/commands/refine.md)

- [x] Add type detection logic section (parse type from nextai show --json)
- [x] Add bug workflow routing (created → investigator agent → architect, skip product owner)
- [x] Add task workflow routing (created → architect directly, skip product owner)
- [x] Keep feature workflow routing (created → product owner → architect, unchanged)
- [x] Update Phase 1 delegation to be type-conditional
- [x] Add investigator agent delegation block for bugs in created phase
- [x] Update error messages to include type-specific guidance

## Unit Tests

### Schema Layer Tests (tests/unit/schemas/ledger.test.ts)

- [x] Test isLegacyWorkflow returns true for features created before cutoff date
- [x] Test isLegacyWorkflow returns false for features created after cutoff date
- [x] Test getValidTransitionsForFeature returns legacy transitions for legacy features
- [x] Test getValidTransitionsForFeature returns type-specific transitions for new features
- [x] Test VALID_TRANSITIONS structure has correct transitions for feature type
- [x] Test VALID_TRANSITIONS structure has correct transitions for bug type (includes bug_investigation)
- [x] Test VALID_TRANSITIONS structure has correct transitions for task type (skips product_refinement)
- [x] Test getPhaseFlow returns correct 7-phase sequence for feature type
- [x] Test getPhaseFlow returns correct 8-phase sequence for bug type (includes bug_investigation)
- [x] Test getPhaseFlow returns correct 6-phase sequence for task type (skips product_refinement)
- [x] Test getNextPhaseForFeature returns correct next phase for feature types
- [x] Test getNextPhaseForFeature returns correct next phase for bug types
- [x] Test getNextPhaseForFeature returns correct next phase for task types
- [x] Test getNextPhaseForFeature returns null for phases with multiple transitions

### Validation Tests (tests/unit/core/validation/)

**phase-validators.test.ts:**
- [x] Test BugInvestigationValidator rejects missing investigation.md
- [x] Test BugInvestigationValidator passes with valid investigation.md
- [x] Test BugInvestigationValidator warns if no root cause section found
- [x] Test TechSpecValidator requires tasks.md for ALL types (no optional behavior)
- [x] Test ImplementationValidator requires 100% completion for ALL types (no 75% threshold)
- [x] Test getValidatorForPhase returns BugInvestigationValidator for bug/bug_investigation
- [x] Test getValidatorForPhase returns null for task/product_refinement (tasks skip it)
- [x] Test getValidatorForPhase returns standard TechSpecValidator for all types/tech_spec
- [x] Test getValidatorForPhase returns standard ImplementationValidator for all types/implementation
- [x] Test getValidatorForPhase returns legacy validators when isLegacy is true

**type-specific-validators.test.ts (included in phase-validators.test.ts):**
- [x] Test BugTestingValidator requires testing.md with pass status
- [x] Test BugTestingValidator warns if no regression test mention found
- [x] Test BugTestingValidator passes with testing.md containing regression and pass status
- [x] Test TaskTestingValidator requires testing.md with pass status
- [x] Test TaskTestingValidator does not require regression test mention
- [x] Test TaskTestingValidator passes with testing.md containing pass status only

### Ledger State Tests (existing tests cover type-aware behavior)

- [x] Test validateFeatureForPhase uses legacy transitions for legacy features
- [x] Test validateFeatureForPhase uses type-specific transitions for new features
- [x] Test validateFeatureForPhase rejects invalid phase transition for bug type
- [x] Test validateFeatureForPhase rejects invalid phase transition for task type
- [x] Test validateFeatureForPhase allows valid phase transitions for all types
- [x] Test validateFeatureForPhase error message includes feature type
- [x] Test validateFeatureForPhase error message suggests valid transitions for type
- [x] Test task cannot transition from created to product_refinement
- [x] Test bug can transition from created to bug_investigation
- [x] Test bug cannot transition from created to product_refinement (must go through investigation)

## Testing Feedback Changes

### Remove Legacy Workflow Support
- [x] Remove LEGACY_WORKFLOW_CUTOFF_DATE constant from src/schemas/ledger.ts
- [x] Remove isLegacyWorkflow() function from src/schemas/ledger.ts
- [x] Simplify getValidTransitionsForFeature() to always use type-specific transitions
- [x] Update getValidatorForPhase() to remove isLegacy parameter
- [x] Update validateFeatureForPhase() to remove legacy workflow logic
- [x] Remove legacy workflow indicator from show command
- [x] Update all tests that referenced isLegacy or LEGACY_WORKFLOW_CUTOFF_DATE

### Add Integration Tests
- [x] Add test: bug cannot transition from created to product_refinement
- [x] Add test: bug can transition from created to bug_investigation
- [x] Add test: task can transition from created to tech_spec
- [x] Add test: task cannot transition from created to product_refinement
- [x] Add test: feature must go through product_refinement

### Add Metrics Tracking
- [ ] Add bypass tracking per feature type when --force is used
- [ ] Log bypass events with type context
