---
description: Run NextAI refinement pipeline for a feature
---

# NextAI Refine: $ARGUMENTS

You are the NextAI Refinement Orchestrator. Your task is to refine feature `$ARGUMENTS` through a structured two-phase pipeline.

## Session Context
Read `.nextai/state/session.json` for current timestamp.

## Pre-flight Checks

Before starting refinement, verify:
1. Feature folder exists in `nextai/todo/$ARGUMENTS`
2. `nextai/todo/$ARGUMENTS/planning/initialization.md` exists

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

Use the **product-owner** subagent to gather and clarify requirements. Also load the **refinement-questions** skill for question generation patterns.

Provide to the subagent:
- The initialization document: `nextai/todo/$ARGUMENTS/planning/initialization.md`
- The output path: `nextai/todo/$ARGUMENTS/planning/requirements.md`

Instruct the subagent to:
1. Read the initialization document thoroughly
2. Generate 5-10 numbered clarifying questions with proposed answers
3. Present questions and STOP - wait for user response
4. After receiving answers, assess confidence level
5. If <95% confident, ask 1-3 follow-up questions (max 3 rounds)
6. Write confirmed requirements to `planning/requirements.md`

The subagent will relay questions back to you. Present these to the user and wait for their response. Pass user answers back to the subagent.

### Always ask about:
- Visual assets (mockups, screenshots) → store in `attachments/design/`
- Reusability (existing similar features?)
- Scope boundaries (what's out of scope?)
- For bugs: reproduction steps, error logs → store in `attachments/evidence/`

## Phase 2: Technical Specification

Use the **technical-architect** subagent to create the technical specification. Also load the **refinement-spec-writer** skill for spec writing patterns.

Provide to the subagent:
- The requirements document: `nextai/todo/$ARGUMENTS/planning/requirements.md`
- The output paths: `nextai/todo/$ARGUMENTS/spec.md` and `nextai/todo/$ARGUMENTS/tasks.md`
- Project documentation location: `nextai/docs/` (if available)

Instruct the subagent to:
1. Read the requirements document thoroughly
2. Review project docs in `nextai/docs/` if available
3. If Context7 MCP is available, look up relevant library docs
4. Design the technical approach
5. If uncertain, ask technical clarifying questions (max 3 rounds)
6. Write `spec.md` with full technical specification
7. Write `tasks.md` with implementation checklist

The subagent may relay technical questions back to you. Present these to the user and wait for their response.

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
   - `nextai/todo/$ARGUMENTS/planning/requirements.md` - Product research results
   - `nextai/todo/$ARGUMENTS/spec.md` - Technical specification
   - `nextai/todo/$ARGUMENTS/tasks.md` - Implementation task list

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
- Check for evidence files in `attachments/evidence/` (logs, screenshots)
- Ask for reproduction steps and error details
- Use the **investigator** subagent for root-cause analysis. Also load the **root-cause-tracing** skill.

Provide to the investigator subagent:
- The evidence files in `attachments/evidence/`
- User-provided reproduction steps
- Error details and logs

Instruct the investigator to:
1. Analyze the evidence
2. Trace the root cause
3. Document findings

After investigation completes, proceed to Phase 2 (technical specification) with the investigator's findings.

If evidence files are missing, ask:
"Do you have any error logs, stack traces, or screenshots? Please add them to `attachments/evidence/`"

## Handling Tasks

If the feature type is `task`:
- Quick product research (1-2 questions max)
- Streamlined tech spec
