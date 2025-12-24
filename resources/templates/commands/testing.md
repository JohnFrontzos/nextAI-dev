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

Check if the operator provided `--status` in the command arguments:

**If --status was provided:**
- Use the provided status value (pass/fail)
- Use the provided --notes if available
- Skip conversational questions
- Proceed directly to Step 5

**If --status was NOT provided (conversational mode):**
- Ask: "Did the feature work as expected? (pass/fail)"
- If fail: Ask "What issues did you find? Please describe the failure."
- If pass: Ask "Any notes about what you tested?" (optional)

## Step 5: Log Results

### Quick Mode (status provided via CLI)

If the operator already provided --status:

**For PASS:**
```bash
nextai testing $ARGUMENTS --status pass --notes "<notes if provided>"
```

The CLI will:
- Auto-check attachments/evidence/ folder for files
- Create test session in testing.md
- Log session with PASS status
- Prepare for completion phase

**For FAIL:**
```bash
nextai testing $ARGUMENTS --status fail --notes "<failure description>"
```

The CLI will:
- Auto-check attachments/evidence/ folder for files
- Create test session in testing.md
- Log session with FAIL status
- Add investigation report section
- Return to implementation phase

### Conversational Mode (no status provided)

If you gathered test results in Step 4, run the appropriate command:

**For PASS:**
```bash
nextai testing $ARGUMENTS --status pass --notes "<what they tested>"
```

**For FAIL:**
```bash
nextai testing $ARGUMENTS --status fail --notes "<failure description from operator>"
```

### Attachments Auto-Check

The CLI automatically checks `attachments/evidence/` for files and includes them in the test session.

If the operator wants to manually specify attachments, use:
```bash
nextai testing $ARGUMENTS --status fail --notes "<notes>" --attachments "path1,path2"
```

### CLI Behavior Summary

The CLI will:
- Create/update `nextai/todo/<id>/testing.md` with session format
- Auto-increment session number (Session 1, Session 2, etc.)
- Include auto-detected or manually specified attachments
- For FAIL: Add investigation report section
- Update phase (PASS → stays in testing, FAIL → returns to implementation)

## Step 6: Show Next Steps

**If PASS:**
```
✓ Testing logged: PASS (Session N)

Test session recorded in testing.md.
The feature is ready for completion.

Next: Run /nextai-complete $ARGUMENTS to archive this feature
```

**If FAIL:**
```
✓ Testing logged: FAIL (Session N)

Test session recorded in testing.md.
Investigation report section added.

The feature has been returned to implementation phase.
```

<DELEGATION_REQUIRED>
You MUST delegate test failure investigation using the Task tool. DO NOT investigate yourself.

Invoke the Task tool with:
- subagent_type: "investigator"
- description: "Test failure investigation for $ARGUMENTS"
- prompt: Include ALL of the following context and instructions below
</DELEGATION_REQUIRED>

**Context to provide the investigator subagent:**
- Feature ID: $ARGUMENTS
- Test Session: `nextai/todo/$ARGUMENTS/testing.md` (most recent FAIL session)
- Evidence files in `attachments/evidence/` (auto-detected by CLI)
- Failure notes: [pass through operator's --notes value]
- Specification: `nextai/todo/$ARGUMENTS/spec.md`
- Implementation: `nextai/todo/$ARGUMENTS/tasks.md`

**Instructions for the investigator subagent:**

## Your Workflow

[Insert full content of .claude/skills/testing-investigator/SKILL.md here]

Now proceed with your task using the workflow above.

**Wait for the investigator subagent to complete before proceeding.**

After investigation completes, inform the user:
```
✓ Investigation complete

Investigation report has been written by investigator to testing.md.

Next steps:
1. Review the investigation report in testing.md
2. Address the issues identified in the report
3. Run /nextai-implement $ARGUMENTS to fix the issues
4. Then: /nextai-review $ARGUMENTS
5. Then: /nextai-testing $ARGUMENTS
```

**Investigation Report Note:**
- For FAIL sessions, an investigation report section is added to testing.md
- The investigator agent analyzes the failure and writes findings to the report
- Review the investigation findings before returning to implementation

## Attachments

The CLI automatically checks `attachments/evidence/` and includes any files found in the test session.

**Automatic Detection:**
- CLI scans `attachments/evidence/` before creating test session
- All files in this folder are automatically attached
- No need to manually specify with --attachments flag

**Manual Override:**
- Use `--attachments` flag to specify custom paths
- Useful for files outside evidence folder

Example (manual):
```bash
nextai testing $ARGUMENTS --status fail --notes "Build failed, see log" --attachments "attachments/evidence/build-error.log,attachments/reference/config.json"
```

**Attachments Folder Structure:**
```
attachments/
├── design/      ← UI mockups, visual designs
├── evidence/    ← Test failures, bug reproduction, logs (auto-checked)
└── reference/   ← Docs, examples, external files
```

**Best Practice:**
- Place test failure evidence in `attachments/evidence/` before running the testing command
- CLI will automatically detect and include them
- Files are referenced in testing.md for future reference

## Notes

- Testing is the human checkpoint — only the operator can mark this
- The testing.md file preserves full test session history
- Session numbers increment automatically (Session 1, Session 2, etc.)
- No retry limit for operator testing — test as many times as needed
- Investigation reports (for FAIL) will be enhanced in future updates
