# Documentation Recaps

Use when updating documentation — provides patterns for generating summaries and maintaining project docs.

## Purpose
Update project documentation and changelog when features are completed.

## Modes

This skill operates in two modes:

### Analyze Mode (Comprehensive)
Used when running `/nextai-analyze` to create or **update** project documentation.
Also runs automatically as part of `/nextai-complete` to refresh docs after a feature is archived.

### Complete Mode (Minimal)
Used when completing a feature - creates feature-specific artifacts only:
- Archive summary
- Changelog entry
- History table row

## Analyze Mode Process

### Phase 1: Scan Project
1. Identify project type (package.json, requirements.txt, etc.)
2. Detect technologies and frameworks
3. Scan folder structure
4. Read existing documentation if any

### Phase 2: Generate Documentation
Create/update files in `nextai/docs/`:

**index.md** - Overview and navigation
**architecture.md** - System design and patterns
**product-overview.md** - What the product does
**technical-guide.md** - Tech stack, setup, development
**conventions.md** - Coding standards
**history.md** - Feature completion log

### Guidelines
- Never delete user-authored content
- Merge new information with existing
- Use consistent formatting
- Keep documentation actionable

## Update Strategy

When documentation already exists, follow this incremental update process:

### Step 1: Read Existing Content
1. Read all files in `nextai/docs/`
2. Identify user-authored sections (custom content, specific examples, personalized notes)
3. Parse current structure and headings

### Step 2: Detect Project Changes
Compare current project state with what's documented:

| What to Check | How to Detect |
|--------------|---------------|
| Dependencies | Compare package.json/requirements.txt with documented deps |
| Technologies | Scan imports, config files for new frameworks |
| Architecture | Check for new folders, components, patterns |
| Conventions | Look for new coding patterns in recent code |

### Step 3: Merge Strategy

For each documentation file:

| Scenario | Action |
|----------|--------|
| Section exists, no changes | Preserve as-is |
| Section exists, info outdated | Update specific lines, keep structure |
| New information to add | Append new section or add to existing |
| User-authored custom section | Always preserve completely |

### Step 4: Mark Updates
Add HTML comment to sections that were auto-updated:
```markdown
<!-- Updated: 2025-12-06 by NextAI -->
```

### What Changes Trigger Updates

| Project Change | Documentation Target |
|---------------|---------------------|
| New npm/pip dependency | `technical-guide.md` → Dependencies section |
| New folder in src/ | `architecture.md` → Structure section |
| New API endpoint | `architecture.md` → API section |
| New coding pattern | `conventions.md` → relevant section |
| New user-facing feature | `product-overview.md` → Features section |

### Preservation Rules
1. **Never delete** user-authored content
2. **Never overwrite** custom examples, notes, or explanations
3. **Prefer appending** over replacing entire sections
4. **Preserve formatting** of existing content
5. **Keep existing links** unless they're broken

## Complete Mode Process

### Phase 1: Read Feature Context
1. Read the feature's `spec.md`
2. Read the implementation from `tasks.md`
3. Understand what changed

### Phase 2: Minimal Updates
Only update what's necessary:

**Changelog** - Append single entry:
```markdown
## [Date] Feature: [Title]
- Brief summary of what was added/changed
- Link to full details: `nextai/done/<id>/summary.md`
```

**Architecture docs** - Only if architecture changed significantly

**API docs** - Only if new endpoints/interfaces added

**history.md** - Add reference to archived feature:
```markdown
| Date | Feature ID | Summary | Archive |
|------|------------|---------|---------|
| 2025-12-06 | 20251206_add-auth | Added authentication | [details](../done/20251206_add-auth/summary.md) |
```

### Phase 3: Generate Summary
Write `nextai/done/<id>/summary.md`:

```markdown
# Feature Summary: [Title]

## Overview
What this feature does.

## Key Changes
- Main files modified
- New capabilities added
- Dependencies added

## Implementation Notes
Any important decisions or caveats.

## Related Documentation
Links to updated docs.
```

## Principles
- Complete mode adds *signal*, not *noise*
- One-line changelog entry is better than duplicating the full summary
- The `nextai/done/` folder is the authoritative history
- Docs just reference it

## Output
- Updated documentation files
- `summary.md` in done folder
- Changelog entry
