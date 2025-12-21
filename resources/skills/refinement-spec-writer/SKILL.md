# Refinement Spec Writer

Use when creating specifications — provides templates and patterns for writing technical specs and task lists.

## Purpose
Transform product requirements into actionable technical specifications and implementation tasks.

## Input
- `planning/requirements.md` - Product Q&A and confirmed requirements
- Project documentation in `nextai/docs/` (if available)

## Process

### Phase 1: Read Context
1. Read the requirements document thoroughly
2. Review project architecture docs if available
3. Identify technical constraints and patterns

### Phase 2: Write spec.md
Create a comprehensive technical specification with:

```markdown
# [Feature Title]

## Overview
Brief description of what this feature does and why.

## Requirements Summary
Key requirements from the product research phase.

## Technical Approach
How this will be implemented technically.

## Architecture
- Components involved
- Data flow
- Integration points

## Implementation Details
Detailed technical implementation notes.

## API/Interface Changes
Any new or modified APIs, endpoints, or interfaces.

## Data Model
Database or data structure changes.

## Security Considerations
Authentication, authorization, data protection.

## Error Handling
How errors and edge cases are handled.

## Alternatives Considered
What other approaches were considered and why this one was chosen.
```

### Phase 3: Write tasks.md
Create a step-by-step implementation checklist containing ONLY implementation-phase work:

```markdown
# Implementation Tasks

## Pre-implementation
- [ ] Review existing related code
- [ ] Set up any required dependencies

## Core Implementation
- [ ] Task 1: Description
- [ ] Task 2: Description
- [ ] ...additional tasks based on spec

## Unit Tests (if applicable)
Check `nextai/docs/technical-guide.md` to see if this project has unit tests configured. If yes:
- [ ] Write unit tests for new functionality
- [ ] Ensure existing tests pass

> Skip this section if the project does not have a test framework configured.
```

**IMPORTANT:** Do NOT include these sections - they are handled by other phases:
- Manual testing → testing.md (Phase 4)
- Manual verification → testing.md (Phase 4)
- Documentation → document-writer agent during `/nextai-complete`
- Review/feedback → reviewer agent during `/nextai-review`

**CRITICAL:** Do NOT create "Manual Verification", "Manual Testing", or similar sections in tasks.md. All manual testing tasks belong in testing.md (Phase 4).

### Guidelines
- Tasks should be specific and actionable
- Each task should be completable in one focused session
- Group related tasks together
- Include time-critical dependencies

### Phase 4: Write testing.md
Create a testing document with manual test checklist:

```markdown
# Testing

## Manual Test Checklist
<!-- Generated during refinement based on spec.md Testing Strategy -->
- [ ] Test case 1 description
- [ ] Test case 2 description

---

## Test Sessions
<!-- Populated during /testing phase -->
```

**IMPORTANT:**
- Extract test cases from the Testing Strategy section of spec.md
- Make test items specific and actionable
- This is where manual verification belongs, NOT in tasks.md

## Confidence-Based Validation
Before completing:
1. Review spec against requirements
2. Ensure all requirements are addressed
3. Verify tasks cover the full spec
4. Verify testing.md has relevant test cases
5. If gaps found, note them and ask for clarification

## Output
- `spec.md` in feature folder
- `tasks.md` in feature folder
- `testing.md` in feature folder
