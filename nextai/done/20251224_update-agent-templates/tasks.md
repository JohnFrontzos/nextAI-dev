# Implementation Tasks

## Pre-Implementation
- [x] Review platform documentation in `attachments/reference/`
- [x] Create feature branch from main

## Core Implementation

### 1. Create Types
- [x] Create `src/types/templates.ts`
  - [x] Define `BaseAgentFrontmatter` interface
  - [x] Define `BaseSkillFrontmatter` interface
  - [x] Define `ClaudeAgentFrontmatter` interface
  - [x] Define `OpenCodeAgentFrontmatter` interface

### 2. Create Agent Transformers
- [x] Create `src/core/sync/transformers/agent.ts`
- [x] Implement `parseBaseAgent()` function
  - [x] Parse YAML frontmatter
  - [x] Extract content section
  - [x] Validate required fields
- [x] Implement `toClaudeAgent()` function
  - [x] Convert tools object to comma-separated list
  - [x] Capitalize tool names (read -> Read)
  - [x] Convert skillDependencies to skills string
  - [x] Format with Claude frontmatter
- [x] Implement `toOpenCodeAgent()` function
  - [x] Map role to mode field
  - [x] Keep tools as object format
  - [x] Omit skillDependencies (OpenCode uses skill tool)
  - [x] Format with OpenCode frontmatter

### 3. Create Skill Validators
- [x] Create `src/core/sync/transformers/skill.ts`
- [x] Implement `parseBaseSkill()` function
- [x] Implement `validateSkillName()` function
  - [x] Check length (1-64 chars)
  - [x] Check lowercase alphanumeric with hyphens
  - [x] Check no leading/trailing hyphens
  - [x] Check no consecutive hyphens
  - [x] Return array of warnings

### 4. Update Sync Logic
- [x] Update `src/core/sync/claude-code.ts`
  - [x] Import transformers
  - [x] Parse base format and transform to Claude format
  - [x] Write agents to `.claude/agents/`
  - [x] Skills remain in `.claude/skills/`
  - [x] Add warning log for legacy fallback
- [x] Update `src/core/sync/opencode.ts`
  - [x] Import transformers
  - [x] Parse base format and transform to OpenCode format
  - [x] Write agents to `.opencode/agent/` (without nextai- prefix per spec)
  - [x] syncSkills returns empty array (OpenCode reads from .claude/skills/)
  - [x] Add warning log for legacy fallback

### 5. Migrate Existing Agents
- [x] Convert agents to new base format:
  - [x] `product-owner.md`
  - [x] `technical-architect.md`
  - [x] `developer.md`
  - [x] `reviewer.md`
  - [x] `investigator.md`
  - [x] `document-writer.md`
  - [x] `ai-team-lead.md`

### 6. Update Existing Skills (if needed)
- [ ] Review skills in `resources/skills/` (deferred - skills working as-is)
- [ ] Ensure all have `name` and `description` in frontmatter
- [ ] Validate skill names against OpenCode rules
- [ ] Fix any non-compliant names

### 7. Error Handling
- [x] Add try-catch in sync functions
- [x] Fallback to legacy format on parse errors
- [x] Continue processing on individual file errors
- [x] Add console.warn for fallback usage

## Unit Tests
- [ ] Create `tests/unit/core/sync/transformers/agent.test.ts` (deferred)
- [ ] Create `tests/unit/core/sync/transformers/skill.test.ts` (deferred)

## Verification
- [x] Build passes
- [x] Sync command works
- [x] Claude Code agents have correct frontmatter format

## Review Fixes (Retry 1)
- [x] Fix OpenCode syncSkills to return empty (per spec: reads from .claude/skills/)
- [x] Create skill.ts transformer with parseBaseSkill and validateSkillName
- [x] Fix OpenCode agent filenames (removed nextai- prefix per spec)
- [x] Add warning logs for legacy fallback usage
