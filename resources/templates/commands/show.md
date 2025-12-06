---
description: Show detailed status of a specific feature
---

# NextAI Show: $ARGUMENTS

Display detailed information about a feature.

## Run Command

```bash
nextai show $ARGUMENTS
```

If `$ARGUMENTS` is not provided, ask: "Which feature? Run /nextai-list to see all."

## Display Results

Present the feature details clearly:

```
Feature: $ARGUMENTS
══════════════════════════════════════════════════════════

Type:    feature
Phase:   implementation
Created: 2024-12-06 10:30:00

Artifacts:
  ✓ planning/initialization.md
  ✓ planning/requirements.md
  ✓ spec.md
  ✓ tasks.md (3/5 complete)
  ○ review.md
  ○ testing.md

Recent History:
  2024-12-06 14:20 - Task 3 completed
  2024-12-06 12:15 - Implementation started
  2024-12-06 10:45 - Tech spec approved
  2024-12-06 10:30 - Created

══════════════════════════════════════════════════════════
```

## Suggest Next Action

Based on the current phase:
- `created` → "Next: /nextai-refine $ARGUMENTS"
- `product_refinement` → "In progress: Answering refinement questions"
- `tech_spec` → "In progress: Writing technical spec"
- `implementation` → "Next: Complete remaining tasks, then /nextai-review $ARGUMENTS"
- `review` → "Next: /nextai-testing $ARGUMENTS (if PASS) or /nextai-implement (if FAIL)"
- `testing` → "Next: /nextai-complete $ARGUMENTS (if PASS)"
- `complete` → "This feature is archived in done/$ARGUMENTS/"
