# NextAI Dev Framework Documentation

## Overview

NextAI Dev Framework is a spec-driven workflow for planning and executing software development with AI coding assistants. It provides structured phases, human checkpoints, and artifacts at every step - turning AI from a reactive assistant into a predictable development partner.

**Philosophy:** AI should augment your judgment, not replace it. You make decisions - agents do the heavy lifting.

## Quick Start

```bash
# Install globally
npm install -g nextai

# Initialize in your project
cd my-project
nextai init

# Move to your AI client and generate project context
/nextai-analyze

# Create your first feature
/nextai-create
```

## Documentation

- [Architecture](architecture.md) - System design, components, and data flow
- [Product Overview](product-overview.md) - Features, workflows, and user flows
- [Technical Guide](technical-guide.md) - Setup, build, test, and configuration
- [Conventions](conventions.md) - Code style and project conventions
- [History](history.md) - Completed feature archive

## The 7 Phases

| Phase | Command | Produces | Gate |
|-------|---------|----------|------|
| `created` | `/nextai-create` | `initialization.md` | Folder exists |
| `product_refinement` | `/nextai-refine` | `requirements.md` | Q&A complete |
| `tech_spec` | `/nextai-refine` | `spec.md`, `tasks.md` | Both files exist |
| `implementation` | `/nextai-implement` | Code changes | All tasks checked |
| `review` | `/nextai-review` | `review.md` | PASS verdict |
| `testing` | `/nextai-testing` | `testing.md` | You mark pass |
| `complete` | `/nextai-complete` | `summary.md` | Archived |

## NextAI Commands

### Workflow Commands

| Command | Description |
|---------|-------------|
| `/nextai-create` | Create a new feature, bug, or task |
| `/nextai-refine <id>` | Gather requirements and write specification |
| `/nextai-implement <id>` | Implement tasks from specification |
| `/nextai-review <id>` | Review code against specification |
| `/nextai-testing <id>` | Log manual test results |
| `/nextai-complete <id>` | Generate summary and archive |

### Utility Commands

| Command | Description |
|---------|-------------|
| `/nextai-analyze` | Scan codebase and generate documentation |
| `/nextai-list` | Show all features with phases |
| `/nextai-show <id>` | Display feature details and artifacts |
| `/nextai-resume [id]` | Smart continuation - shows where you left off |
| `/nextai-remove <id>` | Remove unwanted features (moves to nextai/removed/) |
| `/nextai-sync` | Re-sync commands to AI client |
| `/nextai-repair [id]` | Diagnose and fix state issues |
| `/nextai-import <framework>` | Import archived features from external frameworks |

## Project Structure

```
my-project/
├── .nextai/                    # Configuration (source of truth)
│   ├── config.json             # Project settings
│   ├── agents/                 # 7 agent definitions
│   ├── skills/                 # 7 reusable skills
│   ├── templates/commands/     # Slash command templates
│   └── state/                  # Ledger, session, history
│
├── .claude/                    # Claude Code integration
│   ├── commands/nextai-*.md    # Synced slash commands
│   ├── agents/nextai/          # Synced agents
│   └── skills/                 # Synced skills (flat structure)
│
└── nextai/                     # Content directory
    ├── todo/                   # Active features
    ├── done/                   # Archived completed features
    ├── removed/                # Removed features (safe archive)
    ├── docs/                   # Project documentation
    └── metrics/                # Analytics
```

## Getting Help

- Run `/nextai-resume` to see where you left off
- Run `/nextai-list` to see all features and their phases
- Run `/nextai-repair` if something seems wrong

<!-- Updated: 2025-12-10 - Updated skills directory from skills/nextai/ to flat skills/ structure -->
