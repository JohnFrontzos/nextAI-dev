# Technical Specification: Update Agent Templates

## Overview

Transform NextAI's agent and skill management to support multiple AI platforms (Claude Code and OpenCode) through a canonical base format with platform-specific transformers. This enables maintaining a single source of truth while generating platform-optimized templates.

## Requirements Summary

### Core Requirements
1. **Base Format**: Create NextAI canonical format for agents/skills in `resources/`
2. **Platform Transformers**: Implement Claude Code and OpenCode format transformers
3. **Model Inheritance**: Omit model field by default (both platforms support it)
4. **Sync Updates**: Parse base -> transform -> write to platform directories during sync
5. **Skill Validation**: Warn on non-compliant OpenCode skill names
6. **Migration**: Rename existing agents to `.old`, create new base format versions
7. **OpenCode Skills**: Generate only in `.claude/skills/` (OpenCode reads from there)

## Technical Approach

### Architecture

```
resources/                          # Source of truth (NextAI canonical format)
├── agents/
│   ├── product-owner.md           # Base format agent
│   └── technical-architect.md
└── skills/
    └── */SKILL.md                 # Base format skills

.claude/                            # Claude Code platform (project-local)
├── agents/
│   ├── product-owner.md           # Transformed for Claude Code
│   └── technical-architect.md
└── skills/
    └── */SKILL.md                 # Skills (also readable by OpenCode)

.opencode/                          # OpenCode platform (project-local)
└── agent/
    ├── product-owner.md           # Transformed for OpenCode
    └── technical-architect.md
```

### NextAI Canonical Base Format

**Agent Format** (`resources/agents/*.md`):
```markdown
---
id: agent-name
description: When to use this agent
role: subagent
tools:
  read: true
  write: true
  edit: true
  bash: true
  glob: true
  grep: true
skillDependencies:
  - skill-name
---

System prompt content here...
```

**Skill Format** (`resources/skills/*/SKILL.md`):
```markdown
---
name: skill-name
description: Brief description of what this skill does
---

Skill instructions here...
```

### Claude Code Output Format

**Agent** (`.claude/agents/*.md`):
```markdown
---
name: agent-name
description: When to use this agent
tools: Read, Write, Edit, Bash, Glob, Grep
skills: skill-name
---

System prompt content...
```

**Skill** (`.claude/skills/*/SKILL.md`):
```markdown
---
name: skill-name
description: Brief description
---

Skill instructions...
```

### OpenCode Output Format

**Agent** (`.opencode/agent/*.md`):
```markdown
---
description: When to use this agent
mode: subagent
tools:
  read: true
  write: true
  edit: true
  bash: true
  glob: true
  grep: true
---

System prompt content...
```

**Skills**: OpenCode reads from `.claude/skills/` path, so no separate generation needed.

## Implementation Details

### 1. Create Types (`src/types/templates.ts`)

```typescript
export interface BaseAgentFrontmatter {
  id: string;
  description: string;
  role: 'primary' | 'subagent' | 'all';
  tools: Record<string, boolean>;
  skillDependencies?: string[];
}

export interface BaseSkillFrontmatter {
  name: string;
  description: string;
}

export interface ClaudeAgentFrontmatter {
  name: string;
  description: string;
  tools: string;  // comma-separated, capitalized
  skills?: string;  // comma-separated
}

export interface OpenCodeAgentFrontmatter {
  description: string;
  mode: 'primary' | 'subagent' | 'all';
  tools: Record<string, boolean>;
}
```

### 2. Create Transformer Module (`src/core/sync/transformers/`)

**`agent.ts`**:
```typescript
export function toClaudeAgent(base: BaseAgentFrontmatter, content: string): string
export function toOpenCodeAgent(base: BaseAgentFrontmatter, content: string): string
export function parseBaseAgent(fileContent: string): { frontmatter: BaseAgentFrontmatter; content: string }
```

**`skill.ts`**:
```typescript
export function validateSkillName(name: string): string[]  // returns warnings
export function parseBaseSkill(fileContent: string): { frontmatter: BaseSkillFrontmatter; content: string }
```

### 3. Update Sync Logic (`src/core/sync/`)

Modify sync to:
1. Read base templates from `resources/agents/` and `resources/skills/`
2. Parse base format
3. Transform to platform-specific format
4. Write to `.claude/` and `.opencode/` directories

### 4. Migration Script

Create script to:
1. Rename existing `resources/agents/*.md` to `*.old`
2. Create new base format agents from old content

## API/Interface Changes

### New Exports

- `src/types/templates.ts` - Template type definitions
- `src/core/sync/transformers/agent.ts` - Agent transformers
- `src/core/sync/transformers/skill.ts` - Skill transformers

### Modified Functions

- `src/core/sync/index.ts` - Add transformation step
- `src/core/sync/claude.ts` - Write transformed Claude format
- `src/core/sync/opencode.ts` - Write transformed OpenCode format

## Data Model

No database changes. All changes are to file formats and sync logic.

## Security Considerations

1. **Path Validation**: Validate file paths to prevent directory traversal
2. **Overwrite Protection**: Backup files before migration (`.old` suffix)

## Error Handling

1. **Invalid YAML**: Log error, skip file, continue with others
2. **Missing required fields**: Log warning, use defaults where possible
3. **Non-compliant names**: Warn user, continue sync
4. **Write failures**: Log error, provide manual instructions

## Existing Code to Leverage

1. `src/utils/md.ts` - Frontmatter parsing with gray-matter
2. `src/core/sync/claude.ts` - Claude sync patterns
3. `src/core/sync/opencode.ts` - OpenCode sync patterns

## Testing Strategy

### Unit Tests
- Test transformers with various input formats
- Test validation with compliant/non-compliant names
- Test error handling

### Integration Tests
- Test full sync flow
- Verify output formats match platform specs

### Manual Tests
- Sync to both platforms
- Verify skills/agents load correctly in each platform

## Alternatives Considered

1. **Platform-specific source files**: Rejected - harder to maintain dual sources
2. **Runtime transformation only**: Rejected - performance overhead on every load
3. **Symlinks**: Rejected - format differences prevent simple linking
