---
description: Complete and archive a feature with AI-generated summary
---

# NextAI Complete: $ARGUMENTS

You are the NextAI Completion Orchestrator. Your task is to complete feature `$ARGUMENTS`, generate a summary, update documentation, and archive the feature.

## Session Context
Read `.nextai/state/session.json` for current timestamp.

## Pre-flight Checks

Before starting, verify all prerequisite phases are complete:
1. Verify `nextai/todo/$ARGUMENTS/spec.md` exists
2. Verify `nextai/todo/$ARGUMENTS/tasks.md` exists with all tasks checked
3. Verify `nextai/todo/$ARGUMENTS/review.md` exists with "## Verdict" containing "PASS"
4. Verify `nextai/todo/$ARGUMENTS/testing.md` exists with passing test results (check for "Status: pass" or "**Status:** pass")
5. Read the spec and review results for context

## Phase Validation

Check current phase AND artifact state:
1. Run: `nextai show $ARGUMENTS --json`
2. Parse the `phase` field from output
3. Read `nextai/todo/$ARGUMENTS/testing.md` and verify PASS status

**Phase handling:**

If phase is `testing`:
- Normal completion - verify testing.md has PASS status, then proceed

If phase is before `testing` (`created`, `product_refinement`, `tech_spec`, `implementation`, `review`):
- Error and stop:
```
Error: Cannot run /nextai-complete - feature is at phase '[current_phase]'.

Required phase: testing (with PASS status)

Run this command first:
  /nextai-testing $ARGUMENTS
```

If phase is `complete`:
- Error and stop:
```
Error: Feature already completed.

The feature has already been archived.

Check status with:
  /nextai-show $ARGUMENTS
```

If phase is `testing` but testing.md is missing or doesn't have PASS status:
- Error and stop:
```
Error: Testing not passed.

Run /nextai-testing $ARGUMENTS to log test results.
```

**IMPORTANT:** Both conditions must be met - ledger at `testing` AND artifact shows PASS.

## Advance Phase (On Completion Only)

This command does NOT advance on start - only on successful completion. The phase advances when the CLI `nextai complete` command is run at the end.

If any files are missing or incomplete:
```
Error: Feature not ready for completion.

Missing or incomplete:
- [list missing phases]

Complete required phases first:
- Run: /nextai-implement $ARGUMENTS (if tasks incomplete)
- Run: /nextai-review $ARGUMENTS (if review missing/failed)
- Run: /nextai-testing $ARGUMENTS (if testing missing)
```

## Completion Process

<DELEGATION_REQUIRED>
You MUST delegate this phase using the Task tool. DO NOT perform this work yourself.

Invoke the Task tool with:
- subagent_type: "document-writer"
- description: "Summary generation for $ARGUMENTS"
- prompt: Include ALL of the following context and instructions below
</DELEGATION_REQUIRED>

**Context to provide the document-writer subagent:**
- Feature ID: $ARGUMENTS
- All feature artifacts (listed below in Step 1)
- Output path for summary: `nextai/done/$ARGUMENTS/summary.md`
- Mode: **Complete Mode** (generate summary + update docs)

**Instructions for the document-writer subagent:**

FIRST ACTION - Load Your Skill:
Before generating the summary, you MUST load your assigned skill:
1. Use the Skill tool: Skill("documentation-recaps")
2. This skill provides summary writing patterns and documentation standards
3. Follow the skill's guidance throughout the summary generation

Then proceed with your workflow:

### Step 1: Read Feature Context

Read all feature artifacts:
- planning/initialization.md, planning/requirements.md
- spec.md, tasks.md, review.md, testing.md
- attachments/ folder (if exists)

### Step 2: Generate Summary

Follow the documentation-recaps skill (Complete Mode) to:
- Create summary.md in nextai/done/$ARGUMENTS/
- Document key changes and implementation highlights
- Capture attachment details before deletion
- Update changelog and history.md

### Step 3: Archive Feature

Run CLI command: `nextai complete $ARGUMENTS --skip-summary`

This moves files from todo/ to done/ and updates ledger.

**Wait for the document-writer subagent to complete before proceeding to Step 4.**

### Step 4: Update Project Documentation

<DELEGATION_REQUIRED>
You MUST delegate this step using the Task tool. DO NOT perform this work yourself.

Invoke the Task tool with:
- subagent_type: "document-writer"
- description: "Project documentation update for $ARGUMENTS"
- prompt: Include ALL of the following context and instructions below
</DELEGATION_REQUIRED>

**Context to provide the document-writer subagent:**
- Feature ID: $ARGUMENTS
- Mode: **Analyze Mode** (refresh project docs)
- Documentation location: `nextai/docs/`
- Context: Changes introduced by the completed feature

**Instructions for the document-writer subagent:**

FIRST ACTION - Load Your Skill:
Before updating documentation, you MUST load your assigned skill:
1. Use the Skill tool: Skill("documentation-recaps")
2. This skill provides documentation patterns and update best practices
3. Follow the skill's guidance for refreshing project docs

Then proceed with your workflow:

1. **Re-scan project** for any changes introduced by this feature:
   - New dependencies or technologies
   - New architectural patterns or components
   - New coding conventions
   - Structure changes

2. **Update relevant docs** in `nextai/docs/`:
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

**Wait for the document-writer subagent to complete before proceeding to Completion Message.**

## Completion Message

When done:

```
✓ Feature $ARGUMENTS completed!

Archive: nextai/done/$ARGUMENTS/
Summary: nextai/done/$ARGUMENTS/summary.md

Updated:
- Changelog
- nextai/docs/history.md
- nextai/docs/*.md (project documentation refreshed)
- Ledger: phase = complete

🎉 Congratulations on completing the feature!
```

## Documentation Principles

- Add signal, not noise
- One-line changelog entry is better than duplication
- `nextai/done/` folder is the authoritative history
- Main docs just reference it

## Minimal Mode

If documentation updates aren't needed (e.g., internal fix):
- Still create the summary
- Still archive artifacts
- Skip changelog/docs updates
- Note that docs weren't updated
