# Refinement Spec Writer

Technical specification and task authoring skill.

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

## Automated Tests ()
- [ ] Write unit tests for new functionality
- [ ] Ensure existing tests pass
```

**IMPORTANT:** Do NOT include these sections - they are handled by other phases:
- Manual testing → `/nextai-testing` phase (human task)
- Documentation → document-writer agent during `/nextai-complete`
- Review/feedback → reviewer agent during `/nextai-review`
- Automated Tests -> read the nextai/docs/technical-guide.md to review if the project has unit tests.

### Guidelines
- Tasks should be specific and actionable
- Each task should be completable in one focused session
- Group related tasks together
- Include time-critical dependencies

## Confidence-Based Validation
Before completing:
1. Review spec against requirements
2. Ensure all requirements are addressed
3. Verify tasks cover the full spec
4. If gaps found, note them and ask for clarification

## Output
- `spec.md` in feature folder
- `tasks.md` in feature folder
