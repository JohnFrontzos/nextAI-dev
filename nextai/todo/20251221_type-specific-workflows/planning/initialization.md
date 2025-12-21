# Feature: Type-specific workflows

## Original Request

Implement differentiated workflows for features, bugs, and tasks. Currently all types follow the same phase sequence and validation rules, causing friction (52% of --force bypasses in production usage).

## Type
feature

## Problem Statement

Analysis of NextAI usage across real projects (honestli-android, auvious-android) revealed:
- **92 total validation bypasses** across 29 features
- **52% of bypasses** were to skip "Not all tasks complete" validation
- **8 instances** of bypassing missing requirements.md for bug fixes
- All types (feature, bug, task) follow identical phase sequence and validation rules

The framework has foundational type support (schema, CLI, ledger) but **validation and phase transitions are completely type-agnostic**.

## Proposed Changes

### 1. Type-Specific Phase Transitions
**Location:** `src/schemas/ledger.ts`

Current (all types):
```
created → product_refinement → tech_spec → implementation → review → testing → complete
```

Proposed:
- **Feature:** Full workflow (unchanged)
- **Bug:** `created → investigation → tech_spec → implementation → review → testing → complete`
- **Task:** `created → tech_spec → implementation → review → testing → complete` (skip product_refinement)

### 2. Type-Specific Validation Rules
**Location:** `src/core/validation/phase-validators.ts`

| Phase | Feature | Bug | Task |
|-------|---------|-----|------|
| product_refinement | Require requirements.md | N/A (skipped) | N/A (skipped) |
| investigation | N/A | Require investigation.md | N/A |
| tech_spec | Require spec.md + tasks.md | Require spec.md + tasks.md | Require spec.md (tasks.md optional) |
| implementation | 100% task completion | 100% task completion | 75% task completion acceptable |
| testing | Standard testing | Require regression test | Lighter testing |

### 3. Investigation Phase for Bugs
- New phase between `created` and `tech_spec`
- Replaces `product_refinement` for bugs
- Validates existence of `investigation.md`
- Leverages existing investigator agent and debugging skills

### 4. Lighter Validation for Tasks
- Skip product_refinement entirely
- Optional tasks.md (implementation tasks inline in spec)
- Accept 75% task completion to move to review
- Streamlined testing requirements

## Initial Context

### Evidence from Production Usage
- **Source:** research/projects-with-nextai/honestli-android/.nextai/state/history.log
- **Source:** research/projects-with-nextai/auvious-android/.nextai/state/history.log
- **Finding:** All bug fixes bypass requirements.md validation
- **Finding:** Tasks frequently bypass with incomplete task lists

### Existing Type-Aware Code
- `src/schemas/ledger.ts` - FeatureTypeSchema already defines types
- `resources/templates/commands/refine.md` - Has type-specific logic for refinement
- `resources/agents/investigator.md` - Bug-specific agent exists
- `resources/skills/root-cause-tracing/` - Bug-specific skill exists
- `resources/skills/systematic-debugging/` - Bug-specific skill exists

## Acceptance Criteria

- [ ] Tasks can skip product_refinement phase
- [ ] Bugs use investigation phase instead of product_refinement
- [ ] Phase validators apply type-specific rules
- [ ] VALID_TRANSITIONS in ledger.ts supports type-specific paths
- [ ] Tasks accept 75% task completion for advancement
- [ ] Bugs require regression test documentation
- [ ] CLI commands respect type-specific transitions
- [ ] Existing features continue to work (backward compatible)
- [ ] Documentation updated to reflect type differences

## Attachments

None

## Notes

This feature addresses the root cause of --force usage patterns identified in the framework analysis. The current "one-size-fits-all" workflow creates unnecessary friction for bugs and tasks that don't need the full feature workflow.
