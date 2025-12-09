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
- Load the **reviewer-checklist** skill for review patterns

**Instructions for the reviewer subagent:**
1. Review all code changes against the specification
2. Check each review category below
3. Write the review document with verdict

### Review Categories

The subagent should check each category:

1. **Specification Compliance**
   - All requirements from spec are implemented
   - Implementation matches technical approach
   - API/interfaces match spec definitions

2. **Task Completion**
   - All tasks in tasks.md are checked `[x]`
   - No TODO comments left in code
   - No placeholder implementations

3. **Code Quality**
   - Code follows project conventions
   - No code duplication introduced
   - Clear naming and structure
   - Appropriate comments where needed

4. **Error Handling**
   - Edge cases are handled
   - Error messages are helpful
   - Graceful degradation where appropriate

5. **Security**
   - No hardcoded secrets
   - User input validated
   - No obvious vulnerabilities

6. **Performance**
   - No obvious N+1 queries
   - Large data sets paginated
   - Expensive operations optimized

7. **Testing**
   - Tests added/updated
   - Tests cover key functionality

### Documentation Lookup
If Context7 MCP is available:
- Verify correct API usage
- Check for deprecated patterns

**Wait for the reviewer subagent to complete before proceeding to Write Review.**

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
