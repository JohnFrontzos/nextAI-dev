# Implementation Tasks

## Pre-implementation

- [x] Review current analyze.md template to understand full context
- [x] Verify investigation findings match current template state
- [x] Check if any related templates share similar path ambiguity issues

## Core Implementation

- [x] Update Context section (line 30-33) to add explicit path distinction
- [x] Update Instructions section (line 43-46) to reinforce output location with explicit warning
- [x] Update Completion section (line 50-56) to include validation guidance
- [x] Verify template formatting and markdown syntax are correct
- [x] Review changes to ensure clarity and consistency with NextAI instruction style

## Unit Tests

This project has a test framework configured (Vitest).

- [x] Run existing test suite to ensure no regressions: `npm test`
- [x] Verify all existing tests pass

Note: No new unit tests required for this fix, as it modifies template content (prose/instructions) rather than code logic. Testing would require LLM-in-the-loop integration testing.

## Manual Verification

- [x] Test on fresh project: Initialize new NextAI project and run `/nextai-analyze`
- [x] Verify docs appear in `nextai/docs/` (not `.nextai/`)
- [x] Test on existing project: Run `/nextai-analyze` and verify docs update correctly
- [x] Verify session.json reading still works (check for timestamp in documentation)
- [x] Check that completion message displays correctly
