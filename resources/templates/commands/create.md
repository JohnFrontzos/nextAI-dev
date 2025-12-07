---
description: Create a new feature, bug, or task from your idea
---

# NextAI Create

You are helping the operator create a new feature, bug, or task in NextAI.

## Your Task

The operator wants to create a new item. They may provide:
- A detailed idea or proposal
- A brief description
- A bug report
- A task description

## Step 1: Understand the Request

If `$ARGUMENTS` is provided, use it as the initial idea.
If not, ask the operator: "What would you like to create? Describe your idea, bug, or task."

## Step 2: Determine Type

Based on the description, determine the type:
- **feature** — New functionality or capability
- **bug** — Something broken that needs fixing
- **task** — Refactoring, chores, documentation, etc.

If unclear, ask: "Is this a feature, bug, or task?"

## Step 3: Generate Title

Create a **short title (2-4 words max)** from the idea. This becomes the folder name, so keep it concise:

**Good examples:**
- "Add user auth"
- "Fix login timeout"
- "Refactor db queries"
- "Import archived features"

**Bad examples (too long):**
- "Add user authentication system" → use "Add user auth"
- "Import archived features from external frameworks" → use "Import archived features"

## Step 4: Run CLI Command

Execute the CLI command to scaffold the feature:

```bash
nextai create "<title>" --type <type> --description "<description>"
```

**Arguments:**
- `title` (required) - Feature title

**Options:**
- `--type <type>` - Type: feature, bug, task (default: "feature")
- `--description <text>` - Feature description (optional)
- `--external-id <id>` - External tracker ID (e.g., JIRA-123)

The CLI will output:
- Feature ID (format: `YYYYMMDD_slug-name`)
- Folder location (`nextai/todo/<id>/`)
- Path to initialization file

## Step 5: Fill Initialization Document

Read the created `nextai/todo/<id>/planning/initialization.md` file and update it with the operator's full idea/proposal.

The initialization.md should contain:
```markdown
# Feature: <title>

## Original Request
<The operator's full idea/proposal as they described it>

## Type
<feature|bug|task>

## Initial Context
<Any additional context, constraints, or goals mentioned>

## Attachments
<List any files provided, stored in attachments/ folder>
- Design: attachments/design/<filename>
- Evidence: attachments/evidence/<filename>
- Reference: attachments/reference/<filename>
```

## Attachment Guidance

If the operator provides files (screenshots, logs, docs):

1. **Design files** (mockups, wireframes, UI screenshots):
   → Place in `nextai/todo/<id>/attachments/design/`

2. **Evidence files** (error logs, stack traces, reproduction screenshots):
   → Place in `nextai/todo/<id>/attachments/evidence/`

3. **Reference files** (docs, examples, external files):
   → Place in `nextai/todo/<id>/attachments/reference/`

List them in the initialization.md under ## Attachments.

## Step 6: Confirm Creation

Output:
```
✓ Created: <id>
  Type: <type>
  Folder: nextai/todo/<id>/

Your idea has been captured in planning/initialization.md

Next: Run /nextai-refine <id> to start the refinement process
```

## Notes

- The CLI handles ID generation, folder scaffolding, and ledger updates
- Your job is to capture the operator's idea properly and fill the initialization document
- Don't ask too many questions at this stage — refinement comes later
