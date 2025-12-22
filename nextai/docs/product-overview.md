# Product Overview

## What It Does

NextAI Dev Framework adds specialized workflows for different types of work (features, bugs, tasks) to AI coding assistants. It transforms AI from a reactive tool into a predictable development partner by providing:

- **Type-appropriate workflows** - Features get full refinement, bugs start with investigation, tasks skip to specs
- **Specs before code** - Requirements are gathered and approved before implementation begins
- **Human checkpoints** - You approve phase transitions and verify results
- **Artifact trail** - Every phase produces reviewable documents
- **State management** - Features are tracked through their lifecycle

## The Problem It Solves

AI coding assistants are powerful but chaotic without structure:

| Problem | NextAI Solution |
|---------|-----------------|
| Ideas stay vague, specs incomplete | Product Owner agent asks clarifying questions |
| AI generates wrong code without context | Technical specifications provide implementation guidance |
| Developers waste time rewriting prompts | Reusable agents and skills encode best practices |
| No lifecycle management | Type-specific workflows with validation gates |
| Jira/Linear disconnected from execution | State lives alongside code in `nextai/` |
| Autonomous agents fail in messy repos | Human-in-the-loop by design |
| Wrong workflows force wrong artifacts | Type-specific validation and phases |

## Key Features

### Type-Specific Workflows

Different work types follow optimized workflows, reducing friction while maintaining quality:

**Features (7 phases)** - Full development workflow
```
created → product_refinement → tech_spec → implementation → review → testing → complete
```
Product Owner gathers requirements, Technical Architect writes specs, comprehensive testing.

**Bugs (8 phases)** - Investigation-first workflow
```
created → bug_investigation → product_refinement → tech_spec → implementation → review → testing → complete
```
Investigator analyzes root cause, focuses on regression testing, skips lengthy requirements.

**Tasks (6 phases)** - Implementation-only workflow
```
created → tech_spec → implementation → review → testing → complete
```
Skip product refinement, go straight to specs for already-scoped work, lighter testing validation.

### Intelligent Test Failure Analysis

When tests fail, the Investigator agent analyzes whether the failure represents a bug or a specification change:

- **Bug Detection**: Returns to implementation with detailed investigation report
- **Spec Change Detection**: Prompts user for approval (Yes/No/Cancel)
  - **Approve**: Appends change to initialization.md and restarts product refinement
  - **Decline**: Treats as bug, returns to implementation
  - **Cancel**: Stays in testing for manual decision

70% confidence threshold prevents false positives. All decisions are tracked in spec-changes.jsonl for insights.

### 7 Built-in Agents

| Agent | Role | Active During |
|-------|------|---------------|
| Product Owner | Requirements gathering via Q&A | Feature refinement |
| Technical Architect | Spec and task list writing | Refinement |
| Developer | Code implementation | Implementation |
| Reviewer | Code review against spec | Review |
| Document Writer | Summary and docs | Complete |
| Investigator | Bug analysis, root cause | Bug workflows |
| AI Team Lead | Orchestration | All phases |

### 8 Built-in Skills

| Skill | Purpose |
|-------|---------|
| `refinement-questions` | Structured product Q&A loop |
| `refinement-spec-writer` | Technical spec authoring (spec.md, tasks.md, testing.md) |
| `executing-plans` | Step-by-step task execution |
| `reviewer-checklist` | Code review validation |
| `documentation-recaps` | Changelog and docs updates |
| `testing-investigator` | Test failure investigation and reporting |
| `root-cause-tracing` | Backward bug tracing |
| `systematic-debugging` | 4-phase debugging framework |

### Generate + Delegate Architecture

NextAI never calls AI APIs directly:
- Generates slash commands that run in your AI client
- Your AI client handles all LLM interactions
- No API keys required
- Works with your existing Claude Code or OpenCode subscription

## User Flows

### Creating a New Feature

```
1. /nextai-create
   "I want to add password reset with email verification"

2. AI scaffolds feature folder:
   nextai/todo/20251208_add-password-reset/
   └── planning/initialization.md

3. Ledger updated with new feature
   Phase: created
```

### Refining a Feature

```
1. /nextai-refine 20251208_add-password-reset

2. Product Owner asks questions:
   - "What email service will you use?"
   - "How long should reset tokens be valid?"
   - "Should we rate-limit reset requests?"

3. You answer, AI captures in requirements.md
   Phase: product_refinement

4. Technical Architect writes spec.md, tasks.md, and testing.md
   Phase: tech_spec
```

### Implementing a Feature

```
1. /nextai-implement 20251208_add-password-reset

2. Developer agent works through tasks.md:
   - [ ] Create password reset endpoint
   - [ ] Add email sending service
   - [ ] Build reset form component
   - [ ] Add token validation logic

3. Tasks checked off as completed
   Phase: implementation
```

### Reviewing and Testing

```
1. /nextai-review 20251208_add-password-reset
   - AI validates code against spec
   - PASS → Phase: review
   - FAIL → Returns to implementation

2. /nextai-testing 20251208_add-password-reset
   - Quick PASS mode or detailed FAIL mode
   - Session logging with auto-numbered test sessions
   - Auto-checks attachments/evidence/ folder
   - FAIL triggers investigation report
   - PASS → Phase: testing
```

### Completing a Feature

```
1. /nextai-complete 20251208_add-password-reset

2. Document Writer generates summary.md

3. Feature archived:
   From: nextai/todo/20251208_add-password-reset/
   To:   nextai/done/20251208_add-password-reset/

4. History updated
   Phase: complete
```

### Removing Unwanted Features

```
1. /nextai-remove 20251208_obsolete-feature

2. Confirm removal (required)

3. Feature safely archived:
   From: nextai/todo/20251208_obsolete-feature/
   To:   nextai/removed/20251208_obsolete-feature/

4. Ledger entry removed, history logged
   Event: feature_removed
```

## Who It's For

**Solo builders and small teams** who want AI leverage without losing control:

- **Product-minded tech leads** - You steer the work, not write every line. You need structured refinement, architecture checks, and predictable checkpoints.

- **Cross-stack developers** - You ship code across unfamiliar stacks. You need detailed specs, scaffolding, and AI that fills gaps without breaking things.

## What NextAI Is Not

| NextAI Is | NextAI Is NOT |
|-----------|---------------|
| Type-specific workflows | A magic autonomous agent |
| A state manager for features | A replacement for your AI client |
| A framework YOU operate | A "set it and forget it" tool |
| Human-in-the-loop by design | Fully automated end-to-end |

## Supported AI Clients

| Client | Status | Integration |
|--------|--------|-------------|
| Claude Code | Supported | `.claude/` |
| OpenCode | Supported | `.opencode/` |
| Codex | Planned | - |

## Developer Experience

### Automatic Resource Management

NextAI eliminates manual resource tracking with auto-discovery:
- Add agents, skills, or commands to `resources/` - they're automatically discovered
- No manifest files to maintain
- Detailed sync output shows exactly what changed (new/updated/unchanged/removed)
- Clear distinction between framework-controlled (`.nextai/`) and user-space (`.claude/`) directories

### Improved Sync UX

The sync command provides clear, actionable feedback:
```
Syncing resources to .nextai/...
Commands: 13 (1 new, 2 updated)
Agents: 7 (no changes)
Skills: 8 (3 removed)
```

Users always know:
- What resources are being synced
- Which files are new vs updated
- Whether deprecated resources were removed
- Where files are being synced to

<!-- Updated: 2025-12-21 - Added testing.md to refinement outputs, updated /testing workflow with investigation, added testing-investigator skill -->
<!-- Updated: 2025-12-22 by NextAI - Added type-specific workflow descriptions to features section -->
<!-- Updated: 2025-12-22 by NextAI - Added developer experience section documenting auto-discovery and improved sync UX -->
