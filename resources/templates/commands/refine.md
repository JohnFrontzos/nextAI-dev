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

FIRST ACTION - Load Your Skill:
Before starting refinement, you MUST load your assigned skill:
1. Use the Skill tool: Skill("refinement-product")
2. This skill provides question generation patterns and refinement best practices
3. Follow the skill's guidance for generating clarifying questions

Then proceed with your workflow:
1. Follow the refinement-product skill for Q&A-based requirements gathering

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
- Output: `nextai/todo/$ARGUMENTS/spec.md`, `nextai/todo/$ARGUMENTS/tasks.md`, and `nextai/todo/$ARGUMENTS/testing.md`
- Project docs: `nextai/docs/` (if available)

**Instructions for the technical-architect subagent:**

FIRST ACTION - Load Your Skill:
Before creating the specification, you MUST load your assigned skill:
1. Use the Skill tool: Skill("refinement-technical")
2. This skill provides codebase analysis patterns, technical Q&A, and spec writing templates
3. Follow the skill's guidance for technical analysis, writing spec.md, tasks.md, and testing.md

Then proceed with your workflow:
1. Follow the refinement-technical skill for codebase exploration, technical Q&A, and writing spec.md, tasks.md, and testing.md

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
Tasks must contain ONLY implementation-phase work:
- Pre-implementation tasks
- Core implementation tasks (checkbox format)
- Unit tests (only if project has test framework - check nextai/docs/technical-guide.md)

**CRITICAL - DO NOT include these sections:**
- Manual Verification/Testing - Use testing.md instead
- Documentation tasks - Handled by /nextai-complete phase
- Review tasks - Handled by /nextai-review phase

**Where testing belongs:**
- Testing Strategy (approach) in spec.md
- Manual Test Checklist in testing.md
- Test Sessions in testing.md (logged during /nextai-testing)

## Completion

When both phases complete successfully:

1. Verify all required files were created:
   - `nextai/todo/$ARGUMENTS/planning/requirements.md` - Product research results
   - `nextai/todo/$ARGUMENTS/spec.md` - Technical specification
   - `nextai/todo/$ARGUMENTS/tasks.md` - Implementation task list
   - `nextai/todo/$ARGUMENTS/testing.md` - Manual test checklist

2. **Advance to tech_spec phase:**
   Run: `nextai advance $ARGUMENTS --to tech_spec --quiet`

3. Inform the user:
   ```
   ✓ Feature $ARGUMENTS is ready for implementation.

   Created:
   - planning/requirements.md
   - spec.md
   - tasks.md
   - testing.md

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

FIRST ACTION - Load Your Skills:
Before starting investigation, you MUST load your assigned skills:
1. Use the Skill tool: Skill("root-cause-tracing")
2. Use the Skill tool: Skill("systematic-debugging")
3. These skills provide debugging methodologies and tracing patterns
4. Follow the skills' guidance throughout the investigation

Then proceed with your workflow:

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
- Output: `nextai/todo/$ARGUMENTS/spec.md`, `nextai/todo/$ARGUMENTS/tasks.md`, and `nextai/todo/$ARGUMENTS/testing.md`
- Project docs: `nextai/docs/` (if available)

**Instructions for the technical-architect subagent:**

FIRST ACTION - Load Your Skill:
Before creating the specification, you MUST load your assigned skill:
1. Use the Skill tool: Skill("refinement-technical")
2. This skill provides codebase analysis patterns, technical Q&A, and spec writing templates
3. Follow the skill's guidance for technical analysis, writing spec.md, tasks.md, and testing.md

Then proceed with your workflow:

1. Read the investigation document thoroughly
2. Read the original bug report for context
3. Review project docs in `nextai/docs/` if available
4. Design the fix approach
5. If uncertain, ask technical clarifying questions (max 3 rounds)
6. Write `spec.md` with full fix specification
7. Write `tasks.md` with implementation checklist (ONLY implementation tasks)
8. Write `testing.md` with manual test checklist

**Wait for the technical-architect subagent to complete before proceeding to Completion.**

If evidence files are missing, ask:
"Do you have any error logs, stack traces, or screenshots? Please add them to `attachments/evidence/`"

## Handling Tasks

If the feature type is `task`:
- Quick product research (1-2 questions max)
- Streamlined tech spec
