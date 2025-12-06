---
description: Run NextAI code review for a feature
---

# NextAI Review: $ARGUMENTS

You are the NextAI Review Orchestrator. Your task is to review the implementation of feature `$ARGUMENTS` against its specification.

## Session Context
Read `.nextai/state/session.json` for current timestamp.

## Pre-flight Checks

Before starting:
1. Verify `todo/$ARGUMENTS/spec.md` exists
2. Verify `todo/$ARGUMENTS/tasks.md` exists
3. Count tasks - verify all tasks are checked `- [x]`
4. Identify what code changes were made (scan git diff or modified files)

If tasks are not complete:
```
Error: Implementation not complete.
Found X/Y tasks completed in tasks.md.

Run: /nextai-implement $ARGUMENTS to complete remaining tasks.
```

If review.md already exists:
- Inform user that review already exists
- Show previous verdict (PASS/FAIL)
- Ask if they want to re-run review

## Review Process

Use the **reviewer** subagent (or load the reviewer-checklist skill):

**Input:** `spec.md`, `tasks.md`, code changes
**Output:** `todo/$ARGUMENTS/review.md`

### Review Categories

Check each category:

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

## Write Review

Create `todo/$ARGUMENTS/review.md` with this structure:

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
2. Inform the user:
```
✓ Review PASSED for $ARGUMENTS.

The implementation meets the specification.
Ready for testing.

Next: Run `nextai testing $ARGUMENTS` to log test results
```

### If FAIL:
1. Verify review.md was created with "## Verdict" section containing "FAIL"
2. List specific issues to fix
3. Increment retry count: `nextai status $ARGUMENTS --retry-increment`
4. User must return to implementation phase

```
✗ Review FAILED for $ARGUMENTS.

Issues to fix:
1. [Issue description]
2. [Issue description]

Retry count incremented.
Run: /nextai-implement $ARGUMENTS to address these issues.
```

The review phase is complete when review.md exists with a Verdict section containing PASS or FAIL.

## Review Loop

- Maximum 5 automatic retry cycles
- Track retry count via `nextai status $ARGUMENTS --retry-increment`
- Check current count via `nextai status $ARGUMENTS`
- After 5 failures, escalate:

```
⚠ Review failed 5 times for $ARGUMENTS.

Manual intervention required.
Please review:
- todo/$ARGUMENTS/review.md

Options:
1. Fix issues manually, then run: nextai repair $ARGUMENTS
2. Force complete: nextai complete $ARGUMENTS --force
```

## Review Philosophy

- Be thorough but fair
- Focus on correctness, not style preferences
- Only fail for real issues that affect functionality
- Provide actionable, specific feedback
- Don't nitpick working code
