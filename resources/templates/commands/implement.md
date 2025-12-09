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
- Load the **executing-plans** skill for implementation patterns

**Instructions for the developer subagent:**
1. **Read Context**
   - Read the full spec
   - Read the task list
   - Review project docs in `nextai/docs/`
   - Scan related existing code

2. **Documentation Lookup**
   If Context7 MCP is available, look up:
   - API references for libraries being used
   - Best practices for the technologies involved

3. **Execute Tasks**
   For each unchecked task in order:
   - Understand the task
   - Read relevant existing code
   - Plan the changes
   - Implement the code
   - Verify it works
   - Mark task complete: `- [x]`

4. **Progress Updates**
   After significant milestones, report back with:
   - Tasks completed
   - Any issues or deviations
   - Next steps

**Wait for the developer subagent to complete before proceeding to Completion.**

## Code Quality

While implementing:
- Follow existing code patterns
- Match project style and conventions
- Add appropriate error handling
- Keep code simple and readable
- Only add comments where logic is complex
- Don't refactor unrelated code
- Don't add features beyond the spec

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

## Completion

When all tasks are complete:

1. Verify implementation is complete:
   - Count tasks: all should be `- [x]` format
   - Confirm with user if uncertain

2. **DO NOT advance phase** - the ledger stays at `implementation`. Review comes next, triggered separately.

3. Update the user:
```
✓ Implementation complete for $ARGUMENTS.

Tasks completed: X/Y
Files modified: [list key files]

The feature is ready for review.
Next: Run /nextai-review $ARGUMENTS
```

If there are issues:
```
⚠ Implementation paused for $ARGUMENTS.

Completed: X/Y tasks
Blocked: [describe blockers]

Please address the blockers, then run:
/nextai-implement $ARGUMENTS
```

## Auto-continue to Review

After implementation completes successfully, automatically start the review phase.

**Step 1: Check for Manual Intervention (Escalation Handling)**

If this is a resume after escalation, check for user's resolution:
1. Read `nextai/todo/$ARGUMENTS/review.md` if it exists
2. Look for `## Resolution` section
3. Check if Resolution has user content (not just the placeholder comment)

**If Resolution section exists with user content:**
- Reset retry count: Run `nextai status $ARGUMENTS --retry-reset`
- Use the Resolution content as additional context for implementation
- Log: "User resolution found - retry count reset, proceeding with guidance..."

**If Resolution section is placeholder only or empty:**
- Warn user:
```
⚠ Manual intervention required but Resolution section is not filled in.

Please edit: nextai/todo/$ARGUMENTS/review.md
Fill in the "## Resolution" section with your decision or guidance.

Then run: /nextai-implement $ARGUMENTS
```
- **STOP** - do not proceed with implementation

**Step 2: Verify Readiness for Auto-Transition**

Check if implementation is ready for review:
1. Count tasks in tasks.md: all must be `- [x]` format
2. Verify no blockers were encountered during implementation
3. Verify implementation was completed (not paused)

**Step 3: Handle Based on Readiness**

**If READY (all tasks complete, no blockers):**

1. Inform user:
```
✓ Implementation complete for $ARGUMENTS.

Tasks completed: X/Y
Files modified: [list key files]

Starting code review automatically...
```

2. Auto-start review using SlashCommand tool:
   - Tool: SlashCommand
   - Command: `/nextai-review $ARGUMENTS`

**If NOT READY (blockers present or tasks incomplete):**

1. Inform user and list issues:
```
⚠ Implementation paused for $ARGUMENTS.

Completed: X/Y tasks
Blocked: [describe blockers]

Please address the blockers, then run:
/nextai-implement $ARGUMENTS
```

2. **DO NOT** auto-start review - require user intervention

**IMPORTANT:** Only auto-start review if implementation is fully complete without issues.
