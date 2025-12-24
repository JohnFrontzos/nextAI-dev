# Skill Placeholder Injection at Sync Time

## Overview

Transform skill placeholder text in command templates into actual embedded skill content during `nextai sync`. This eliminates reliance on Claude's unreliable runtime file reading by pre-embedding skill content at sync time.

## Requirements Summary

**Problem:** Command templates contain placeholders like `[Insert full content of .claude/skills/reviewer-checklist/SKILL.md here]` expecting Claude to read and embed skill files at runtime. Claude unreliably follows these instructions - sometimes passing literal text, referencing by name without content, or forgetting entirely. This breaks phase-specific workflows because subagents don't receive the detailed methodologies they need.

**Solution:** At `nextai sync` time, detect skill placeholders in command templates and replace them with actual skill content from `resources/skills/`.

**Key Decisions:**
- Match `.claude/skills/` pattern in templates, resolve from `resources/skills/` (source of truth)
- Support both Claude Code and OpenCode platforms (same transformation logic)
- Add to existing `transformCommandTemplate()` method in both configurators
- Warn on missing skills, keep placeholder, continue processing
- Single-pass global regex replacement
- Embed raw markdown content without transformation

## Technical Approach

Create a reusable skill embedder transformer following the established pattern in `src/core/sync/transformers/`. Both `ClaudeCodeConfigurator` and `OpenCodeConfigurator` will call this transformer from their `transformCommandTemplate()` methods.

**Transformation Pipeline:**
1. Command template read from `resources/templates/commands/*.md`
2. Regex detects all skill placeholders: `\[Insert full content of \.claude/skills/([^/]+)/SKILL\.md here\]`
3. For each match, extract skill name and resolve path to `resources/skills/<skill-name>/SKILL.md`
4. If skill exists, replace placeholder with raw skill content
5. If skill missing, log warning and keep placeholder intact
6. Return transformed template
7. Template written to client directories (`.claude/commands/` or `.opencode/command/`)

## Architecture

### Components Involved

**New Component:**
- `src/core/sync/transformers/skill-embedder.ts` - Skill placeholder detection and embedding logic

**Modified Components:**
- `src/core/sync/claude-code.ts:transformCommandTemplate()` - Add skill embedder call
- `src/core/sync/opencode.ts:transformCommandTemplate()` - Add skill embedder call

**Data Flow:**
```
resources/templates/commands/*.md
    ↓
transformCommandTemplate() (claude-code.ts or opencode.ts)
    ↓
embedSkillPlaceholders() (skill-embedder.ts)
    ↓ (reads from)
resources/skills/*/SKILL.md
    ↓ (returns transformed template)
transformCommandTemplate()
    ↓ (writes to)
.claude/commands/*.md or .opencode/command/*.md
```

### Integration Points

1. **ClaudeCodeConfigurator.transformCommandTemplate()** (line 181-191)
   - Currently adds "Use the Skill tool" text
   - Will call `embedSkillPlaceholders()` before returning

2. **OpenCodeConfigurator.transformCommandTemplate()** (line 145-153)
   - Currently removes Skill tool references
   - Will call `embedSkillPlaceholders()` before returning

3. **Skill Resolution**
   - Use existing `getNextAIDir()` utility to resolve `.nextai/` path
   - Resolve skills from `<nextai-dir>/skills/<skill-name>/SKILL.md`
   - Note: `resources/skills/` in repository becomes `.nextai/skills/` in installed projects

## Implementation Details

### Skill Embedder Transformer

**File:** `src/core/sync/transformers/skill-embedder.ts`

**Function Signature:**
```typescript
export function embedSkillPlaceholders(
  templateContent: string,
  projectRoot: string
): string
```

**Logic:**
```typescript
1. Define regex pattern: /\[Insert full content of \.claude\/skills\/([^\/]+)\/SKILL\.md here\]/g
2. Use String.replace() with callback:
   - Extract skill name from capture group
   - Build skill path: join(getNextAIDir(projectRoot), 'skills', skillName, 'SKILL.md')
   - If skill file exists:
     * Read raw content with readFileSync()
     * Return content (replaces placeholder)
   - If skill file missing:
     * Log warning: console.warn(`Skill not found: ${skillName} - keeping placeholder`)
     * Return original placeholder text (no replacement)
3. Return transformed template
```

**Error Handling:**
- Missing skill file → warn and keep placeholder (graceful degradation)
- File read error → warn and keep placeholder
- No placeholders → return template unchanged (no-op)

### Integration into Configurators

**ClaudeCodeConfigurator Changes:**

```typescript
// src/core/sync/claude-code.ts
import { embedSkillPlaceholders } from './transformers/skill-embedder.js';

private transformCommandTemplate(template: string): string {
  let content = template;

  // Embed skill placeholders
  content = embedSkillPlaceholders(content, this.projectRoot);

  // Add skill loading instructions if not present
  if (!content.includes('Skill tool')) {
    return content.replace(
      '---\n\n',
      '---\n\nUse the Skill tool to load NextAI skills when needed.\n\n'
    );
  }
  return content;
}
```

**Note:** `projectRoot` needs to be accessible in `transformCommandTemplate()`. This requires passing context through the method chain.

**OpenCodeConfigurator Changes:**

```typescript
// src/core/sync/opencode.ts
import { embedSkillPlaceholders } from './transformers/skill-embedder.js';

private transformCommandTemplate(template: string): string {
  let content = template;

  // Embed skill placeholders
  content = embedSkillPlaceholders(content, this.projectRoot);

  // Remove Skill tool references (OpenCode uses agents)
  content = content.replace(/Use the Skill tool to load.*?\r?\n/g, '');

  return content;
}
```

### Context Propagation

The `transformCommandTemplate()` method needs access to `projectRoot` to resolve skill paths. Options:

**Option A: Store projectRoot in instance**
- Add `private projectRoot?: string` field to `ClientConfigurator`
- Set during `sync()` method
- Access in `transformCommandTemplate()`

**Option B: Pass projectRoot as parameter**
- Modify signature: `transformCommandTemplate(template: string, projectRoot: string)`
- Update call sites in `generateCommands()`

**Chosen Approach:** Option A (cleaner, less invasive)

## API/Interface Changes

**New Export:**
- `src/core/sync/transformers/skill-embedder.ts`
  - `export function embedSkillPlaceholders(templateContent: string, projectRoot: string): string`

**Modified Internal API:**
- `ClientConfigurator` base class - add `protected projectRoot?: string` field
- `ClientConfigurator.sync()` - set `this.projectRoot = projectRoot` at start

**No Public API Changes** - This is internal sync logic only

## Data Model

No database or state changes required. Operates on filesystem:

**Inputs:**
- `resources/templates/commands/*.md` (or `.nextai/templates/commands/` in installed projects)
- `resources/skills/*/SKILL.md` (or `.nextai/skills/*/SKILL.md` in installed projects)

**Outputs:**
- `.claude/commands/nextai-*.md`
- `.opencode/command/nextai-*.md`

**Affected Templates:**
Based on grep results, 8 placeholders across 4 templates:
- `refine.md` - 4 placeholders (refinement-product-requirements, refinement-technical-specs x2, testing-investigator)
- `review.md` - 1 placeholder (reviewer-checklist)
- `implement.md` - 1 placeholder (executing-plans)
- `complete.md` - 2 placeholders (documentation-recaps x2)

## Security Considerations

**Path Traversal Prevention:**
- Skill names are extracted from template placeholders (controlled content)
- Skills resolved from fixed base path: `<nextai-dir>/skills/`
- No user-provided paths involved in skill resolution
- Regex pattern ensures skill names don't contain path separators: `([^\/]+)` matches non-slash characters only

**Content Safety:**
- Embedded content is from trusted source (project's own skills)
- Skills are markdown documentation (no executable code)
- No eval or dynamic code execution
- Raw content preservation prevents injection attacks

**File System Safety:**
- Only reads from `resources/skills/` directory
- No writes to skill source files
- Bounded by project directory structure

## Error Handling

### Missing Skill File
```
Scenario: Template references skill that doesn't exist
Handling:
  - Log warning: "Skill not found: <skill-name> - keeping placeholder"
  - Keep original placeholder text in template
  - Continue processing other placeholders
  - Sync completes successfully
Result: Command generated with placeholder intact
```

### File Read Error
```
Scenario: Skill file exists but can't be read (permissions, etc.)
Handling:
  - Catch error in embedSkillPlaceholders()
  - Log warning: "Failed to read skill: <skill-name> - keeping placeholder"
  - Keep original placeholder text
  - Continue processing
Result: Command generated with placeholder intact
```

### No Placeholders Found
```
Scenario: Template has no skill placeholders
Handling:
  - Regex finds no matches
  - Return template unchanged
  - No logging (normal case)
Result: Template passes through unmodified
```

### Malformed Placeholder
```
Scenario: Placeholder doesn't match expected pattern
Handling:
  - Regex doesn't match
  - Placeholder remains in output
  - No error thrown (treated as normal text)
Result: Template includes literal malformed placeholder text
```

## Testing Strategy

### Unit Tests
**File:** `tests/unit/core/sync/transformers/skill-embedder.test.ts`

Test cases:
1. **Basic embedding** - Single placeholder replaced with skill content
2. **Multiple placeholders** - All placeholders in one template replaced
3. **Missing skill** - Warning logged, placeholder kept
4. **No placeholders** - Template unchanged
5. **Mixed scenarios** - Some skills exist, some missing
6. **Regex edge cases** - Malformed placeholders ignored
7. **File read errors** - Graceful handling

### Integration Tests
**File:** `tests/unit/core/sync/claude-code.test.ts` (extend existing)

Test cases:
1. Verify `transformCommandTemplate()` embeds skills
2. Verify embedded content matches actual skill file
3. Verify transformation applied to all command templates during sync

**File:** `tests/unit/core/sync/opencode.test.ts` (extend existing)

Test cases:
1. Same as Claude Code integration tests
2. Verify OpenCode-specific transformations still work after skill embedding

### Manual Verification
See `testing.md` for manual test checklist

## Existing Code to Leverage

**Components to Reuse:**
- `src/core/sync/transformers/agent.ts` - Transformer pattern and structure
- `src/core/sync/transformers/skill.ts` - `parseBaseSkill()` for validation (optional)
- `src/cli/utils/config.ts:getNextAIDir()` - Resolve `.nextai/` directory path
- `tests/helpers/test-utils.ts:createTestProject()` - Test project scaffolding
- Node.js `fs.readFileSync()` - File reading
- Node.js `path.join()` - Path resolution

**Patterns to Follow:**
- Transformer as pure function (input template → output template)
- Export from `transformers/` directory
- Import into both configurators
- Warning logs for non-critical errors
- Graceful degradation (keep placeholder on error)

**Services to Extend:**
- `ClientConfigurator` base class - Add `projectRoot` field for context propagation

## Alternatives Considered

### Alternative 1: Keep Runtime Skill Loading
**Approach:** Improve Claude's reliability with clearer instructions
**Rejected Because:**
- Already attempted in iteration 20251224_update-agent-templates
- Relies on Claude's ability to follow multi-step instructions
- Introduces runtime variability (Claude's interpretation)
- Can't guarantee consistent behavior across sessions

### Alternative 2: Generate Skill-Specific Commands
**Approach:** Create separate command files for each skill combination
**Rejected Because:**
- Command explosion (4 templates × 8 skills = many combinations)
- Maintenance burden (update each combination on skill changes)
- Sync complexity (which commands to generate?)
- User confusion (many similar commands)

### Alternative 3: Dynamic Skill Loading at Command Runtime
**Approach:** Commands execute script to load skills before delegating
**Rejected Because:**
- Adds runtime dependency (skill files must exist at command execution)
- Complicates command files (bash script injection)
- Error handling at runtime (user sees failures)
- Still has reliability issues (depends on LLM following script instructions)

### Alternative 4: Separate Pre-Processing Step
**Approach:** `nextai embed-skills` command runs before sync
**Rejected Because:**
- Extra manual step in workflow
- Easy to forget (user runs sync without embedding)
- Inconsistent state (templates out of sync with embedded versions)
- Sync should be atomic and complete

### Chosen Approach: Pre-Sync Embedding in transformCommandTemplate()
**Advantages:**
- Atomic operation (sync handles everything)
- Deterministic (same input → same output)
- No runtime dependencies (content pre-embedded)
- Follows existing transformer pattern
- Automatic (no extra user steps)
- Testable (pure function transformation)

**Trade-offs:**
- Larger command files (embedded content increases size)
- Sync time slightly longer (file reads during transformation)
- Template updates require re-sync (acceptable - sync is cheap)

**Why This Works:**
- Sync is already the source of truth for client configuration
- Transformer pattern established and proven
- Pre-embedding eliminates all runtime variability
- Fits naturally into existing architecture
