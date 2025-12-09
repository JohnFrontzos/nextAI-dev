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

## Phase Validation

Check current phase:
1. Run: `nextai show $ARGUMENTS --json`
2. Parse the `phase` field from output
3. Store whether this is a resume (phase is already `product_refinement`)

**Phase handling:**

If phase is `created`:
- Normal start - proceed to advance phase

If phase is `product_refinement`:
- Resume mode - continue refinement from current progress
- Log: "Resuming refinement - checking previous progress..."
- Skip the start advance (ledger is already correct)

If phase is `tech_spec`:
- Already refined - warn user and ask to confirm re-run
- "Tech spec already exists. Do you want to re-run refinement? This will overwrite existing spec.md and tasks.md."
- Wait for confirmation before proceeding

If phase is `implementation` or beyond:
- Error and stop:
```
Error: Cannot run /nextai-refine - feature is already at phase '[current_phase]'.

This phase has already been completed.

Suggested next command:
  /nextai-review $ARGUMENTS (if at implementation)
  /nextai-show $ARGUMENTS (to check status)
```

## Advance Phase (Start)

**Only if phase was `created` (not resuming):**
Run: `nextai advance $ARGUMENTS --to product_refinement --quiet`

This updates the ledger to reflect that refinement is now in progress.

## Phase 1: Product Research

<DELEGATION_REQUIRED>
You MUST delegate this phase using the Task tool. DO NOT perform this work yourself.

Invoke the Task tool with:
- subagent_type: "product-owner"
- description: "Product research for $ARGUMENTS"
- prompt: Include ALL of the following context and instructions below
</DELEGATION_REQUIRED>

**Context to provide the product-owner subagent:**
- Feature ID: $ARGUMENTS
- Input: `nextai/todo/$ARGUMENTS/planning/initialization.md`
- Output: `nextai/todo/$ARGUMENTS/planning/requirements.md`

**Instructions for the product-owner subagent:**
1. Read the initialization document thoroughly
2. Generate 5-10 numbered clarifying questions with proposed answers
3. Present questions to the user and STOP - wait for user response
4. After receiving answers, assess confidence level
5. If <95% confident, ask 1-3 follow-up questions (max 3 rounds)
6. Write confirmed requirements to `planning/requirements.md`
7. Always ask about: visual assets, reusability, scope boundaries
8. For bugs: ask about reproduction steps, error logs

**Wait for the product-owner subagent to complete Phase 1 before proceeding to Phase 2.**

## Phase 2: Technical Specification

<DELEGATION_REQUIRED>
You MUST delegate this phase using the Task tool. DO NOT perform this work yourself.

Invoke the Task tool with:
- subagent_type: "technical-architect"
- description: "Tech spec for $ARGUMENTS"
- prompt: Include ALL of the following context and instructions below
</DELEGATION_REQUIRED>

**Context to provide the technical-architect subagent:**
- Feature ID: $ARGUMENTS
- Input: `nextai/todo/$ARGUMENTS/planning/requirements.md`
- Output: `nextai/todo/$ARGUMENTS/spec.md` and `nextai/todo/$ARGUMENTS/tasks.md`
- Project docs: `nextai/docs/` (if available)

**Instructions for the technical-architect subagent:**
1. Read the requirements document thoroughly
2. Review project docs in `nextai/docs/` if available
3. If Context7 MCP is available, look up relevant library docs
4. Design the technical approach
5. If uncertain, ask technical clarifying questions (max 3 rounds)
6. Write `spec.md` with full technical specification
7. Write `tasks.md` with implementation checklist

**Wait for the technical-architect subagent to complete Phase 2 before proceeding to Completion.**

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
- Automated tests (unit tests, integration tests - NOT manual testing)

> Do NOT include documentation or review tasks - these are handled by their respective phases.

## Completion

When both phases complete successfully:

1. Verify all required files were created:
   - `nextai/todo/$ARGUMENTS/planning/requirements.md` - Product research results
   - `nextai/todo/$ARGUMENTS/spec.md` - Technical specification
   - `nextai/todo/$ARGUMENTS/tasks.md` - Implementation task list

2. **Advance to tech_spec phase:**
   Run: `nextai advance $ARGUMENTS --to tech_spec --quiet`

3. Inform the user:
   ```
   ✓ Feature $ARGUMENTS is ready for implementation.

   Created:
   - planning/requirements.md
   - spec.md
   - tasks.md

   Next: Run /nextai-implement $ARGUMENTS
   ```

## Handling Bugs

If the feature type is `bug`:
- Check for evidence files in `attachments/evidence/` (logs, screenshots)
- Ask for reproduction steps and error details

<DELEGATION_REQUIRED>
You MUST delegate bug investigation using the Task tool. DO NOT investigate yourself.

Invoke the Task tool with:
- subagent_type: "investigator"
- description: "Bug investigation for $ARGUMENTS"
- prompt: Include evidence files, reproduction steps, and error details
</DELEGATION_REQUIRED>

**Context to provide the investigator subagent:**
- Feature ID: $ARGUMENTS
- Evidence files in `attachments/evidence/`
- User-provided reproduction steps
- Error details and logs

**Instructions for the investigator subagent:**
1. Analyze the evidence
2. Trace the root cause
3. Document findings

After investigation completes, delegate to technical-architect:

<DELEGATION_REQUIRED>
You MUST delegate technical specification using the Task tool. DO NOT create the spec yourself.

Invoke the Task tool with:
- subagent_type: "technical-architect"
- description: "Tech spec for bug fix $ARGUMENTS"
- prompt: Include ALL of the following context and instructions below
</DELEGATION_REQUIRED>

**Context to provide the technical-architect subagent:**
- Feature ID: $ARGUMENTS
- Input: `nextai/todo/$ARGUMENTS/planning/investigation.md` (investigator findings)
- Input: `nextai/todo/$ARGUMENTS/planning/initialization.md` (original bug report)
- Output: `nextai/todo/$ARGUMENTS/spec.md` and `nextai/todo/$ARGUMENTS/tasks.md`
- Project docs: `nextai/docs/` (if available)

**Instructions for the technical-architect subagent:**
1. Read the investigation document thoroughly
2. Read the original bug report for context
3. Review project docs in `nextai/docs/` if available
4. Design the fix approach
5. If uncertain, ask technical clarifying questions (max 3 rounds)
6. Write `spec.md` with full fix specification
7. Write `tasks.md` with implementation checklist (ONLY implementation tasks)

**Wait for the technical-architect subagent to complete before proceeding to Completion.**

If evidence files are missing, ask:
"Do you have any error logs, stack traces, or screenshots? Please add them to `attachments/evidence/`"

## Handling Tasks

If the feature type is `task`:
- Quick product research (1-2 questions max)
- Streamlined tech spec
