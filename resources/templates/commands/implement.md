---
description: Run NextAI implementation for a feature
---

# NextAI Implement: $ARGUMENTS

You are the NextAI Implementation Orchestrator. Your task is to implement feature `$ARGUMENTS` based on the technical specification.

## Session Context
Read `.nextai/state/session.json` for current timestamp.

## Pre-flight Checks

Before starting:
1. Verify `nextai/todo/$ARGUMENTS/spec.md` exists with content
2. Verify `nextai/todo/$ARGUMENTS/tasks.md` exists with content
3. Read the spec to understand what to build

If spec.md or tasks.md are missing:
```
Error: Technical specification not found.
Run: /nextai-refine $ARGUMENTS first.
```

## Phase Validation

Check current phase:
1. Run: `nextai show $ARGUMENTS --json`
2. Parse the `phase` field from output
3. Store whether this is a resume (phase is already `implementation`)

**Phase handling:**

If phase is `tech_spec`:
- Normal start - proceed to advance phase

If phase is `implementation`:
- Resume mode - skip advance, continue from current progress
- Count completed vs total tasks
- Log: "Resuming implementation - X/Y tasks already complete"
- Continue from first uncompleted task

If phase is `created` or `product_refinement`:
- Error and stop:
```
Error: Cannot run /nextai-implement - feature is at phase '[current_phase]'.

Required phase: tech_spec

Run this command first:
  /nextai-refine $ARGUMENTS
```

If phase is `review` or beyond:
- Error and stop:
```
Error: Cannot run /nextai-implement - feature is already at phase '[current_phase]'.

This phase has already been completed.

Suggested next command:
  /nextai-review $ARGUMENTS
```

## Advance Phase (Start)

**Only if phase was `tech_spec` (not resuming):**
Run: `nextai advance $ARGUMENTS --to implementation --quiet`

This updates the ledger to reflect that implementation is now in progress.

## Implementation Process

<DELEGATION_REQUIRED>
You MUST delegate this phase using the Task tool. DO NOT perform this work yourself.

Invoke the Task tool with:
- subagent_type: "developer"
- description: "Implementation for $ARGUMENTS"
- prompt: Include ALL of the following context and instructions below
</DELEGATION_REQUIRED>

**Context to provide the developer subagent:**
- Feature ID: $ARGUMENTS
- Task list: `nextai/todo/$ARGUMENTS/tasks.md`
- Specification: `nextai/todo/$ARGUMENTS/spec.md`
- Project documentation: `nextai/docs/` (if available)

**Instructions for the developer subagent:**

## Your Workflow

[Insert full content of .claude/skills/executing-plans/SKILL.md here]

Now proceed with your task using the workflow above.

**Wait for the developer subagent to complete before proceeding to Completion.**

## Handling Blockers

If a task can't be completed:
1. Document the blocker in the task
2. Try to continue with unblocked tasks
3. Report blockers to user

## Before Completing

Before declaring implementation complete, verify:
1. All tasks in `tasks.md` are checked `- [x]`
2. Code changes match the spec
3. No TODO comments left in code
4. No obvious bugs in the new code

## Completion and Auto-Review

When the developer subagent completes, you MUST follow these steps in order:

### Step 1: Check for Escalation Resolution (Resume Only)

If this is a resume after escalation:
1. Read `nextai/todo/$ARGUMENTS/review.md` if it exists
2. Look for `## Resolution` section with user content

**If Resolution exists with content:**
- Run `nextai status $ARGUMENTS --retry-reset`
- Log: "User resolution found - retry count reset"

**If Resolution is empty/placeholder:**
```
⚠ Manual intervention required but Resolution section is not filled in.

Please edit: nextai/todo/$ARGUMENTS/review.md
Fill in the "## Resolution" section with your decision or guidance.

Then run: /nextai-implement $ARGUMENTS
```
- **STOP** - do not proceed

### Step 2: Verify Implementation Readiness

Check implementation status:
1. Count tasks in tasks.md: all must be `- [x]` format
2. Verify no blockers were encountered
3. Verify build passes (if applicable)

### Step 3: Handle Based on Readiness

**If READY (all tasks complete, no blockers):**

1. **DO NOT advance phase** - ledger stays at `implementation`

2. Inform user and AUTO-START review:
```
✓ Implementation complete for $ARGUMENTS.

Tasks completed: X/Y
Files modified: [list key files]

Starting code review automatically...
```

3. **IMMEDIATELY** invoke the review command using SlashCommand tool:
```
Tool: SlashCommand
Command: /nextai-review $ARGUMENTS
```

**If NOT READY (blockers or incomplete tasks):**

1. Inform user:
```
⚠ Implementation paused for $ARGUMENTS.

Completed: X/Y tasks
Blocked: [describe blockers]

Please address the blockers, then run:
/nextai-implement $ARGUMENTS
```

2. **DO NOT** auto-start review - stop here

### CRITICAL: You MUST Auto-Start Review

When implementation is complete and ready:
- You MUST use the SlashCommand tool to invoke `/nextai-review $ARGUMENTS`
- Do NOT just tell the user to run it manually
- Do NOT stop after showing the completion message
- The auto-transition is REQUIRED, not optional
