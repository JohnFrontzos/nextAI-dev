# Feature: Update agent templates

## Original Request
Create separate agent and skill templates for Claude Code and OpenCode platforms with proper frontmatter formats. The current templates in `resources/` need to be updated to support both platforms with their specific requirements.

## Type
feature

## Initial Context

### Attachments
Official documentation has been added to the reference folder:
- `attachments/reference/claude_agent.md` - Claude Code agent template documentation
- `attachments/reference/opencode_agents.mdx` - OpenCode agents documentation
- `attachments/reference/opencode_skills.mdx` - OpenCode skills documentation

---

## Agent Templates

### Claude Code Agent Format
Location: `.claude/agents/<name>.md`

```markdown
---
name: your-sub-agent-name
description: Description of when this subagent should be invoked
tools: tool1, tool2, tool3  # Optional - inherits all tools if omitted
model: sonnet  # Optional - specify model alias or 'inherit'
permissionMode: default  # Optional - permission mode for the subagent
skills: skill1, skill2  # Optional - skills to auto-load
---

Your subagent's system prompt goes here...
```

### OpenCode Agent Format
Location: `.opencode/agent/<name>.md`

```markdown
---
description: Description of when this agent should be used
mode: subagent  # Optional: primary, subagent, or all (default)
model: provider/model-id  # Optional
temperature: 0.3  # Optional: 0.0-1.0
maxSteps: 10  # Optional: max agentic iterations
tools:
  write: false
  edit: false
  bash: true
permission:
  edit: deny
  bash:
    "git *": allow
    "*": ask
---

Your agent's system prompt goes here...
```

### Agent Field Comparison
| Field | Claude Code | OpenCode |
|-------|-------------|----------|
| name | Required (string) | Not used (filename = name) |
| description | Required | Required |
| tools | Optional (comma-sep list) | Optional (object with bool/patterns) |
| model | Optional (alias) | Optional (provider/model-id format) |
| permissionMode | Optional | Not used |
| skills | Optional (comma-sep list) | Not used (uses skill tool) |
| mode | Not used | Optional (primary/subagent/all) |
| temperature | Not used | Optional (0.0-1.0) |
| maxSteps | Not used | Optional |
| permission | Not used | Optional (object with patterns) |
| disable | Not used | Optional (bool) |

---

## Skill Templates

### Claude Code Skill Format
Location: `.claude/skills/<skill-name>/SKILL.md`

```markdown
---
name: skill-name
description: Brief description of what this skill does
---

## Purpose
What this skill is for...

## Instructions
How to use this skill...
```

**How skills are loaded in Claude Code:**
- Via agent frontmatter: `skills: skill1, skill2`
- Via tool invocation: `Skill("skill-name")`

### OpenCode Skill Format
Location: `.opencode/skill/<skill-name>/SKILL.md`

```markdown
---
name: skill-name
description: Brief description (1-1024 chars)
license: MIT  # Optional
compatibility: opencode  # Optional
metadata:  # Optional
  audience: developers
  workflow: github
---

## What I do
- Action 1
- Action 2

## When to use me
Use this when...
```

**How skills are loaded in OpenCode:**
- Automatically discovered and listed in `<available_skills>` section
- Agent loads via tool: `skill({ name: "skill-name" })`
- OpenCode also supports Claude-compatible path: `.claude/skills/<name>/SKILL.md`

### Skill Field Comparison
| Field | Claude Code | OpenCode |
|-------|-------------|----------|
| name | Required | Required (must match folder name) |
| description | Required | Required (1-1024 chars) |
| license | Not used | Optional |
| compatibility | Not used | Optional |
| metadata | Not used | Optional (string-to-string map) |

### Skill Name Rules (OpenCode)
- 1-64 characters
- Lowercase alphanumeric with single hyphen separators
- No leading/trailing hyphens
- No consecutive `--`
- Regex: `^[a-z0-9]+(-[a-z0-9]+)*$`

---

## Current Files to Update

### Agents (`resources/agents/`)
- ai-team-lead.md
- developer.md
- document-writer.md
- investigator.md
- product-owner.md
- reviewer.md
- technical-architect.md

### Skills (`resources/skills/`)
- documentation-recaps/SKILL.md
- executing-plans/SKILL.md
- refinement-product-requirements/SKILL.md
- refinement-technical-specs/SKILL.md
- reviewer-checklist/SKILL.md
- root-cause-tracing/SKILL.md
- systematic-debugging/SKILL.md
- testing-investigator/SKILL.md

---

## Acceptance Criteria
- [ ] Create agent template for Claude Code with full frontmatter support
- [ ] Create agent template for OpenCode with its frontmatter options
- [ ] Create skill template for Claude Code
- [ ] Create skill template for OpenCode with validation rules
- [ ] Update sync process to generate platform-specific agent files
- [ ] Update sync process to generate platform-specific skill files
- [ ] Ensure OpenCode skills follow name validation rules

## Notes
- OpenCode agents: `.opencode/agent/` directory
- Claude Code agents: `.claude/agents/` directory
- OpenCode skills: `.opencode/skill/<name>/SKILL.md`
- Claude Code skills: `.claude/skills/<name>/SKILL.md`
- OpenCode can read Claude-compatible skill paths
