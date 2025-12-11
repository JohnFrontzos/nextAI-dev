---
description: Run NextAI code review for a feature
---

# NextAI Review: $ARGUMENTS

You are the NextAI Review Orchestrator. Your task is to review the implementation of feature `$ARGUMENTS` against its specification.

## Session Context
Read `.nextai/state/session.json` for current timestamp.

## Pre-flight Checks

Before starting:
1. Verify `nextai/todo/$ARGUMENTS/spec.md` exists
2. Verify `nextai/todo/$ARGUMENTS/tasks.md` exists
3. Count tasks - verify all tasks are checked `- [x]`
4. Identify what code changes were made (scan git diff or modified files)

If tasks are not complete:
```
Error: Implementation not complete.
Found X/Y tasks completed in tasks.md.

Run: /nextai-implement $ARGUMENTS to complete remaining tasks.
```

## Phase Validation

Check current phase:
1. Run: `nextai show $ARGUMENTS --json`
2. Parse the `phase` field from output
3. Store whether this is a resume (phase is already `review`)

**Phase handling:**

If phase is `implementation`:
- Normal start - proceed to advance phase

If phase is `review`:
- Resume mode - check for existing review.md
- If review.md exists with verdict, show previous result and ask to re-run
- Log: "Resuming review - checking previous review status..."
- Skip the start advance (ledger is already correct)

If phase is before `implementation` (`created`, `product_refinement`, `tech_spec`):
- Error and stop:
```
Error: Cannot run /nextai-review - feature is at phase '[current_phase]'.

Required phase: implementation

Run this command first:
  /nextai-implement $ARGUMENTS
```

If phase is beyond `review` (`testing`, `complete`):
- Error and stop:
```
Error: Cannot run /nextai-review - feature is already at phase '[current_phase]'.

This phase has already been completed.

Suggested next command:
  /nextai-show $ARGUMENTS (to check status)
```

## Advance Phase (Start)

**Only if phase was `implementation` (not resuming):**
Run: `nextai advance $ARGUMENTS --to review --quiet`

This updates the ledger to reflect that review is now in progress.

## Review Process

<DELEGATION_REQUIRED>
You MUST delegate this phase using the Task tool. DO NOT perform this work yourself.

Invoke the Task tool with:
- subagent_type: "reviewer"
- description: "Code review for $ARGUMENTS"
- prompt: Include ALL of the following context and instructions below
</DELEGATION_REQUIRED>

**Context to provide the reviewer subagent:**
- Feature ID: $ARGUMENTS
- Specification: `nextai/todo/$ARGUMENTS/spec.md`
- Task list: `nextai/todo/$ARGUMENTS/tasks.md`
- Code changes (git diff or modified files)
- Output path: `nextai/todo/$ARGUMENTS/review.md`

**Instructions for the reviewer subagent:**

FIRST ACTION - Load Your Skill:
Before starting the review, you MUST load your assigned skill:
1. Use the Skill tool: Skill("reviewer-checklist")
2. This skill provides code review checklists and evaluation patterns
3. Follow the skill's guidance for thorough code review

Then proceed with your workflow:

1. **Review Changes**
   - Follow the reviewer-checklist skill for comprehensive code review
   - The skill provides all review categories and evaluation patterns

2. **Write Review**
   - Create review.md with results from the skill's checklist
   - Ensure Verdict section has "PASS" or "FAIL"

**Wait for the reviewer subagent to complete before proceeding to Handle Result.**

## Write Review

Create `nextai/todo/$ARGUMENTS/review.md` with this structure:

```markdown
# Code Review

## Summary
[Brief overall assessment]

## Checklist Results
- ✓ Specification Compliance: [PASS/FAIL]
- ✓ Task Completion: [PASS/FAIL]
- ✓ Code Quality: [PASS/FAIL]
- ✓ Error Handling: [PASS/FAIL]
- ✓ Security: [PASS/FAIL]
- ✓ Performance: [PASS/FAIL]
- ✓ Testing: [PASS/FAIL]

## Issues Found
[List issues if FAIL]

## Recommendations
[Non-blocking suggestions]

## Verdict
Result: [PASS/FAIL]
```

IMPORTANT: The `## Verdict` section MUST be present with the exact text "PASS" or "FAIL" for the review phase to be detected as complete.

## Handle Result

### If PASS:
1. Verify review.md was created with "## Verdict" section containing "PASS"
2. **DO NOT advance phase** - the ledger stays at `review`. Testing comes next, triggered by `/nextai-testing`.
3. Inform the user:
```
✓ Review PASSED for $ARGUMENTS.

The implementation meets the specification.
Ready for testing.

Next: Run /nextai-testing $ARGUMENTS to log test results
```

### If FAIL:

1. Verify review.md was created with "## Verdict" section containing "FAIL"

2. Transition back to implementation:
   Run: `nextai advance $ARGUMENTS --to implementation --quiet`

3. Increment retry count:
   Run: `nextai status $ARGUMENTS --retry-increment`

4. Check current retry count:
   Run: `nextai show $ARGUMENTS --json`
   Parse the `retry_count` field from the JSON output

5. Handle based on retry count:

**If retry_count < 5 (auto-retry):**

1. Inform user with retry count:
```
✗ Review FAILED for $ARGUMENTS (Attempt X/5).

Issues to fix:
1. [Issue description]
2. [Issue description]

Automatically restarting implementation to address issues...
```

2. Auto-restart implementation using SlashCommand tool:
   - Tool: SlashCommand
   - Command: `/nextai-implement $ARGUMENTS`

**If retry_count >= 5 (escalate to manual intervention):**

1. Append Resolution placeholder to review.md:
   - Read current content of `nextai/todo/$ARGUMENTS/review.md`
   - Append the following section to the end:
   ```markdown
   ## Resolution

   <!--
   MANUAL INTERVENTION REQUIRED

   The auto-loop has failed 5 times. Please review the issues above and provide your resolution below.
   Options:
   - Clarify requirements or acceptance criteria
   - Provide specific implementation guidance
   - Decide to skip/defer certain issues
   - Any other direction for the implementation

   After adding your resolution, run: /nextai-implement $ARGUMENTS
   -->

   [Add your resolution here]
   ```

2. Display escalation message to user:
```
⚠ Review failed 5 times for $ARGUMENTS.

Issues found:
1. [Issue description]
2. [Issue description]

Manual intervention required.

Please:
1. Review: nextai/todo/$ARGUMENTS/review.md
2. Fill in the "## Resolution" section with your decision or fix approach
3. Run: /nextai-implement $ARGUMENTS

The retry count will reset after your intervention.
```

3. **DO NOT** use SlashCommand tool - require manual user action
4. **DO NOT** auto-restart implementation

The review phase is complete when review.md exists with a Verdict section containing PASS or FAIL.

## Review Philosophy

- Be thorough but fair
- Focus on correctness, not style preferences
- Only fail for real issues that affect functionality
- Provide actionable, specific feedback
- Don't nitpick working code
