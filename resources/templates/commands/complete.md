---
description: Complete and archive a feature with AI-generated summary
---

# NextAI Complete: $ARGUMENTS

You are the NextAI Completion Orchestrator. Your task is to complete feature `$ARGUMENTS`, generate a summary, update documentation, and archive the feature.

## Session Context
Read `.nextai/state/session.json` for current timestamp.

## Pre-flight Checks

Before starting, verify all prerequisite phases are complete:
1. Verify `todo/$ARGUMENTS/spec.md` exists
2. Verify `todo/$ARGUMENTS/tasks.md` exists with all tasks checked
3. Verify `todo/$ARGUMENTS/review.md` exists with "## Verdict" containing "PASS"
4. Verify `todo/$ARGUMENTS/testing.md` exists with passing test results
5. Read the spec and review results for context

If any files are missing or incomplete:
```
Error: Feature not ready for completion.

Missing or incomplete:
- [list missing phases]

Complete required phases first:
- Run: /nextai-implement $ARGUMENTS (if tasks incomplete)
- Run: /nextai-review $ARGUMENTS (if review missing/failed)
- Run: nextai testing $ARGUMENTS (if testing missing)
```

## Completion Process

Use the **document-writer** subagent (or load the documentation-recaps skill) in **Complete Mode**.

### Step 1: Read Feature Context

Read all feature artifacts:
- `todo/$ARGUMENTS/planning/initialization.md`
- `todo/$ARGUMENTS/planning/requirements.md`
- `todo/$ARGUMENTS/spec.md`
- `todo/$ARGUMENTS/tasks.md`
- `todo/$ARGUMENTS/review.md`
- `todo/$ARGUMENTS/testing.md`
- `todo/$ARGUMENTS/attachments/` (check for any files)

### Step 1a: Document Attachments in Summary

Before generating the summary, review the `attachments/` folder:

1. **Design files** (`attachments/design/`):
   - Note any UI decisions or visual specifications
   - Describe mockups if they influenced implementation

2. **Evidence files** (`attachments/evidence/`):
   - Summarize error patterns from logs
   - Describe what screenshots showed (for bugs)

3. **Reference files** (`attachments/reference/`):
   - List external docs that were referenced
   - Note any important decisions from reference materials

Include these details in the summary's "Implementation Notes" section so the information survives attachment deletion.

### Step 2: Generate Summary

Create the summary file at `done/$ARGUMENTS/summary.md` (create the `done/$ARGUMENTS/` directory if it doesn't exist):

```markdown
# Feature Complete: [Title]

## Summary
[2-3 sentence description of what was built]

## Key Changes
- [Main capability added]
- [Files/components created or modified]
- [Dependencies added if any]

## Implementation Highlights
[Notable decisions, patterns used, or interesting solutions]

## Testing Notes
[How it was tested, any edge cases covered]

## Related Documentation
[Links to any updated docs]

## Completed
[Timestamp]
```

### Step 3: Update Documentation

**Changelog** - Append entry:
```markdown
## [Date] [Type]: [Title]
- Brief summary of what was added/changed
- [Full details](done/$ARGUMENTS/summary.md)
```

**docs/nextai/history.md** - Add row:
```markdown
| Date | Feature ID | Summary | Archive |
|------|------------|---------|---------|
| [Date] | $ARGUMENTS | [Brief] | [details](../../done/$ARGUMENTS/summary.md) |
```

**Other docs** - Only if significantly affected by the feature

### Step 4: Verify Summary Created

Ensure `done/$ARGUMENTS/summary.md` was created successfully. This file's existence is required for the next step.

**Do NOT manually move files from `todo/` to `done/`.** The CLI command in Step 5 will handle the file move automatically.

### Step 4a: Attachment Cleanup Warning

⚠️ **Note:** The `attachments/` folder will be deleted during archival to save space.

If any attachment files are critical for future reference:
1. Reference them in the summary (describe what they showed)
2. Copy important files elsewhere before running the archive command
3. Or embed small images directly in documentation

Files that will be deleted:
- `attachments/design/` - UI mockups, wireframes
- `attachments/evidence/` - Test logs, bug screenshots
- `attachments/reference/` - Reference docs, examples

### Step 5: Archive and Update Ledger (REQUIRED)

**CRITICAL:** Run this CLI command to archive the feature and update the ledger:

```bash
nextai complete $ARGUMENTS --skip-summary
```

This command:
- **Deletes** the `attachments/` folder (to reduce archive size)
- **Moves** the remaining `todo/$ARGUMENTS/` directory to `done/$ARGUMENTS/` (preserving your summary.md)
- Updates `.nextai/state/ledger.json` to set phase to `complete`
- Logs the completion event to history
- Deletes the `todo/$ARGUMENTS/` directory

**Do NOT skip this step.** Without it:
- Files will remain in `todo/` instead of `done/`
- The ledger will still show `testing` phase
- The workflow cannot finish

If the command fails with validation errors, you may use `--force` to bypass:
```bash
nextai complete $ARGUMENTS --skip-summary --force
```

### Step 6: Update Project Documentation

After archiving, run the **document-writer** subagent in **Analyze Mode** to refresh project documentation:

1. **Re-scan project** for any changes introduced by this feature:
   - New dependencies or technologies
   - New architectural patterns or components
   - New coding conventions
   - Structure changes

2. **Update relevant docs** in `docs/nextai/`:
   - `architecture.md` - if structure or patterns changed
   - `technical-guide.md` - if new setup steps or dependencies added
   - `conventions.md` - if new coding patterns introduced
   - `product-overview.md` - if new user-facing capabilities added

3. **Preservation rules**:
   - Never delete user-authored content
   - Merge new information with existing
   - Prefer appending over replacing
   - Mark updated sections with timestamp

Note: This is the same process as `/nextai-analyze` but runs automatically after feature completion.

## Completion Message

When done:

```
✓ Feature $ARGUMENTS completed!

Archive: done/$ARGUMENTS/
Summary: done/$ARGUMENTS/summary.md

Updated:
- Changelog
- docs/nextai/history.md
- docs/nextai/*.md (project documentation refreshed)
- Ledger: phase = complete

🎉 Congratulations on completing the feature!
```

## Documentation Principles

- Add signal, not noise
- One-line changelog entry is better than duplication
- `done/` folder is the authoritative history
- Main docs just reference it

## Minimal Mode

If documentation updates aren't needed (e.g., internal fix):
- Still create the summary
- Still archive artifacts
- Skip changelog/docs updates
- Note that docs weren't updated
