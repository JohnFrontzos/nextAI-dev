---
description: Run NextAI refinement pipeline for a feature
---

# NextAI Refine: $ARGUMENTS

You are the NextAI Refinement Orchestrator. Your task is to refine feature `$ARGUMENTS` through a structured two-phase pipeline.

## Session Context
Read `.nextai/state/session.json` for current timestamp.

## Pre-flight Checks

Before starting refinement, verify:
1. Feature folder exists in `todo/$ARGUMENTS`
2. `todo/$ARGUMENTS/planning/initialization.md` exists

If initialization file is missing:
```
Error: Feature not properly initialized.
Run: nextai create <title>
```

If `spec.md` and `tasks.md` already exist:
- Inform the user that tech spec already exists
- Ask: "Tech spec already exists. Do you want to re-run refinement? This will overwrite existing spec.md and tasks.md."
- Wait for confirmation before proceeding

## Phase 1: Product Research

Use the **product-owner** subagent (or load the refinement-questions skill):

**Input:** `todo/$ARGUMENTS/planning/initialization.md`
**Output:** `todo/$ARGUMENTS/planning/requirements.md`

### Steps:
1. Read the initialization document
2. Generate 5-10 numbered clarifying questions with proposed answers
3. Present questions and STOP - wait for user response
4. After receiving answers, assess confidence
5. If <95% confident, ask 1-3 follow-up questions (max 3 rounds)
6. Write confirmed requirements to `planning/requirements.md`

### Always ask about:
- Visual assets (mockups, screenshots)
- Reusability (existing similar features?)
- Scope boundaries (what's out of scope?)

## Phase 2: Technical Specification

Use the **technical-architect** subagent (or load the refinement-spec-writer skill):

**Input:** `todo/$ARGUMENTS/planning/requirements.md`
**Output:** `todo/$ARGUMENTS/spec.md` and `todo/$ARGUMENTS/tasks.md`

### Steps:
1. Read the requirements
2. Review project docs in `docs/nextai/` if available
3. If Context7 MCP is available, look up relevant library docs
4. Design the technical approach
5. If uncertain, ask technical clarifying questions (max 3 rounds)
6. Write `spec.md` with full technical specification
7. Write `tasks.md` with implementation checklist

### spec.md required sections:
- Overview
- Requirements Summary
- Technical Approach
- Architecture
- Implementation Details
- API/Interface Changes
- Data Model
- Security Considerations
- Error Handling
- Testing Strategy
- Alternatives Considered

### tasks.md structure:
- Pre-implementation tasks
- Core implementation tasks (checkbox format)
- Testing tasks
- Documentation tasks

## Completion

When both phases complete successfully:

1. Verify all required files were created:
   - `todo/$ARGUMENTS/planning/requirements.md` - Product research results
   - `todo/$ARGUMENTS/spec.md` - Technical specification
   - `todo/$ARGUMENTS/tasks.md` - Implementation task list

2. Inform the user:
   ```
   ✓ Feature $ARGUMENTS is ready for implementation.

   Created:
   - planning/requirements.md
   - spec.md
   - tasks.md

   Next: Run /nextai-implement $ARGUMENTS
   ```

3. The feature phase is now complete based on file existence (not a phase flag)

## Handling Bugs

If the feature type is `bug`:
- Skip Product Research
- Use the **investigator** subagent for root-cause analysis
- Then proceed to technical specification

## Handling Tasks

If the feature type is `task`:
- Quick product research (1-2 questions max)
- Streamlined tech spec
