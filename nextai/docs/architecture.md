# Architecture

## System Overview

NextAI is a **"Generate + Delegate"** workflow orchestrator. It manages feature lifecycle state while delegating all AI work to the user's existing AI coding assistant (Claude Code, OpenCode). No API keys required.

```
┌─────────────────────────────────────────────────────────────┐
│                    User's AI Client                          │
│                (Claude Code / OpenCode)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              NextAI Slash Commands                    │   │
│  │         /nextai-create, /nextai-refine, etc.          │   │
│  └─────────────────────┬────────────────────────────────┘   │
│                        │                                     │
│  ┌─────────────────────▼────────────────────────────────┐   │
│  │              NextAI Agents & Skills                   │   │
│  │       Product Owner, Developer, Reviewer, etc.        │   │
│  └─────────────────────┬────────────────────────────────┘   │
└────────────────────────┼────────────────────────────────────┘
                         │
    ┌────────────────────▼────────────────────────────────────┐
    │                   NextAI CLI                             │
    │           (State Management & Scaffolding)               │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
    │  │    Ledger    │  │   History    │  │  Scaffolding │   │
    │  │ (features)   │  │ (audit log)  │  │  (folders)   │   │
    │  └──────────────┘  └──────────────┘  └──────────────┘   │
    └─────────────────────────────────────────────────────────┘
```

## Core Components

### CLI (`src/cli/`)

Entry point and command handlers for the `nextai` CLI tool.

| File | Purpose |
|------|---------|
| `index.ts` | Commander.js program setup, command registration |
| `commands/init.ts` | Project initialization |
| `commands/create.ts` | Create new features/bugs/tasks |
| `commands/sync.ts` | Sync to AI clients |
| `commands/advance.ts` | Advance feature phase |
| `commands/list.ts` | List features |
| `commands/show.ts` | Show feature details |
| `commands/resume.ts` | Smart continuation |
| `commands/remove.ts` | Remove unwanted features |
| `commands/repair.ts` | State repair utilities |
| `commands/testing.ts` | Log test results |
| `commands/complete.ts` | Archive completed features |
| `commands/status.ts` | Update feature status |

### Core (`src/core/`)

Business logic for state management, scaffolding, sync, and validation.

#### State (`src/core/state/`)

| File | Purpose |
|------|---------|
| `ledger.ts` | Feature CRUD, phase transitions with validation, removal |
| `history.ts` | Audit logging (JSONL format) |

#### Scaffolding (`src/core/scaffolding/`)

| File | Purpose |
|------|---------|
| `project.ts` | Initialize `.nextai/` and `nextai/` directories |
| `feature.ts` | Create feature folders with planning structure |

#### Sync (`src/core/sync/`)

| File | Purpose |
|------|---------|
| `base.ts` | Abstract base class for client configurators |
| `claude-code.ts` | Claude Code integration (`.claude/`) |
| `opencode.ts` | OpenCode integration (`.opencode/`) |
| `transformers/agent.ts` | Agent template format conversions |
| `transformers/skill.ts` | Skill validation and embedding |
| `transformers/skill-embedder.ts` | Skill placeholder replacement |

#### Validation (`src/core/validation/`)

| File | Purpose |
|------|---------|
| `phase-validators.ts` | Artifact validators per phase |
| `phase-detection.ts` | Detect current phase from artifacts |

### Schemas (`src/schemas/`)

Zod schemas for runtime validation.

| Schema | Data Structure |
|--------|----------------|
| `ledger.ts` | Features, phases, transitions |
| `config.ts` | Project configuration |
| `profile.ts` | Project identity |
| `session.ts` | Current session info |
| `history.ts` | History log entries |
| `agent.ts` | Agent definitions |
| `validation.ts` | Validation results |

### Types (`src/types/`)

TypeScript type definitions for templates and transformers.

| File | Type Definitions |
|------|------------------|
| `templates.ts` | Base format, Claude Code format, OpenCode format for agents and skills |

## Data Flow

### Feature Lifecycle

```
1. User: /nextai-create "Add user auth"
   └─► CLI creates folder, ledger entry, initialization.md
       └─► Phase: created

2. User: /nextai-refine <id>
   └─► Product Owner agent asks questions
       └─► Phase: product_refinement
   └─► Technical Architect writes spec.md, tasks.md, testing.md
       └─► Phase: tech_spec

3. User: /nextai-implement <id>
   └─► Developer agent implements tasks
       └─► Phase: implementation

4. User: /nextai-review <id>
   └─► Reviewer agent validates against spec
       └─► Phase: review (PASS → testing, FAIL → implementation)

5. User: /nextai-testing <id>
   └─► User logs manual test results to testing.md
       └─► Quick PASS mode or detailed FAIL mode with investigation
       └─► Phase: testing (PASS → complete, FAIL → implementation)

6. User: /nextai-complete <id>
   └─► Document Writer generates summary
   └─► Feature archived to nextai/done/
       └─► Phase: complete

7. User: /nextai-remove <id> (optional - for unwanted features)
   └─► Confirms removal
   └─► Feature moved to nextai/removed/
   └─► Ledger entry removed
   └─► History logged (feature_removed event)
```

### Sync Flow

```
resources/                        .nextai/                         .claude/ (or .opencode/)
├── agents/*.md          ──►      ├── agents/*.md         ──►      ├── agents/*.md (transformed + embedded skills)
├── skills/*/SKILL.md    ──►      ├── skills/*/SKILL.md   ──►      ├── skills/*/SKILL.md
└── templates/commands/  ──►      └── templates/commands/ ──►      └── commands/nextai-*.md (embedded skills)
```

The sync pipeline performs two transformations:

1. **Template Transformation** - Converts base format (resources/) to platform-specific format
2. **Skill Embedding** - Embeds skill content at skill placeholder locations

During sync, agents and commands with skill placeholders have those skills embedded directly into their content. This ensures subagents always have access to their methodology skills without runtime dependencies.

### Template Transformation System

<!-- Updated: 2025-12-24 by NextAI -->

NextAI uses a canonical base format in `resources/` as the single source of truth for agents and skills. Platform-specific transformers convert these templates to the optimal format for each AI client during sync operations.

**Architecture:**

```
Base Format (resources/agents/*.md)
  |
  ├──► Parser (parseBaseAgent)
  |      └─ Validates required fields (id, description, role, tools)
  |
  ├──► Claude Code Transformer (toClaudeAgent)
  |      ├─ id → name
  |      ├─ tools object → comma-separated string (capitalized)
  |      └─ skillDependencies → skills (comma-separated)
  |
  └──► OpenCode Transformer (toOpenCodeAgent)
         ├─ role → mode
         ├─ tools → object format (preserved)
         └─ skillDependencies → omitted (uses Skill tool)
```

**Base Format Structure:**

```yaml
---
id: agent-name
description: Agent purpose
role: subagent | primary | all
tools:
  read: true
  write: true
  bash: false
skillDependencies:
  - skill-name-1
  - skill-name-2
---

Agent instructions content...
```

**Platform-Specific Outputs:**

| Attribute | Base Format | Claude Code | OpenCode |
|-----------|-------------|-------------|----------|
| Identity | `id` | `name` | filename |
| Agent role | `role` | omitted | `mode` |
| Tools | `{read: true}` | `"Read, Write"` | `{read: true}` |
| Skills | `skillDependencies` array | `skills` comma-separated | omitted |

**Transformer Modules:**

- `src/core/sync/transformers/agent.ts` - Agent format conversions
- `src/core/sync/transformers/skill.ts` - Skill validation and embedding
- `src/types/templates.ts` - TypeScript type definitions

**Error Handling:**

If parsing fails, the sync system falls back to legacy format (direct copy) with a console warning. This ensures sync operations never fail due to template format issues.

## Technology Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript (ES2022, ESM) |
| Runtime | Node.js >= 18.0.0 |
| CLI Framework | Commander.js |
| Schema Validation | Zod |
| Build | tsup (esbuild-based) |
| Testing | Vitest |
| Linting | ESLint with TypeScript plugin |
| Package Manager | npm |
| CI/CD | GitHub Actions |

## Key Design Decisions

### Generate + Delegate

NextAI generates prompts and manages state, but never calls AI APIs directly. The user's AI client handles all LLM interactions. This means:
- No API keys required
- Works with any AI subscription the user has
- No vendor lock-in

### Human-in-the-Loop

Phase transitions require human approval via validation gates:
- Required artifacts must exist
- Content must meet minimum requirements
- Previous phase must complete successfully
- `--force` bypasses (logged for audit)

### Artifact-Driven

Every phase produces reviewable outputs:
- `initialization.md` - Original request
- `requirements.md` - Product Q&A results
- `spec.md` - Technical specification
- `tasks.md` - Implementation checklist (code tasks only, no manual verification)
- `testing.md` - Manual test checklist and test sessions log (generated during refinement)
- `review.md` - Code review results
- `summary.md` - Completion summary

### Client-Agnostic

NextAI maintains a single source of truth in `resources/` using a canonical base format. Platform-specific transformers convert these templates to optimized formats for each AI client during sync:

- **Claude Code**: `.claude/commands/`, `.claude/agents/`, `.claude/skills/`
  - Tools as comma-separated strings
  - Skills as comma-separated strings
  - Agent name from `id` field

- **OpenCode**: `.opencode/command/`, `.opencode/agent/`
  - Tools as object format
  - Agent mode from `role` field
  - Skills loaded via Skill tool

This approach enables multi-platform support from a single template source, reducing maintenance overhead and ensuring consistency across platforms.

### Skill Loading Strategy

NextAI uses a dual approach to provide skills to subagents, balancing embedded methodology with context-specific workflows:

#### Embedded Skills (Sync-Time)

Agents can declare `skillDependencies` in their frontmatter to have methodology skills embedded directly during sync:

```yaml
---
id: investigator
skillDependencies: ["root-cause-tracing", "systematic-debugging"]
---
```

During `nextai sync`, the sync pipeline calls `embedSkillPlaceholders()` to replace skill placeholder comments with full skill content. This ensures methodology skills are always available without runtime loading.

**Embedded Skills by Agent:**
- investigator → root-cause-tracing, systematic-debugging (embedded at sync time)

#### Workflow Skills (Delegation-Time)

For context-specific workflow skills, command templates provide the skill content via delegation prompts:

```markdown
**Instructions for the investigator subagent:**

## Your Workflow

[Insert full content of .claude/skills/testing-investigator/SKILL.md here]
```

The `embedSkillPlaceholders()` function replaces these placeholders during command template sync.

**Workflow Skills by Context:**
- testing FAIL → testing-investigator (provided via delegation)

#### Runtime Skill Loading (Legacy)

Some agents still use explicit runtime loading via the Skill tool:

```markdown
FIRST ACTION - Load Your Skill:
Before starting work, you MUST load your assigned skill:
1. Use the Skill tool: Skill("[skill-name]")
```

**Runtime-Loaded Skills by Agent:**
- developer → executing-plans
- product-owner → refinement-product
- technical-architect → refinement-technical
- reviewer → reviewer-checklist
- document-writer → documentation-recaps

**Note:** Skills are stored at `.claude/skills/` (root level) not in subdirectories. Claude Code only discovers skills that are direct children of the skills directory.

### NextAI Guidelines Skill

For comprehensive information about NextAI's architecture, CLI usage, and best practices, agents can load the `nextai-guidelines` skill. This skill provides:

- CLI architecture and global command patterns
- Directory structure (`nextai/` vs `.nextai/`)
- Auto-managed files that should never be edited manually
- Slash command to CLI relationship
- Common pitfalls and best practices

This skill is particularly useful for agents working directly with NextAI state or when troubleshooting workflow issues.

## Spec Change Detection System

When a test fails during the testing phase, the system automatically analyzes whether the failure represents a bug or a specification change.

### Workflow

```
Test FAIL logged
  |
triggerInvestigator() invokes Investigator agent
  |
Agent analyzes: BUG or SPEC_CHANGE?
  |
+- BUG (≤70% confidence)
|  +- Return to implementation with investigation report
|
+- SPEC_CHANGE (>70% confidence)
   +- Prompt user (Yes/No/Cancel)
      +- Approve: Append to initialization.md + Reset to product_refinement
      +- Decline: Write investigation report + Return to implementation
      +- Cancel: Stay in testing, no changes
```

### Classification Criteria

**Spec Change Indicators:**
- Changes agreed-upon behavior/features described in spec.md
- Adds new functionality not in original spec.md
- Requires significant code changes

**Bug Indicators (Default):**
- Simple fixes (sort order, formatting)
- Restores original intended behavior from spec.md
- Single-line code changes
- Code doesn't match spec.md description

### Components

**Testing-Investigator Skill** (resources/skills/testing-investigator/SKILL.md)
- Phase 0: Classification step that precedes investigation
- Outputs: Classification, confidence, reasoning, spec change description

**Enhanced Testing Command** (src/cli/commands/testing.ts)
- triggerInvestigator() - Invokes agent with classification
- handleSpecChangeApproval() - Interactive user approval
- approveSpecChange() - Appends to initialization.md, resets phase
- declineSpecChange() - Treats as bug
- logSpecChangeMetrics() - Records decision

**Metrics** (nextai/metrics/spec-changes.jsonl)
- JSONL format tracking all spec change events
- Fields: timestamp, feature_id, failure_description, user_decision, original_phase
- Enables analysis of spec change frequency and patterns


## Version Management and Publishing

### Version-Aware Sync

The sync system tracks template versions and auto-updates client directories when running `nextai init` or `nextai sync`:

- **Version Tracking**: Each template (agents, skills, commands) is versioned in `package.json`
- **Auto-Update**: During sync, outdated templates are automatically updated to latest versions
- **Preservation**: User modifications are preserved where possible
- **Audit Trail**: Version updates are logged to history

This ensures that projects always have access to the latest improvements without manual intervention.

### CI/CD Pipeline

NextAI uses GitHub Actions for automated publishing:

```yaml
Trigger: Git tags matching v*.*.*
Steps:
  1. Checkout code
  2. Setup Node.js 20
  3. Install dependencies (npm ci)
  4. Run tests
  5. Build distribution
  6. Publish to npm with provenance
```

**Publishing Requirements:**
- Tests must pass
- Build must succeed
- npm token required (secrets.NPM_TOKEN)
- Provenance attestation enabled for supply chain security

**Package Details:**
- Name: `@frontztech/nextai-dev`
- Registry: npm public registry
- Access: Public
- Files: `dist/`, `bin/`, `resources/`

<!-- Updated: 2025-12-21 - Added testing.md to refinement outputs, updated /testing workflow, added testing-investigator skill -->
<!-- Updated: 2025-12-22 - Fixed agents directory path from agents/nextai/ to agents/ in sync flow and client-agnostic sections -->
<!-- Updated: 2025-12-23 - Added NextAI Guidelines Skill section documenting the new nextai-guidelines skill -->
<!-- Updated: 2025-12-24 - Documented skill embedding in sync pipeline and updated Skill Loading Strategy section to reflect embedded skills, workflow skills, and runtime skills -->
<!-- Updated: 2025-12-24 by NextAI - Added Template Transformation System section documenting the new base format and platform-specific transformers for multi-platform support -->
