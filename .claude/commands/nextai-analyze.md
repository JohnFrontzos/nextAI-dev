---
description: Analyze project and generate documentation
---

Use the Skill tool to load NextAI skills when needed.

# NextAI Analyze

You are the NextAI Project Analyzer. Your task is to analyze the current project and generate/update documentation in `nextai/docs/`.

## Session Context
Read `.nextai/state/session.json` for current timestamp.

## Pre-flight Checks

Verify `.nextai/` directory exists. If not:
```
Project not initialized. Run `nextai init` first.
```

## Analysis Process

Use the **document-writer** subagent (or load the documentation-recaps skill) in **Analyze Mode**.

### Step 1: Scan Project

Detect technologies:
1. Read `package.json` (Node.js/JavaScript)
2. Read `requirements.txt` or `pyproject.toml` (Python)
3. Read `Cargo.toml` (Rust)
4. Read `go.mod` (Go)
5. Check for frameworks (React, Vue, Django, etc.)

Scan structure:
1. Map folder structure
2. Identify entry points
3. Note key directories

Check existing docs:
1. Read any existing `docs/` content
2. Read README.md if present
3. Note what's already documented

### Step 2: Generate Documentation

Create/update files in `nextai/docs/`:

#### index.md
```markdown
# [Project Name] Documentation

## Overview
[Brief description of what this project does]

## Quick Start
[How to get started]

## Documentation
- [Architecture](architecture.md)
- [Product Overview](product-overview.md)
- [Technical Guide](technical-guide.md)
- [Conventions](conventions.md)
- [History](history.md)

## NextAI Commands
- `/nextai-analyze` - Update this documentation
- `/nextai-refine <id>` - Start refinement
- `/nextai-implement <id>` - Implement feature
- `/nextai-review <id>` - Review implementation
- `/nextai-complete <id>` - Complete feature
```

#### architecture.md
```markdown
# Architecture

## System Overview
[High-level description of the system]

## Components
[Key components and their responsibilities]

## Data Flow
[How data moves through the system]

## Technology Stack
[Languages, frameworks, libraries]
```

#### product-overview.md
```markdown
# Product Overview

## What It Does
[Description of the product's purpose]

## Key Features
[Main features and capabilities]

## User Flows
[How users interact with the product]
```

#### technical-guide.md
```markdown
# Technical Guide

## Setup
[How to set up the development environment]

## Build
[How to build the project]

## Test
[How to run tests]

## Deploy
[How to deploy]

## Configuration
[Key configuration options]
```

#### conventions.md
```markdown
# Coding Conventions

## Code Style
[Style guidelines for this project]

## Naming Conventions
[How to name things]

## File Organization
[How files should be organized]

## Git Workflow
[How to use git in this project]
```

#### history.md
```markdown
# Feature History

Completed features are archived in `nextai/done/` with full artifacts.

| Date | Feature ID | Summary | Archive |
|------|------------|---------|---------|
```

### Step 3: Merge with Existing

If documentation already exists:
- Don't overwrite user content
- Add new sections where appropriate
- Update outdated information
- Keep user customizations

## Completion

```
✓ Project documentation generated/updated.

Location: nextai/docs/

Files:
- index.md
- architecture.md
- product-overview.md
- technical-guide.md
- conventions.md
- history.md

Review and customize the documentation as needed.
```

## Tips for Users

Recommend:
1. Review generated docs for accuracy
2. Fill in placeholder sections
3. Add project-specific details
4. Re-run analyze periodically to update
