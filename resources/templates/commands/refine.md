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

Check current phase AND type:
1. Run: `nextai show $ARGUMENTS --json`
2. Parse the `phase` field from output
3. Parse the `type` field from output (feature, bug, or task)
4. Store whether this is a resume (phase is already at refinement phase)

**Phase handling:**

If phase is `created`:
- Normal start - route based on type (see Type-Specific Routing below)

If phase is `bug_investigation`:
- Resume mode for bugs - continue investigation
- Log: "Resuming bug investigation - checking previous progress..."
- Skip the phase advance

If phase is `product_refinement`:
- Resume mode for features/bugs - continue refinement from current progress
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

## Type-Specific Routing

Based on the `type` field from `nextai show --json`:

**If type is `bug` and phase is `created`:**
- First advance to bug_investigation: `nextai advance $ARGUMENTS --to bug_investigation --quiet`
- Launch investigator agent (see Bug Investigation section)
- Then proceed to technical-architect (skip product owner)

**If type is `task` and phase is `created`:**
- Advance directly to tech_spec phase
- Skip product owner entirely
- Launch technical-architect directly (see Task Technical Specification section)

**If type is `feature` and phase is `created`:**
- Advance to product_refinement: `nextai advance $ARGUMENTS --to product_refinement --quiet`
- Launch product owner for requirements gathering (see Phase 1)
- Then launch technical-architect (see Phase 2)

## Bug Investigation (Bug Type Only)

**For bugs starting from `created` phase:**

First advance to bug_investigation phase:
Run: `nextai advance $ARGUMENTS --to bug_investigation --quiet`

<DELEGATION_REQUIRED>
You MUST delegate bug investigation using the Task tool. DO NOT investigate yourself.

Invoke the Task tool with:
- subagent_type: "investigator"
- description: "Bug investigation for $ARGUMENTS"
- prompt: Include evidence files, reproduction steps, and error details
</DELEGATION_REQUIRED>

**Context to provide the investigator subagent:**
- Feature ID: $ARGUMENTS
- Input: `nextai/todo/$ARGUMENTS/planning/initialization.md`
- Output: `nextai/todo/$ARGUMENTS/planning/investigation.md`
- Evidence files in `attachments/evidence/` (if available)

**Instructions for the investigator subagent:**

FIRST ACTION - Load Your Skills:
Before starting investigation, you MUST load your assigned skills:
1. Use the Skill tool: Skill("root-cause-tracing")
2. Use the Skill tool: Skill("systematic-debugging")
3. These skills provide debugging methodologies and tracing patterns
4. Follow the skills' guidance throughout the investigation

Then proceed with your workflow:
1. Analyze the bug report and evidence
2. Trace the root cause
3. Document findings in investigation.md

**After investigation completes:**
1. Advance to product_refinement: `nextai advance $ARGUMENTS --to product_refinement --quiet`
2. Proceed to Technical Specification (Phase 2) - SKIP Phase 1

## Task Technical Specification (Task Type Only)

**For tasks starting from `created` phase:**

Skip product owner phase entirely and go directly to tech_spec:

<DELEGATION_REQUIRED>
You MUST delegate this using the Task tool. DO NOT perform this work yourself.

Invoke the Task tool with:
- subagent_type: "technical-architect"
- description: "Tech spec for task $ARGUMENTS"
- prompt: Include ALL of the following context and instructions below
</DELEGATION_REQUIRED>

**Context to provide the technical-architect subagent:**
- Feature ID: $ARGUMENTS
- Input: `nextai/todo/$ARGUMENTS/planning/initialization.md`
- Output: `nextai/todo/$ARGUMENTS/spec.md`, `nextai/todo/$ARGUMENTS/tasks.md`, and `nextai/todo/$ARGUMENTS/testing.md`
- Project docs: `nextai/docs/` (if available)

**Instructions for the technical-architect subagent:**

FIRST ACTION - Load Your Skill:
Before creating the specification, you MUST load your assigned skill:
1. Use the Skill tool: Skill("refinement-spec-writer")
2. This skill provides spec structure templates and task breakdown patterns
3. Follow the skill's guidance for writing spec.md and tasks.md

Then proceed with your workflow:
1. Read initialization.md for task description
2. Review project docs in `nextai/docs/` if available
3. Write streamlined spec.md (lighter than features)
4. Write tasks.md with implementation checklist
5. Write testing.md with manual test checklist

**After spec completes:**
1. Advance to tech_spec: `nextai advance $ARGUMENTS --to tech_spec --quiet`
2. Inform the user that the task is ready for implementation

## Phase 1: Product Research (Feature Type Only)

**Only for features at `created` or `product_refinement` phase.**

First advance phase (if at created):
Run: `nextai advance $ARGUMENTS --to product_refinement --quiet`

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
1. Use the Skill tool: Skill("refinement-questions")
2. This skill provides question generation patterns and refinement best practices
3. Follow the skill's guidance for generating clarifying questions

Then proceed with your workflow:
1. Follow the refinement-questions skill for Q&A-based requirements gathering

**Wait for the product-owner subagent to complete Phase 1 before proceeding to Phase 2.**

## Phase 2: Technical Specification (Features and Bugs)

**For features:** After Phase 1 (product research) completes.
**For bugs:** After bug investigation completes.

<DELEGATION_REQUIRED>
You MUST delegate this phase using the Task tool. DO NOT perform this work yourself.

Invoke the Task tool with:
- subagent_type: "technical-architect"
- description: "Tech spec for $ARGUMENTS"
- prompt: Include ALL of the following context and instructions below
</DELEGATION_REQUIRED>

**Context to provide the technical-architect subagent:**
- Feature ID: $ARGUMENTS
- Input (for features): `nextai/todo/$ARGUMENTS/planning/requirements.md`
- Input (for bugs): `nextai/todo/$ARGUMENTS/planning/investigation.md`
- Output: `nextai/todo/$ARGUMENTS/spec.md`, `nextai/todo/$ARGUMENTS/tasks.md`, and `nextai/todo/$ARGUMENTS/testing.md`
- Project docs: `nextai/docs/` (if available)

**Instructions for the technical-architect subagent:**

FIRST ACTION - Load Your Skill:
Before creating the specification, you MUST load your assigned skill:
1. Use the Skill tool: Skill("refinement-spec-writer")
2. This skill provides spec structure templates and task breakdown patterns
3. Follow the skill's guidance for writing spec.md and tasks.md

Then proceed with your workflow:
1. Follow the refinement-spec-writer skill for writing spec.md, tasks.md, and testing.md

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

