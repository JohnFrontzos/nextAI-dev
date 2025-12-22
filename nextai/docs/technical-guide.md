# Technical Guide

## Prerequisites

- **Node.js >= 18.0.0**
- **An AI coding assistant** - Claude Code or OpenCode

## Installation

### Global Install (Recommended)

```bash
npm install -g @frontztech/nextai-dev
```

### Development Install

```bash
git clone https://github.com/JohnFrontzos/nextAI-dev.git
cd nextai-dev
npm install
npm link  # Makes 'nextai' available globally
```

## Setup

### Initialize a Project

```bash
cd my-project
nextai init
```

This creates:
- `.nextai/` - Configuration directory (source of truth)
- `nextai/` - Content directory (todo, done, docs, metrics)
- Syncs slash commands to detected AI clients

### Select AI Client

During init, choose your AI client:
- **Claude Code** - Syncs to `.claude/`
- **OpenCode** - Syncs to `.opencode/`
- **Both** - Syncs to both directories

### Generate Project Context

After init, run in your AI client:

```
/nextai-analyze
```

This scans your codebase and generates documentation in `nextai/docs/`.

## Build

```bash
npm run build       # Production build (tsup)
npm run dev         # Development with watch mode
```

Build output goes to `dist/` directory.

### Build Configuration

The project uses `tsup` for building:
- Entry: `src/index.ts`, `src/cli/index.ts`
- Output: ESM format only
- Target: ES2022, Node 18+
- Features: Type declarations, source maps, shims enabled
- Optimization: Code splitting disabled for simpler output

## Test

```bash
npm test            # Run all tests
npm run test:watch  # Watch mode
npm run test:coverage  # Coverage report
```

### Test Structure

```
tests/
├── unit/           # Unit tests (fast, isolated)
│   ├── cli/utils/
│   ├── core/
│   └── schemas/
├── integration/    # Integration tests
│   └── cli/
├── e2e/            # End-to-end workflow tests
├── fixtures/       # Test data
└── helpers/        # Test utilities
```

**Note:** The `research/` directory is excluded from test runs to avoid interference with experimental code.

### Coverage Thresholds

- Lines: 70%
- Branches: 60%

Certain files are excluded from coverage:
- CLI entry points (thin wrappers)
- Logger and prompt utilities
- Config and type definition files

## Linting

```bash
npm run lint        # Run ESLint on source files
```

ESLint configuration:
- TypeScript-aware linting
- Recommended rules from ESLint and @typescript-eslint
- Unused vars error (except args prefixed with `_`)
- Console statements allowed (CLI tool)

## Type Checking

```bash
npx tsc --noEmit    # Type check without emitting
npm run typecheck   # Same via npm script
```

## Configuration

### .nextai/config.json

Project settings:

```json
{
  "project": {
    "id": "uuid",
    "name": "my-project",
    "repo_root": "/path/to/project"
  },
  "clients": {
    "synced": ["claude"],
    "default": "claude"
  },
  "preferences": {
    "verbose": false
  }
}
```

### .nextai/profile.json

Project identity (used by agents for context):

```json
{
  "name": "my-project",
  "description": "What this project does",
  "tech_stack": ["typescript", "react", "node"]
}
```

### .nextai/state/session.json

Current session info (auto-updated):

```json
{
  "timestamp": "2025-12-08T20:44:32.501Z",
  "cli_version": "0.1.0"
}
```

### .nextai/state/ledger.json

Feature lifecycle tracking:

```json
{
  "features": [
    {
      "id": "20251208_add-user-auth",
      "title": "Add user authentication",
      "type": "feature",
      "phase": "implementation",
      "blocked_reason": null,
      "retry_count": 0,
      "created_at": "2025-12-08T10:00:00.000Z",
      "updated_at": "2025-12-08T15:30:00.000Z"
    }
  ]
}
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `nextai init` | Initialize project |
| `nextai create <title>` | Create feature/bug/task |
| `nextai list` | List features |
| `nextai show <id>` | Show feature details |
| `nextai resume [id]` | Resume work on feature |
| `nextai remove <id>` | Remove unwanted feature (moves to `nextai/removed/`) |
| `nextai sync` | Re-sync to AI clients (use `--force` to update resources from package) |
| `nextai repair [id]` | Repair state issues |
| `nextai testing <id>` | Log test results with automatic spec change detection and investigation on FAIL |
| `nextai complete <id>` | Archive completed feature (`--skip-summary`, `--force`) |
| `nextai status <id>` | Update feature status |
| `nextai advance <id> <phase>` | Advance to phase (internal) |

### Sync Command Details

The `nextai sync` command syncs NextAI configuration and resources to your AI client directories.

**Basic Usage:**
```bash
nextai sync                    # Sync to default client
nextai sync --client claude    # Sync to specific client
nextai sync --force            # Force overwrite client files
nextai sync --dry-run          # Preview what would be synced
```

**Automatic Resource Management:**

Resources in `.nextai/` are always kept in sync with the package automatically:
- `.nextai/` is framework-controlled space (always updated)
- Resources are auto-discovered from the package (no manual manifest)
- Change tracking reports new, updated, unchanged, and removed files

**Sync Output:**

The sync command provides detailed feedback on what changed:
```
Syncing resources to .nextai/...
Commands: 13 (1 new, 2 updated)
Agents: 7 (no changes)
Skills: 8 (3 removed)
```

**Force Flag Usage:**

The `--force` flag only affects user-space directories (`.claude/`, `.opencode/`):
```bash
nextai sync --force    # Overwrites files in .claude/ or .opencode/
```

`.nextai/` is always updated from the package regardless of the force flag.

**Auto-Update Behavior:**

NextAI automatically detects version changes and updates resources:
- Template version is tracked in `.nextai/state/session.json`
- Use `--no-auto-update` to skip automatic updates

<!-- Updated: 2025-12-22 - Revised sync documentation to reflect auto-discovery and directory ownership model -->

## Environment Variables

None required. NextAI uses the local filesystem for all state.

## Debugging

### Verbose Output

```bash
nextai list --verbose
```

Or set in config:

```json
{
  "preferences": {
    "verbose": true
  }
}
```

### History Log

All events are logged to `.nextai/state/history.log` (JSONL format):

```json
{"timestamp":"2025-12-08T10:00:00.000Z","event":"feature_created","feature_id":"20251208_add-user-auth","title":"Add user authentication"}
{"timestamp":"2025-12-08T10:30:00.000Z","event":"phase_transition","feature_id":"20251208_add-user-auth","from_phase":"created","to_phase":"product_refinement"}
{"timestamp":"2025-12-09T14:00:00.000Z","event":"feature_removed","feature_id":"20251209_obsolete-feature","title":"Obsolete feature"}
```

### Repair Utilities

If state gets corrupted:

```bash
nextai repair              # Repair project state
nextai repair <id>         # Repair specific feature
nextai repair --force      # Force repair without confirmation
```

## Core API Reference

### Ledger Module (`src/core/state/ledger.ts`)

The ledger module provides three functions for phase management:

#### `validateFeatureForPhase(projectRoot, featureId, newPhase, options?)`

Validates that a feature is ready to transition to the target phase. Does NOT modify the ledger.

```typescript
const result = await validateFeatureForPhase(projectRoot, featureId, 'complete');
if (!result.success) {
  // Handle validation errors
  console.error(result.errors);
}
```

**Options:**
- `basePath: 'todo' | 'done'` - Where to find artifacts (default: 'todo')

**Returns:** `PhaseUpdateResult` with success flag, errors, and warnings

#### `updateLedgerPhase(projectRoot, featureId, newPhase, options?)`

Updates the ledger phase without validation. Use after validation has been performed.

```typescript
const result = updateLedgerPhase(projectRoot, featureId, 'complete', {
  logBypass: false  // Set to true if validation was bypassed
});
```

**Options:**
- `logBypass: boolean` - Whether to log validation bypass to history

**Returns:** `PhaseUpdateResult` with success flag and bypass status

#### `updateFeaturePhase(projectRoot, featureId, newPhase, options?)`

Backward-compatible wrapper that validates and updates in one call. For complex workflows (like complete command), prefer using the separate functions.

```typescript
const result = await updateFeaturePhase(projectRoot, featureId, 'testing', {
  force: false,         // Bypass validation errors
  skipValidation: false // Skip validation entirely
});
```

**Best Practice:** For commands that need to perform actions between validation and ledger update (e.g., archiving), use the three-step workflow:

```typescript
// Step 1: Validate from source location
const validation = await validateFeatureForPhase(projectRoot, featureId, 'complete');
if (!validation.success && !force) {
  return; // Exit if validation fails
}

// Step 2: Perform action (e.g., archive feature)
archiveFeature(projectRoot, featureId);

// Step 3: Update ledger
updateLedgerPhase(projectRoot, featureId, 'complete', { logBypass: force });
```

This ensures the ledger always reflects the actual state of artifacts on disk.

#### `removeFeature(projectRoot, featureId)`

Removes a feature from the ledger and logs the removal to history. Used after moving the feature folder to `nextai/removed/`.

```typescript
import { removeFeature } from './core/state/ledger.js';

// After moving feature to nextai/removed/
removeFeature(projectRoot, featureId);
```

**Important:** This only updates the ledger - you must handle folder movement separately using utilities from `src/cli/utils/remove.ts`.

### Testing Command Options

**Workflow with Spec Change Detection:**

When a test FAIL is logged, NextAI automatically invokes the Investigator agent to classify the failure:

1. **FAIL Status**: User submits failure with notes
2. **Agent Analysis**: Investigator reads spec.md, code, and failure notes
3. **Classification**:
   - BUG (confidence ≤70%): Returns to implementation with investigation report
   - SPEC_CHANGE (confidence >70%): Prompts user for approval
4. **User Decision** (if spec change detected):
   - **Yes**: Appends change description to initialization.md, resets to product_refinement
   - **No**: Treats as bug, returns to implementation
   - **Cancel**: Stays in testing, no automatic changes

**Metrics Tracking:**
All spec change decisions are logged to nextai/metrics/spec-changes.jsonl for analysis.

The testing command supports multiple modes for logging test results:

```bash
# Quick PASS mode (minimal friction)
nextai testing <id> --status pass

# FAIL mode with notes (triggers investigation)
nextai testing <id> --status fail --notes "Button doesn't work on Android 12"

# Conversational mode (prompts for status and notes)
nextai testing <id>
```

**Features:**
- Session numbering - Test sessions are automatically numbered sequentially in testing.md
- Attachment auto-detection - Checks attachments/evidence/ folder for screenshots and logs
- Investigation on FAIL - Automatically triggers investigator agent to analyze test failures
- Hybrid workflow - Supports both quick mode for power users and conversational mode for guided testing

<!-- Updated: 2025-12-21 - Added testing command options, session numbering, and investigation workflow -->

## Extending NextAI

### Adding Custom Agents

Add agent files to `.nextai/agents/`:

```markdown
# My Custom Agent

You are a specialized agent for...

## Instructions
...
```

Run `nextai sync` to sync to AI clients.

### Adding Custom Skills

Add skill directories to `.nextai/skills/`:

```
.nextai/skills/my-skill/
└── SKILL.md
```

### Adding Custom Commands

Add command templates to `.nextai/templates/commands/`:

```markdown
---
description: My custom command
---

# My Command

Instructions for the AI...
```

Run `nextai sync` to sync to AI clients.
