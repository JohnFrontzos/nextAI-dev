# Refinement Technical

Use when creating technical specifications — provides deep codebase analysis, technical Q&A patterns, and spec writing templates.

## Purpose
Transform product requirements into actionable technical specifications through deep codebase analysis and confidence-based technical questioning.

## Input
- `planning/requirements.md` - Product Q&A and confirmed requirements
- Project documentation in `nextai/docs/` (if available)

## Process

### Phase 1: Read Context
1. Read the requirements document thoroughly
2. Review project architecture docs if available
3. Identify technical constraints and patterns
4. Note any missing context

### Phase 2: Codebase Exploration
Deep dive into the codebase to understand the impact of the new feature:

1. **Search for similar features**: Find existing implementations that solve similar problems
2. **Identify reusable components**: Look for code that can be extended or reused
3. **Understand architecture patterns**: Map how the project is structured
4. **Map integration points**: Identify which modules/files will be affected
5. **Check for potential conflicts**: Look for code that might conflict with the new feature

Document findings:
- Similar features found and their locations
- Reusable components and patterns
- Architecture constraints discovered
- Integration points identified
- Potential risks or conflicts

### Phase 3: Technical Question Generation
Generate 3-8 numbered technical questions covering:

- **Architecture Impact**: How does this affect existing systems?
- **Dependencies**: What existing code can be reused? What new dependencies are needed?
- **Risk Assessment**: Breaking changes, migration needs, performance concerns
- **Complexity**: Is this simple, moderate, or complex?
- **Integration Points**: Which files/modules will be modified?
- **Data Model**: Database or state changes required?
- **API Changes**: New or modified endpoints/interfaces?

### Question Format

Each question MUST:
1. Be numbered for easy reference
2. Include a proposed answer based on your codebase analysis
3. Offer an alternative option
4. Use the format: "I found X / I recommend Y. Is that correct, or should we Z?"

Example:
```
Based on my codebase analysis, I have some technical questions:

1. **Service Architecture**: I found an existing `AuthService` at `src/services/auth.ts`. I recommend extending this service with the new functionality since it already handles token management. Is that correct, or should we create a separate `SessionService` instead?

2. **Database Impact**: This feature requires storing user preferences. I see we have a `users` table. I recommend creating a new `user_preferences` table for better separation of concerns. Is that correct, or should we add columns to the existing `users` table instead?

3. **Reusable Components**: I found a `FormValidator` component at `src/utils/validation.ts`. I assume we should reuse this for the new form. Is that correct, or does this feature need custom validation logic?
```

### Phase 4: Confidence-Based Loop
After each round of answers, assess your confidence level:

1. **Assess confidence**: Are you 95% confident you understand:
   - What needs to be implemented?
   - That the project can support this change?
   - That you've picked the simplest and cleanest solution?
   - That you're not creating duplicate code?
   - That you're reusing existing code where possible?

2. **If <95% confident**: Ask 1-3 follow-up questions focusing on gaps
3. **Maximum 3 rounds**: Don't exceed 3 rounds of questions
4. **If still <95% after 3 rounds**: Warn and proceed with noted gaps

### Phase 5: Write spec.md
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

## Existing Code to Leverage
- Components to reuse: [list with file paths]
- Patterns to follow: [list with examples]
- Services to extend: [list with file paths]

## Alternatives Considered
What other approaches were considered and why this one was chosen.
```

### Phase 6: Write tasks.md
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
- Manual testing → testing.md (Phase 7)
- Manual verification → testing.md (Phase 7)
- Documentation → document-writer agent during `/nextai-complete`
- Review/feedback → reviewer agent during `/nextai-review`

**CRITICAL:** Do NOT create "Manual Verification", "Manual Testing", or similar sections in tasks.md. All manual testing tasks belong in testing.md (Phase 7).

### Guidelines
- Tasks should be specific and actionable
- Each task should be completable in one focused session
- Group related tasks together
- Include time-critical dependencies

### Phase 7: Write testing.md
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
