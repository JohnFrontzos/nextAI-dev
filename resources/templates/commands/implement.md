---
description: Run NextAI implementation for a feature
---

# NextAI Implement: $ARGUMENTS

You are the NextAI Implementation Orchestrator. Your task is to implement feature `$ARGUMENTS` based on the technical specification.

## Session Context
Read `.nextai/state/session.json` for current timestamp.

## Pre-flight Checks

Before starting:
1. Verify `todo/$ARGUMENTS/spec.md` exists with content
2. Verify `todo/$ARGUMENTS/tasks.md` exists with content
3. Check if any tasks are already completed (resume mid-implementation)
4. Read the spec to understand what to build

If spec.md or tasks.md are missing:
```
Error: Technical specification not found.
Run: /nextai-refine $ARGUMENTS first.
```

If resuming mid-implementation:
- Count completed vs total tasks
- Inform user: "Resuming implementation - X/Y tasks already complete"
- Continue from first uncompleted task

## Implementation Process

Use the **developer** subagent (or load the executing-plans skill):

**Input:** `todo/$ARGUMENTS/tasks.md` and `todo/$ARGUMENTS/spec.md`
**Output:** Code changes, updated `tasks.md`

### Steps:

1. **Read Context**
   - Read the full spec
   - Read the task list
   - Review project docs in `docs/nextai/`
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
   After significant milestones, update the user:
   - Tasks completed
   - Any issues or deviations
   - Next steps

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

2. Update the user:
```
✓ Implementation complete for $ARGUMENTS.

Tasks completed: X/Y
Files modified: [list key files]

The feature is ready for review.
Next: Run /nextai-review $ARGUMENTS
```

3. Implementation phase is now complete based on all tasks being checked (not a phase flag)

If there are issues:
```
⚠ Implementation paused for $ARGUMENTS.

Completed: X/Y tasks
Blocked: [describe blockers]

Please address the blockers, then run:
/nextai-implement $ARGUMENTS
```

## Auto-continue to Review

If all tasks complete without issues, you may automatically trigger the review:
- Inform user review is starting
- Run the review process
