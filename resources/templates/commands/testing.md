---
description: Log manual test results for a feature
---

# NextAI Testing: $ARGUMENTS

You are helping the operator log their manual testing results.

## Context

The operator has implemented and reviewed a feature. Now they need to test it manually and record the results.

## Step 1: Verify Feature

If `$ARGUMENTS` is provided, use it as the feature ID.
If not, run `nextai list --phase review` to show features ready for testing, and ask which one.

## Step 2: Check Current State

Run:
```bash
nextai show $ARGUMENTS
```

Verify the feature is in `review` phase with a PASS verdict. If not, inform the operator:
- If still in `implementation` → "Run /nextai-review first"
- If review is FAIL → "Review failed. Run /nextai-implement to fix issues, then /nextai-review again"

## Step 3: Gather Test Results

Ask the operator:
1. "Did the feature work as expected? (pass/fail)"
2. "What did you test? Any notes?"

## Step 4: Log Results

Run the CLI command with their input:

```bash
nextai testing $ARGUMENTS --status <pass|fail> --notes "<their notes>"
```

The CLI will:
- Create/update `todo/<id>/testing.md`
- Update ledger phase to `testing`
- Log the event to history

## Step 5: Show Next Steps

**If PASS:**
```
✓ Testing logged: PASS

The feature is ready for completion.
Next: Run /nextai-complete $ARGUMENTS to archive this feature
```

**If FAIL:**
```
✓ Testing logged: FAIL

The feature needs more work.
Next: Run /nextai-implement $ARGUMENTS to address the issues
      Then: /nextai-review $ARGUMENTS
      Then: /nextai-testing $ARGUMENTS
```

## Notes

- Testing is the human checkpoint — only the operator can mark this
- Keep notes concise but meaningful for future reference
- The testing.md file preserves the test history
