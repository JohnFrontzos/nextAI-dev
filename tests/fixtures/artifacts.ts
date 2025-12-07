// Artifact content fixtures for testing

export const validInitializationMd = `# Feature: Test Feature

## Description
This is a test feature description.

## Context
Additional context here.

## Acceptance Criteria
- [ ] First criterion
- [ ] Second criterion
`;

export const emptyInitializationMd = '';

export const whitespaceOnlyMd = '   \n\n   \t\t\n   ';

export const noHeadingInitMd = `This is content without a heading.
Some more content here.
`;

export const validRequirementsMd = `# Requirements

## User Stories
- As a user, I want to...

## Functional Requirements
1. Feature must...
2. System shall...

## Non-Functional Requirements
- Performance: ...
- Security: ...
`;

export const validSpecMd = `# Technical Specification

## Overview
Technical overview of the feature.

## Architecture
System architecture details.

## Implementation Details
Details here.

## API Design
API endpoints and contracts.
`;

export const validTasksMd = `# Implementation Tasks

- [ ] Task 1: Setup
- [ ] Task 2: Implementation
- [x] Task 3: Done
`;

export const allTasksCompleteMd = `# Implementation Tasks

- [x] Task 1: Setup
- [x] Task 2: Implementation
- [x] Task 3: Complete
`;

export const mixedTasksMd = `# Implementation Tasks

- [x] Task 1: Done
- [ ] Task 2: In progress
- [X] Task 3: Also done (uppercase X)
* [ ] Task 4: Using asterisk
* [x] Task 5: Asterisk done
`;

export const noTasksMd = `# Implementation Tasks

No tasks defined yet.
`;

export const tasksWithoutCheckboxes = `# Implementation Tasks

1. Task 1
2. Task 2
3. Task 3
`;

export const passingReviewMd = `# Code Review

## Summary
Review completed.

## Findings
No major issues found.

## Verdict
PASS

All code meets standards.
`;

export const failingReviewMd = `# Code Review

## Summary
Issues found.

## Findings
- Issue 1: Missing error handling
- Issue 2: No tests

## Verdict
FAIL

Please address the issues above.
`;

export const lowercasePassReviewMd = `# Code Review

## Summary
All good.

## Verdict
pass

Everything looks fine.
`;

export const reviewNoVerdictMd = `# Code Review

## Summary
Review in progress.

## Findings
Still reviewing...
`;

export const reviewVerdictBeforeHeaderMd = `FAIL

## Verdict
PASS

This should find PASS, not the FAIL above.
`;

export const passingTestingMd = `# Testing Log

## Test Run 1
**Date:** 2025-12-06
**Status:** pass
**Notes:** All tests passed.
`;

export const failingTestingMd = `# Testing Log

## Test Run 1
**Date:** 2025-12-06
**Status:** fail
**Notes:** 3 tests failed.
`;

export const testingWithStatusPrefix = `# Testing Log

## Test Run 1
Date: 2025-12-06
status: pass
Notes: Alternative format.
`;

export const testingNoStatus = `# Testing Log

## Test Run 1
Date: 2025-12-06
Notes: No status recorded.
`;

export const validSummaryMd = `# Feature Summary

## Overview
This feature was completed successfully.

## Completed Tasks
- All tasks done

## Notes
Additional completion notes.
`;

// Pre-built artifact sets for common scenarios
export const createdPhaseArtifacts = {
  'planning/initialization.md': validInitializationMd
};

export const productRefinementArtifacts = {
  'planning/initialization.md': validInitializationMd,
  'planning/requirements.md': validRequirementsMd
};

export const techSpecArtifacts = {
  'planning/initialization.md': validInitializationMd,
  'planning/requirements.md': validRequirementsMd,
  'spec.md': validSpecMd,
  'tasks.md': validTasksMd
};

export const implementationCompleteArtifacts = {
  'planning/initialization.md': validInitializationMd,
  'planning/requirements.md': validRequirementsMd,
  'spec.md': validSpecMd,
  'tasks.md': allTasksCompleteMd
};

export const reviewPassArtifacts = {
  ...implementationCompleteArtifacts,
  'review.md': passingReviewMd
};

export const reviewFailArtifacts = {
  ...implementationCompleteArtifacts,
  'review.md': failingReviewMd
};

export const testingPassArtifacts = {
  ...reviewPassArtifacts,
  'testing.md': passingTestingMd
};

export const completeArtifacts = {
  ...testingPassArtifacts,
  'summary.md': validSummaryMd
};
