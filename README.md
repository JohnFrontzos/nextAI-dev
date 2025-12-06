<p align="center"><strong>NextAI Dev Framework</strong></p>
<p align="center">Spec-driven development workflow for AI coding assistants.</p>

# NextAI Dev Framework

NextAI Dev Framework is a spec-driven workflow for planning and executing software development with AI coding assistants. Instead of a magic autonomous agent, you get **structured phases, human checkpoints, and artifacts at every step**. No API keys required.

## Why NextAI?

AI coding assistants are powerful but chaotic without structure. They lose context, skip steps, and don't know when something is truly "done." NextAI adds a lightweight 7-phase workflow that keeps you in control while AI handles the heavy lifting.

Key outcomes:
- Specs are written and approved before implementation begins
- Human checkpoints at every phase transition
- Artifacts (requirements, specs, tasks, reviews) create an audit trail
- Works with the AI tools you already use: Claude Code, OpenCode

## How It Works

```
┌────────────────────┐
│ Create Feature     │  /nextai-create
│ (describe idea)    │
└────────┬───────────┘
         ▼
┌────────────────────┐
│ Refine Spec        │◀─────────────────┐
│ (Q&A with AI)      │                  │ more questions?
└────────┬───────────┘──────────────────┘
         │ spec approved
         ▼
┌────────────────────┐
│ Implement          │◀─────────────────┐
│ (AI writes code)   │                  │
└────────┬───────────┘                  │
         │ tasks complete               │ review/test failed
         ▼                              │
┌────────────────────┐                  │
│ Review & Test      │──────────────────┘
│ (AI + you)         │
└────────┬───────────┘
         │ pass
         ▼
┌────────────────────┐
│ Complete & Archive │  /nextai-complete
└────────────────────┘

1. Create a feature with your idea or proposal.
2. Refine the spec—AI asks questions, you answer until spec is approved.
3. Implement—AI codes, you monitor. Loop back if review/test fails.
4. Review & test—AI validates against spec, you verify manually.
5. Archive the completed feature with a summary.
```

## The Problem

AI can write code, analyze architecture, and generate tests—but today's tools treat these as **isolated tricks**, not part of a real development workflow.

- Ideas stay vague, specs are incomplete
- AI assistants generate wrong code when context is missing
- Developers waste time rewriting prompts, correcting output
- Tools like Claude Code edit well, but **don't manage the lifecycle**
- Jira/Linear manages tasks but is disconnected from AI execution
- Fully autonomous agents fall apart in messy, real-world repos

**We have powerful ingredients but no recipe.**

---

## What NextAI Is

NextAI is the **workflow layer that AI coding tools are missing**—it turns AI from a reactive assistant into a predictable development partner.

It doesn't replace Claude Code or OpenCode—it makes them more effective by providing **structure, state management, and human checkpoints** through a "Generate + Delegate" architecture.

| What NextAI Is | What NextAI Is NOT |
|----------------|---------------------|
| A structured 7-phase workflow | A magic autonomous agent |
| A state manager for features | A replacement for your AI client |
| A framework YOU operate | A "set it and forget it" tool |
| Human-in-the-loop by design | Fully automated end-to-end |

---

## Why Operator-Driven (Not Fully Automated)

This is a **deliberate design choice**, not a limitation.

Autonomous agents fail in real-world codebases because:
- They lose context over long tasks
- They can't validate business requirements
- They skip important steps when unsupervised
- They don't know when something is truly "done"
- They make architectural decisions without understanding tradeoffs

**NextAI's philosophy:** AI should *augment* your judgment, not replace it. You make decisions—agents do the heavy lifting.

### The Result

- Better specs (you answer clarifying questions)
- Faster development (AI handles implementation)
- Fewer mistakes (validation gates catch issues)
- More confidence (you test and approve)
- A smooth path from idea → shipped feature

---

## Who It's For

**Solo builders and small teams** who want AI leverage without losing control:

- **Product-minded tech leads** — You steer the work, not write every line. You need structured refinement, architecture checks, and predictable checkpoints.
- **Cross-stack developers** — You ship code across unfamiliar stacks. You need detailed specs, scaffolding, and AI that fills gaps without breaking things.

---

## Core Capabilities

| Capability | Description |
|------------|-------------|
| **7-Phase Workflow** | Created → Refinement → Spec → Implementation → Review → Testing → Complete |
| **State Management** | Tracks features through phases with validation gates |
| **Human Checkpoints** | You approve specs, verify tests, and control transitions |
| **Reusable Skills** | Structured prompts for common patterns (debugging, spec writing, reviewing) |
| **Generate + Delegate** | NextAI generates commands, your AI client executes them—no API keys needed |
| **Works With Your Tools** | Syncs slash commands to Claude Code, OpenCode |

---

## Getting Started

### Prerequisites
- **Node.js >= 18.0.0**
- **An AI coding assistant** — Claude Code or OpenCode

### Step 1: Install

```bash
npm install -g nextai
```

### Step 2: Initialize Your Project

```bash
cd my-project
nextai init
```

This creates:
- `.nextai/` — Configuration, agents, skills
- `todo/` and `done/` — Feature tracking directories
- Syncs slash commands to your AI client

### Step 3: Move to Your AI Client

From this point forward, **everything happens in your AI client** (Claude Code or OpenCode).

### Step 4: Generate Project Context (Important!)

```
/nextai-analyze
```

This scans your codebase and generates `docs/nextai/` with:
- Architecture overview
- Tech stack documentation
- Coding conventions
- Entry points and structure

**Without this step, agents won't understand your project.**

### Step 5: Create Your First Feature

```
/nextai-create
```

Describe your idea when prompted. The AI will:
- Capture your proposal
- Scaffold the feature folder
- Fill the initialization document

### Step 6: Run the Workflow

Follow the suggested commands. Each phase produces artifacts and suggests the next step.

---

## Command Reference

All commands run in your AI client (Claude Code or OpenCode). The only terminal command you need is `nextai init`.

### Workflow Commands

| Command | When to Use | What Happens |
|---------|-------------|--------------|
| `/nextai-create` | Start new work | Describe your idea, AI scaffolds feature |
| `/nextai-refine <id>` | After create | AI gathers requirements, writes spec |
| `/nextai-implement <id>` | After refinement | AI implements tasks from spec |
| `/nextai-review <id>` | After implementation | AI reviews code against spec |
| `/nextai-testing <id>` | After review passes | Log your manual test results |
| `/nextai-complete <id>` | After testing passes | AI generates summary, archives |

### Utility Commands

| Command | When to Use | What Happens |
|---------|-------------|--------------|
| `/nextai-analyze` | After init, periodically | Scans codebase, generates docs |
| `/nextai-list` | Check status | Shows all features with phases |
| `/nextai-show <id>` | Deep dive | Displays feature details and artifacts |
| `/nextai-resume [id]` | Continue work | Shows where you left off, suggests next step |
| `/nextai-sync` | After config changes | Re-syncs commands to AI client |
| `/nextai-repair [id]` | Something's wrong | Diagnoses and fixes state issues |

---

## Typical Workflow Session

All commands below run in your AI client:

```
# Start a new feature
/nextai-create
> "I want to add a password reset flow with email verification"
# → Created: 20251206_add-password-reset-flow

# Refine the feature
/nextai-refine 20251206_add-password-reset-flow
# AI asks: "What email service? Token expiry? etc."
# You answer questions, AI generates spec.md and tasks.md

# Implement
/nextai-implement 20251206_add-password-reset-flow
# AI works through tasks, you monitor

# Review
/nextai-review 20251206_add-password-reset-flow
# AI checks against spec, outputs PASS or FAIL

# Test manually, then log results
/nextai-testing 20251206_add-password-reset-flow
# AI asks: "Did it pass? Any notes?"
# You: "Pass - tested reset flow end-to-end"

# Complete and archive
/nextai-complete 20251206_add-password-reset-flow
# AI generates summary, moves to done/
```

---

## Project Structure

After `nextai init`:

```
my-project/
│
├── .nextai/                         # NextAI configuration (source of truth)
│   ├── config.json                  # Project settings
│   ├── profile.json                 # Project identity
│   ├── agents/                      # Agent definitions (7 agents)
│   ├── skills/                      # Reusable skill templates (7 skills)
│   ├── templates/commands/          # Slash command templates
│   └── state/
│       ├── ledger.json              # Feature lifecycle tracking
│       ├── session.json             # Current session info
│       └── history.log              # Audit trail (JSONL)
│
├── .claude/                         # Claude Code integration (generated)
│   ├── commands/nextai-*.md         # Slash commands
│   ├── agents/nextai/               # Subagents
│   └── skills/nextai/               # Skills
│
├── todo/                            # Active features
│   └── 20251206_add-user-auth/
│       ├── planning/
│       │   ├── initialization.md    # Your original request
│       │   ├── requirements.md      # Product Q&A results
│       │   └── visuals/             # Screenshots, diagrams
│       ├── spec.md                  # Technical specification
│       ├── tasks.md                 # Implementation checklist
│       ├── review.md                # AI review results
│       └── testing.md               # Your test log
│
├── done/                            # Archived completed features
│   └── 20251206_add-user-auth/
│       ├── summary.md               # Completion summary
│       └── [all artifacts]          # Preserved for history
│
└── docs/nextai/                     # Project docs (from /nextai-analyze)
    ├── architecture.md
    ├── technical-guide.md
    ├── conventions.md
    └── history.md                   # Feature archive log
```

---

## The 7 Phases

| Phase | Trigger | Produces | Gate |
|-------|---------|----------|------|
| `created` | `/nextai-create` | `initialization.md` | Folder exists |
| `product_refinement` | `/nextai-refine` | `requirements.md` | Q&A complete |
| `tech_spec` | `/nextai-refine` (continues) | `spec.md`, `tasks.md` | Both files exist |
| `implementation` | `/nextai-implement` | Code changes | All tasks checked |
| `review` | `/nextai-review` | `review.md` | PASS verdict |
| `testing` | `/nextai-testing` | `testing.md` | You mark pass |
| `complete` | `/nextai-complete` | `summary.md` | Archived to `done/` |

### Validation Gates

Before any phase transition, NextAI validates:
- Required files exist
- Content meets minimum requirements
- Previous phase completed successfully

Use `--force` to bypass (logged for audit).

---

## Agents & Skills

### 7 Built-in Agents

| Agent | Role | When Active |
|-------|------|-------------|
| **Product Owner** | Requirements gathering via Q&A | Refinement |
| **Technical Architect** | Spec and task list writing | Refinement |
| **Developer** | Code implementation | Implementation |
| **Reviewer** | Code review against spec | Review |
| **Document Writer** | Summary and docs | Complete |
| **Investigator** | Bug analysis, root cause | Bug workflows |
| **AI Team Lead** | Orchestration | All phases |

### 7 Built-in Skills

| Skill | Purpose |
|-------|---------|
| `refinement-questions` | Structured product Q&A loop |
| `refinement-spec-writer` | Technical spec authoring |
| `executing-plans` | Step-by-step task execution |
| `reviewer-checklist` | Code review validation |
| `documentation-recaps` | Changelog and docs updates |
| `root-cause-tracing` | Backward bug tracing |
| `systematic-debugging` | 4-phase debugging framework |

---

## Configuration

NextAI uses a **"Generate + Delegate"** architecture:

- **No API keys needed** — Uses your existing Claude Code / OpenCode subscription
- **Generates slash commands** that run in your AI client
- **The AI client handles all LLM calls** — NextAI just manages state

```json
// .nextai/config.json
{
  "project": {
    "id": "uuid",
    "name": "my-project",
    "repo_root": "/path/to/project"
  },
  "clients": {
    "synced": ["claude"],
    "default": "claude"
  }
}
```

---

## Supported AI Clients

| Client | Status | Config Location |
|--------|--------|-----------------|
| **Claude Code** | Supported | `.claude/` |
| **OpenCode** | Supported | `.opencode/` |
| **Codex** | Phase 2 | — |

---

## Development Flow

NextAI itself is developed using NextAI. Here's the typical development cycle:

```
1. Create a feature      →  /nextai-create          (describe your idea)
2. Refine with AI        →  /nextai-refine <id>     (answer questions, get spec)
3. Implement with AI     →  /nextai-implement <id>  (AI codes, you monitor)
4. Review with AI        →  /nextai-review <id>     (AI validates against spec)
5. Test manually         →  /nextai-testing <id>    (you verify it works)
6. Complete & archive    →  /nextai-complete <id>   (AI summarizes, archives)
```

**Key insight:** Each phase produces artifacts (requirements.md, spec.md, tasks.md, review.md, testing.md, summary.md) that create an audit trail and serve as context for the next phase.

### Contributing

```bash
git clone https://github.com/anthropics/nextai.git
cd nextai

npm install
npm run dev       # Development mode with watch
npm run build     # Production build
npm run test      # Run tests
npx tsc --noEmit  # Type check
```

---

## Philosophy

1. **Operator-driven** — You are the operator. You control when to proceed, what to approve, what to reject.
2. **Human-in-the-loop** — AI handles heavy lifting, you make decisions.
3. **Structured process** — Seven defined phases with validation gates.
4. **Artifact-driven** — Every phase produces reviewable outputs.
5. **Generate + Delegate** — NextAI generates prompts, your AI client executes them.
6. **Tool-agnostic** — Works with Claude Code, OpenCode, future clients.
7. **Transparent** — Full audit trail in `history.log`.

---

## Acknowledgments

NextAI Dev Framework builds on patterns from open-source projects including OpenSpec, Agent-OS, and OpenSkills.

---

## License

MIT

---

<p align="center">
  <strong>Ready to become the operator?</strong><br>
  <code>npm install -g nextai && nextai init</code><br>
  <em>Then run <code>/nextai-analyze</code> in your AI client to generate project context.</em>
</p>

<p align="center">
  <sub>AI does the work. You make the calls.</sub>
</p>
