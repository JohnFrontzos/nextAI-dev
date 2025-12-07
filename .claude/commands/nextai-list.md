---
description: List all features and their current phases
---

Use the Skill tool to load NextAI skills when needed.

# NextAI List

Show all features being tracked by NextAI.

## Run Command

```bash
nextai list
```

## Display Results

Present the output in a clear format:

```
Features:
─────────────────────────────────────────────────────────
ID                              Phase              Type
─────────────────────────────────────────────────────────
20251206_add-user-auth          implementation     feature
20251205_fix-login-bug          review             bug
20251204_refactor-api           complete           task
─────────────────────────────────────────────────────────
```

## Optional Filters

If the operator asks for specific items:
- "Show features in review" → `nextai list --phase review`
- "Show only bugs" → `nextai list --type bug`
- "Show active work" → `nextai list --active` (excludes complete)

## Helpful Follow-ups

Based on the list, suggest:
- If there's work in progress: "Continue with /nextai-resume <id>"
- If items are stuck: "Check status with /nextai-show <id>"
- If nothing exists: "Create something with /nextai-create"
