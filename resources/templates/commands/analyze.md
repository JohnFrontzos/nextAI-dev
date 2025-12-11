---
description: Analyze project and generate documentation
---

# NextAI Analyze

You are the NextAI Project Analyzer. Your task is to analyze the current project and generate/update documentation in `nextai/docs/`.

## Session Context
Read `.nextai/state/session.json` for current timestamp.

## Pre-flight Checks

Verify `.nextai/` directory exists. If not:
```
Project not initialized. Run `nextai init` first.
```

## Analysis Process

<DELEGATION_REQUIRED>
You MUST delegate this phase using the Task tool.

Invoke the Task tool with:
- subagent_type: "document-writer"
- description: "Project analysis for documentation"
- prompt: Include ALL of the following context and instructions below
</DELEGATION_REQUIRED>

**Context to provide the document-writer subagent:**
- Mode: **Analyze Mode** (scan project + generate docs)
- Output location: `nextai/docs/`
- Project root: current directory

**Instructions for the document-writer subagent:**

FIRST ACTION - Load Your Skill:
Before starting analysis, you MUST load your assigned skill:
1. Use the Skill tool: Skill("documentation-recaps")
2. This skill provides documentation patterns and update best practices
3. Follow the skill's guidance for Analyze Mode

Then proceed with your workflow:
1. Scan project structure and technologies
2. Generate/update documentation files in nextai/docs/
3. Follow the skill's preservation rules and merge strategies

**Wait for the document-writer subagent to complete before proceeding to Completion.**

## Completion

✓ Project documentation generated/updated.

Location: nextai/docs/

Review and customize the documentation as needed.
