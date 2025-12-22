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
| `resources.ts` | Auto-discovery of package resources with change tracking |
| `version.ts` | Version comparison and tracking |
| `client-selection.ts` | Interactive client selection |

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

The sync system operates with automatic resource management:

**Stage 1: Resource Update (.nextai/ is always synced from package)**
```
package resources/               .nextai/
├── agents/*.md          ──►     ├── agents/*.md
├── skills/*/SKILL.md    ──►     ├── skills/*/SKILL.md
└── templates/commands/  ──►     └── templates/commands/*.md
```

Resources are auto-discovered by scanning the package directory:
- Agents: All `.md` files in `resources/agents/`
- Skills: All directories containing `SKILL.md` in `resources/skills/`
- Commands: All `.md` files in `resources/templates/commands/`

Change tracking distinguishes:
- New resources (added to package)
- Updated resources (content changed)
- Unchanged resources (identical)
- Removed resources (no longer in package)

**Stage 2: Client Sync (user-space directories)**
```
.nextai/                          .claude/ (or .opencode/)
├── agents/*.md          ──►      ├── agents/*.md
├── skills/*/SKILL.md    ──►      ├── skills/*/SKILL.md
└── templates/commands/  ──►      └── commands/nextai-*.md
```

**Directory Ownership:**
- `.nextai/` - Framework-controlled (always updated from package)
- `.claude/`, `.opencode/` - User-space (respects force flag for overwrites)

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

### Auto-Discovery Pattern

Resources (agents, skills, commands) are automatically discovered by scanning the package directory rather than using hardcoded manifests. This design choice:
- Eliminates maintenance burden (no manifest to update when adding files)
- Prevents missing files (all `.md` files are automatically included)
- Enables change tracking (new/updated/unchanged/removed detection)
- Separates concerns (framework-controlled `.nextai/` vs user-space `.claude/`)

The `scanResourcesFromPackage()` function in `src/core/sync/resources.ts` implements this pattern:
- Scans `resources/agents/` for all `.md` files
- Scans `resources/skills/` for directories containing `SKILL.md`
- Scans `resources/templates/commands/` for all `.md` files
- Returns a complete manifest without requiring manual updates

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

Sync adapters transform NextAI resources for each supported AI client:
- Claude Code: `.claude/commands/`, `.claude/agents/`, `.claude/skills/`
- OpenCode: `.opencode/command/`, `.opencode/agent/`

### Explicit Skill Loading

Subagents must explicitly load their assigned skills via the Skill tool. Agent frontmatter `skills:` fields serve as documentation, but Claude Code does not automatically load them when spawning subagents via the Task tool.

**Implementation Pattern:**

Command templates instruct subagents to load skills as their first action:

```markdown
FIRST ACTION - Load Your Skill:
Before starting work, you MUST load your assigned skill:
1. Use the Skill tool: Skill("[skill-name]")
2. This skill provides [description]
3. Follow the skill's guidance throughout your work
```

**Agent-Skill Mappings:**
- developer → executing-plans
- product-owner → refinement-questions
- technical-architect → refinement-spec-writer
- reviewer → reviewer-checklist
- document-writer → documentation-recaps
- investigator → root-cause-tracing, systematic-debugging, testing-investigator

This ensures subagents have access to their specialized skill instructions, improving output quality and consistency.

**Note:** Skills are stored at `.claude/skills/` (root level) not in subdirectories. Claude Code only discovers skills that are direct children of the skills directory.

## Type-Specific Workflows

NextAI supports three feature types, each with a specialized workflow optimized for its needs.

### Feature Workflow (7 phases)

Full-featured development workflow for new functionality:
```
created → product_refinement → tech_spec → implementation → review → testing → complete
```

- **Product Refinement**: Product Owner gathers requirements via Q&A
- **Tech Spec**: Technical Architect documents specification and tasks
- **Testing**: Comprehensive validation of feature behavior

### Bug Workflow (8 phases)

Streamlined workflow for bug fixes, starting with root cause investigation:
```
created → bug_investigation → product_refinement → tech_spec → implementation → review → testing → complete
```

- **Bug Investigation**: Investigator analyzes root cause (no product requirements needed)
- **Testing**: Regression testing to ensure bug doesn't recur
- **Skips redundant steps**: No lengthy product refinement, focuses on fixing the issue

### Task Workflow (6 phases)

Minimal workflow for implementation-only work (no new features or requirements gathering):
```
created → tech_spec → implementation → review → testing → complete
```

- **Direct to Spec**: No product refinement phase (tasks are already defined)
- **Lighter Validation**: Appropriate for smaller, scoped work
- **Same Task Completion**: 100% completion required like all types

### Type-Specific Validation

**BugInvestigationValidator** (Bug only)
- Requires `planning/investigation.md` with root cause analysis
- Ensures bugs are properly understood before fixing

**BugTestingValidator** (Bug only)
- Focuses regression testing documentation
- Ensures fixed bugs don't recur

**TaskTestingValidator** (Task only)
- Lighter testing requirements appropriate for task scope
- Still requires passing test session

**Standard Validators (All Types)**
- **TechSpecValidator**: ALL types require spec.md + tasks.md (no special cases)
- **ImplementationValidator**: 100% task completion required for ALL types

This type-aware validation eliminates unnecessary friction while maintaining quality standards.

<!-- Updated: 2025-12-22 by NextAI - Added type-specific workflows section documenting feature, bug, and task workflows -->

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
<!-- Updated: 2025-12-22 - Added sync module files and documented two-stage sync flow with resource update behavior -->
<!-- Updated: 2025-12-22 by NextAI - Added type-specific workflows section documenting feature, bug, and task workflows -->
<!-- Updated: 2025-12-22 by NextAI - Added auto-discovery pattern section, updated sync flow with change tracking and directory ownership model -->
