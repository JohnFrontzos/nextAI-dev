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
| `commands/repair.ts` | State repair utilities |
| `commands/testing.ts` | Log test results |
| `commands/complete.ts` | Archive completed features |
| `commands/status.ts` | Update feature status |

### Core (`src/core/`)

Business logic for state management, scaffolding, sync, and validation.

#### State (`src/core/state/`)

| File | Purpose |
|------|---------|
| `ledger.ts` | Feature CRUD, phase transitions with validation |
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

## Data Flow

### Feature Lifecycle

```
1. User: /nextai-create "Add user auth"
   └─► CLI creates folder, ledger entry, initialization.md
       └─► Phase: created

2. User: /nextai-refine <id>
   └─► Product Owner agent asks questions
       └─► Phase: product_refinement
   └─► Technical Architect writes spec.md, tasks.md
       └─► Phase: tech_spec

3. User: /nextai-implement <id>
   └─► Developer agent implements tasks
       └─► Phase: implementation

4. User: /nextai-review <id>
   └─► Reviewer agent validates against spec
       └─► Phase: review (PASS → testing, FAIL → implementation)

5. User: /nextai-testing <id>
   └─► User logs manual test results
       └─► Phase: testing (PASS → complete, FAIL → implementation)

6. User: /nextai-complete <id>
   └─► Document Writer generates summary
   └─► Feature archived to nextai/done/
       └─► Phase: complete
```

### Sync Flow

```
.nextai/                          .claude/ (or .opencode/)
├── agents/*.md          ──►      ├── agents/nextai/*.md
├── skills/*/SKILL.md    ──►      ├── skills/nextai/*/SKILL.md
└── templates/commands/  ──►      └── commands/nextai-*.md
```

## Technology Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript (ES2022, ESM) |
| Runtime | Node.js >= 18.0.0 |
| CLI Framework | Commander.js |
| Schema Validation | Zod |
| Build | tsup (esbuild-based) |
| Testing | Vitest |
| Package Manager | npm |

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
- `tasks.md` - Implementation checklist
- `review.md` - Code review results
- `testing.md` - Test log
- `summary.md` - Completion summary

### Client-Agnostic

Sync adapters transform NextAI resources for each supported AI client:
- Claude Code: `.claude/commands/`, `.claude/agents/nextai/`, `.claude/skills/nextai/`
- OpenCode: `.opencode/command/`, `.opencode/agent/`
