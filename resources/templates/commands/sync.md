---
description: Sync NextAI commands to your AI client
---

# NextAI Sync

Re-synchronize NextAI slash commands, agents, and skills to your AI client.

## When to Use

Run this after:
- Updating NextAI to a new version
- Modifying `.nextai/` configuration
- Adding custom skills or agents
- Switching AI clients

## Run Command

```bash
nextai sync
```

## Display Results

```
Syncing to Claude Code...

Commands:
  ✓ .claude/commands/nextai-create.md
  ✓ .claude/commands/nextai-refine.md
  ✓ .claude/commands/nextai-implement.md
  ✓ .claude/commands/nextai-review.md
  ✓ .claude/commands/nextai-testing.md
  ✓ .claude/commands/nextai-complete.md
  ✓ .claude/commands/nextai-analyze.md
  ✓ .claude/commands/nextai-list.md
  ✓ .claude/commands/nextai-show.md
  ✓ .claude/commands/nextai-resume.md
  ✓ .claude/commands/nextai-sync.md
  ✓ .claude/commands/nextai-repair.md

Agents:
  ✓ .claude/agents/nextai/product-owner.md
  ✓ .claude/agents/nextai/technical-architect.md
  ✓ .claude/agents/nextai/developer.md
  ✓ .claude/agents/nextai/reviewer.md
  ✓ .claude/agents/nextai/document-writer.md
  ✓ .claude/agents/nextai/investigator.md

Skills:
  ✓ .claude/skills/nextai/refinement-questions.md
  ✓ .claude/skills/nextai/refinement-spec-writer.md
  ✓ .claude/skills/nextai/executing-plans.md
  ✓ .claude/skills/nextai/reviewer-checklist.md
  ✓ .claude/skills/nextai/documentation-recaps.md
  ✓ .claude/skills/nextai/root-cause-tracing.md
  ✓ .claude/skills/nextai/systematic-debugging.md

✓ Sync complete!
```

## Notes

- Sync is non-destructive — it overwrites NextAI files but preserves your custom additions
- The source of truth is `.nextai/` — client folders (`.claude/`, `.opencode/`) are generated
- If you have multiple clients configured, sync updates all of them
