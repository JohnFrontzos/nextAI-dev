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

## Step 2: Phase Validation

Check current phase AND artifact state:
1. Run: `nextai show $ARGUMENTS --json`
2. Parse the `phase` field from output
3. Read `nextai/todo/$ARGUMENTS/review.md` and verify PASS verdict (check for "## Verdict" section with "PASS")

**Phase handling:**

If phase is `review`:
- Normal start - verify review.md has PASS, then proceed to advance

If phase is `testing`:
- Resume mode - continue with testing workflow
- Log: "Resuming testing - checking previous test status..."
- Skip the start advance (ledger is already correct)

If phase is before `review` (`created`, `product_refinement`, `tech_spec`, `implementation`):
- Error and stop:
```
Error: Cannot run /nextai-testing - feature is at phase '[current_phase]'.

Required phase: review (with PASS verdict)

Run this command first:
  /nextai-review $ARGUMENTS
```

If phase is beyond `testing` (`complete`):
- Error and stop:
```
Error: Cannot run /nextai-testing - feature is already at phase 'complete'.

This phase has already been completed.

Suggested next command:
  /nextai-show $ARGUMENTS (to check status)
```

If phase is `review` but review.md is missing or has FAIL verdict:
- Error and stop:
```
Error: Review not passed.

Run /nextai-review $ARGUMENTS to complete review.
```

**IMPORTANT:** Both conditions must be met - ledger at `review` (or `testing` for resume) AND artifact shows PASS.

## Step 3: Advance Phase (Start)

**Only if phase was `review` (not resuming):**
Run: `nextai advance $ARGUMENTS --to testing --quiet`

This updates the ledger to reflect that testing is now in progress.

## Step 4: Gather Test Results

Ask the operator:
1. "Did the feature work as expected? (pass/fail)"
2. "What did you test? Any notes?"

## Step 5: Log Results

Run the CLI command with their input:

```bash
nextai testing $ARGUMENTS --status <pass|fail> --notes "<their notes>"
```

**Arguments:**
- `id` (required) - Feature ID

**Options:**
- `-s, --status <status>` (required) - Test status: pass or fail
- `-n, --notes <text>` - Test notes (optional, defaults to "Logged via CLI")
- `-a, --attachments <paths>` - Comma-separated paths to attachments

The CLI will:
- Create/update `nextai/todo/<id>/testing.md`
- Log the event to history

**Note:** The ledger was already advanced to `testing` in Step 3. The CLI command logs the test results without changing the phase.

## Step 6: Show Next Steps

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

## Attachments

If the operator has logs, screenshots, or other files to attach:

1. **Place files in the appropriate subfolder:**
   - Test failure logs → `attachments/evidence/`
   - Screenshots of failures → `attachments/evidence/`
   - Any reference docs → `attachments/reference/`

2. **Reference in command:** Use `--attachments` flag with relative paths

Example:
```bash
nextai testing $ARGUMENTS --status fail --notes "Build failed, see log" --attachments "attachments/evidence/build-error.log,attachments/evidence/failure-screenshot.png"
```

The attachments folder structure is created automatically when the feature is scaffolded:
```
attachments/
├── design/      ← UI mockups, visual designs
├── evidence/    ← Test failures, bug reproduction, logs
└── reference/   ← Docs, examples, external files
```

## Notes

- Testing is the human checkpoint — only the operator can mark this
- Keep notes concise but meaningful for future reference
- The testing.md file preserves the test history
- No retry limit for operator testing — test as many times as needed
