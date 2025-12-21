# Implementation Tasks

## Pre-implementation

- [ ] Review existing phase validator architecture in src/core/validation/phase-validators.ts
- [ ] Review existing ledger state management in src/core/state/ledger.ts
- [ ] Review show command implementation in src/cli/commands/show.ts
- [ ] Understand current VALID_TRANSITIONS structure and phase detection logic

## Core Implementation

### Schema Layer (src/schemas/ledger.ts)

- [ ] Add 'bug_investigation' to PhaseSchema enum
- [ ] Add LEGACY_WORKFLOW_CUTOFF_DATE constant (set to '2025-12-21T00:00:00.000Z')
- [ ] Replace VALID_TRANSITIONS with type-specific Record<FeatureType, Record<Phase, Phase[]>> structure
- [ ] Add feature type workflows for 'feature', 'bug', and 'task' types
- [ ] Update PHASE_ORDER to include 'bug_investigation' (all possible phases)
- [ ] Add isLegacyWorkflow(feature: Feature): boolean helper
- [ ] Add getValidTransitionsForFeature(feature: Feature): Phase[] helper with legacy support
- [ ] Add getPhaseFlow(type: FeatureType): Phase[] helper
- [ ] Add getNextPhaseForFeature(feature: Feature): Phase | null helper

### Validation Layer - Type-Specific Validators

**Modify src/core/validation/phase-validators.ts:**
- [ ] Add BugInvestigationValidator class (validates investigation.md exists and has root cause)
- [ ] Update getValidatorForPhase signature to accept (phase, type, isLegacy) parameters
- [ ] Implement legacy workflow validator routing in getValidatorForPhase
- [ ] Implement type-specific validator routing in getValidatorForPhase
- [ ] Route to BugInvestigationValidator for bug type in bug_investigation phase
- [ ] Route to standard TechSpecValidator for ALL types in tech_spec phase
- [ ] Route to standard ImplementationValidator for ALL types in implementation phase
- [ ] Return null for invalid phase/type combinations (tasks skip product_refinement)
- [ ] Import and route to BugTestingValidator and TaskTestingValidator

**Create src/core/validation/type-specific-validators.ts:**
- [ ] Create new file with PhaseValidator interface import
- [ ] Implement BugTestingValidator class (regression test validation)
- [ ] Implement TaskTestingValidator class (lighter validation, no regression requirement)
- [ ] Export both validator classes

### Ledger State Management (src/core/state/ledger.ts)

- [ ] Import isLegacyWorkflow and getValidTransitionsForFeature helpers
- [ ] Import updated getValidatorForPhase with new signature
- [ ] Update validateFeatureForPhase to check isLegacyWorkflow(feature)
- [ ] Update validateFeatureForPhase to use getValidTransitionsForFeature instead of VALID_TRANSITIONS lookup
- [ ] Update validateFeatureForPhase to pass feature.type and isLegacy to getValidatorForPhase
- [ ] Update transition validation error messages to include feature type context
- [ ] Update error messages to show valid transitions for the feature type

### CLI Layer - Show Command (src/cli/commands/show.ts)

- [ ] Import getPhaseFlow and isLegacyWorkflow helpers
- [ ] Update show command to call getPhaseFlow(feature.type) for workflow display
- [ ] Update workflow visualization to highlight current phase in type-specific flow
- [ ] Add legacy workflow indicator if isLegacyWorkflow(feature) is true

### Template Updates (resources/templates/commands/refine.md)

- [ ] Add type detection logic section (parse type from nextai show --json)
- [ ] Add bug workflow routing (created → investigator agent → architect, skip product owner)
- [ ] Add task workflow routing (created → architect directly, skip product owner)
- [ ] Keep feature workflow routing (created → product owner → architect, unchanged)
- [ ] Update Phase 1 delegation to be type-conditional
- [ ] Add investigator agent delegation block for bugs in created phase
- [ ] Update error messages to include type-specific guidance

## Unit Tests

### Schema Layer Tests (tests/unit/schemas/ledger.test.ts)

- [ ] Test isLegacyWorkflow returns true for features created before cutoff date
- [ ] Test isLegacyWorkflow returns false for features created after cutoff date
- [ ] Test getValidTransitionsForFeature returns legacy transitions for legacy features
- [ ] Test getValidTransitionsForFeature returns type-specific transitions for new features
- [ ] Test VALID_TRANSITIONS structure has correct transitions for feature type
- [ ] Test VALID_TRANSITIONS structure has correct transitions for bug type (includes bug_investigation)
- [ ] Test VALID_TRANSITIONS structure has correct transitions for task type (skips product_refinement)
- [ ] Test getPhaseFlow returns correct 7-phase sequence for feature type
- [ ] Test getPhaseFlow returns correct 8-phase sequence for bug type (includes bug_investigation)
- [ ] Test getPhaseFlow returns correct 6-phase sequence for task type (skips product_refinement)
- [ ] Test getNextPhaseForFeature returns correct next phase for feature types
- [ ] Test getNextPhaseForFeature returns correct next phase for bug types
- [ ] Test getNextPhaseForFeature returns correct next phase for task types
- [ ] Test getNextPhaseForFeature returns null for phases with multiple transitions

### Validation Tests (tests/unit/core/validation/)

**phase-validators.test.ts:**
- [ ] Test BugInvestigationValidator rejects missing investigation.md
- [ ] Test BugInvestigationValidator passes with valid investigation.md
- [ ] Test BugInvestigationValidator warns if no root cause section found
- [ ] Test TechSpecValidator requires tasks.md for ALL types (no optional behavior)
- [ ] Test ImplementationValidator requires 100% completion for ALL types (no 75% threshold)
- [ ] Test getValidatorForPhase returns BugInvestigationValidator for bug/bug_investigation
- [ ] Test getValidatorForPhase returns null for task/product_refinement (tasks skip it)
- [ ] Test getValidatorForPhase returns standard TechSpecValidator for all types/tech_spec
- [ ] Test getValidatorForPhase returns standard ImplementationValidator for all types/implementation
- [ ] Test getValidatorForPhase returns legacy validators when isLegacy is true

**type-specific-validators.test.ts (NEW):**
- [ ] Test BugTestingValidator requires testing.md with pass status
- [ ] Test BugTestingValidator warns if no regression test mention found
- [ ] Test BugTestingValidator passes with testing.md containing regression and pass status
- [ ] Test TaskTestingValidator requires testing.md with pass status
- [ ] Test TaskTestingValidator does not require regression test mention
- [ ] Test TaskTestingValidator passes with testing.md containing pass status only

### Ledger State Tests (tests/unit/core/state/ledger.test.ts)

- [ ] Test validateFeatureForPhase uses legacy transitions for legacy features
- [ ] Test validateFeatureForPhase uses type-specific transitions for new features
- [ ] Test validateFeatureForPhase rejects invalid phase transition for bug type
- [ ] Test validateFeatureForPhase rejects invalid phase transition for task type
- [ ] Test validateFeatureForPhase allows valid phase transitions for all types
- [ ] Test validateFeatureForPhase error message includes feature type
- [ ] Test validateFeatureForPhase error message suggests valid transitions for type
- [ ] Test task cannot transition from created to product_refinement
- [ ] Test bug can transition from created to bug_investigation
- [ ] Test bug cannot transition from created to product_refinement (must go through investigation)
