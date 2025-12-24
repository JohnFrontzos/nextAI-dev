# Feature Summary: Skill Placeholder Injection at Sync Time

## Overview

This feature transforms skill placeholder text in command templates into actual embedded skill content during `nextai sync`. It eliminates reliance on Claude's unreliable runtime file reading by pre-embedding skill content at sync time.

**Problem Solved:** Command templates contained placeholders like `[Insert full content of .claude/skills/reviewer-checklist/SKILL.md here]` expecting Claude to read and embed skill files at runtime. Claude unreliably followed these instructions - sometimes passing literal text, referencing by name without content, or forgetting entirely. This broke phase-specific workflows because subagents didn't receive the detailed methodologies they need.

**Solution:** At `nextai sync` time, the system now detects skill placeholders in command templates and replaces them with actual skill content from `resources/skills/`. This ensures subagents always receive complete, embedded skill instructions without depending on Claude's ability to read files at runtime.

## Key Changes

### New Files Created
- **`src/core/sync/transformers/skill-embedder.ts`** - Reusable skill embedder transformer
  - `embedSkillPlaceholders()` function for detecting and replacing placeholders
  - Regex pattern: `/\[Insert full content of \.claude\/skills\/([^\/]+)\/SKILL\.md here\]/g`
  - Resolves skills from `.nextai/skills/<skill-name>/SKILL.md`
  - Graceful degradation: warns on missing skills, keeps placeholder intact

- **`tests/unit/core/sync/transformers/skill-embedder.test.ts`** - Comprehensive unit tests
  - 8 test cases covering single/multiple placeholders, missing skills, error handling
  - 100% pass rate

### Modified Files
- **`src/core/sync/base.ts`** - Added context propagation
  - Added `protected projectRoot?: string` field to `ClientConfigurator` base class
  - Set in `sync()` method for access in transformation methods

- **`src/core/sync/claude-code.ts`** - Integrated skill embedder
  - Imports and calls `embedSkillPlaceholders()` in `transformCommandTemplate()`
  - Transformation order: skill embedding → skill tool text addition
  - 4 new integration tests added (all passing)

- **`src/core/sync/opencode.ts`** - Integrated skill embedder
  - Imports and calls `embedSkillPlaceholders()` in `transformCommandTemplate()`
  - Transformation order: skill embedding → skill tool removal
  - 4 new integration tests added (all passing)

- **`tests/unit/core/sync/claude-code.test.ts`** - Added integration tests
  - Verifies skills embedded from actual files
  - Confirms content matches source exactly
  - Tests full sync pipeline and idempotency

- **`tests/unit/core/sync/opencode.test.ts`** - Added integration tests
  - Same coverage as Claude Code tests
  - Verifies platform-specific transformations still work after embedding

### New Capabilities
- **Deterministic skill embedding** - Same input produces same output every time
- **No runtime dependencies** - Command files are complete and self-contained
- **Graceful error handling** - Missing skills warn but don't break sync
- **Single-pass transformation** - Efficient global regex replacement
- **Raw content preservation** - Markdown embedded without modification

## Implementation Details

### Technical Approach

The solution follows the established transformer pattern in `src/core/sync/transformers/`. Both `ClaudeCodeConfigurator` and `OpenCodeConfigurator` call the same transformer from their `transformCommandTemplate()` methods.

**Transformation Pipeline:**
1. Command template read from `resources/templates/commands/*.md`
2. Regex detects all skill placeholders
3. For each match, extract skill name and resolve path
4. If skill exists, replace placeholder with raw skill content
5. If skill missing, log warning and keep placeholder intact
6. Return transformed template
7. Template written to client directories

**Context Propagation:**
- Used Option A: Store `projectRoot` in instance field
- Added to `ClientConfigurator` base class
- Set during `sync()` method
- Accessed in `transformCommandTemplate()`

### Error Handling Strategy

The implementation uses graceful degradation for all error scenarios:

- **Missing skill file**: Logs warning, keeps placeholder intact
- **File read error**: Catches exception, logs warning, keeps placeholder
- **No placeholders**: Returns template unchanged (no-op)
- **Malformed placeholders**: Ignored, treated as normal text

This ensures `nextai sync` always succeeds, even if some skills are missing. Commands are generated with placeholders that can be manually replaced or fixed in a later sync.

### Security Considerations

- **Path traversal prevention**: Regex ensures skill names contain no path separators `([^\/]+)`
- **Fixed base path**: Skills only resolved from `<nextai-dir>/skills/`
- **Trusted content**: Embedded content from project's own skills
- **No code execution**: Raw markdown content, no eval or dynamic execution

## Test Results

All 16 new tests pass successfully:

- **Unit Tests** (`skill-embedder.test.ts`): 8/8 passed
  - Single placeholder replacement
  - Multiple placeholders
  - Missing skill handling
  - No placeholders (no-op)
  - Mixed scenarios
  - Malformed placeholders
  - File read errors
  - Content preservation

- **Claude Code Integration Tests**: 4/4 passed
  - Skills embedded from actual files
  - Content matches source exactly
  - All templates transformed during sync
  - Idempotency on force sync

- **OpenCode Integration Tests**: 4/4 passed
  - Skills embedded from actual files
  - Content matches source exactly
  - All templates transformed during sync
  - Platform-specific transformations preserved

**Total: 16/16 tests passed (100% success rate)**

## Affected Templates

Based on existing placeholders, 4 command templates are affected with 8 total placeholders:

- `refine.md` - 4 placeholders (refinement-product-requirements, refinement-technical-specs x2, testing-investigator)
- `review.md` - 1 placeholder (reviewer-checklist)
- `implement.md` - 1 placeholder (executing-plans)
- `complete.md` - 2 placeholders (documentation-recaps x2)

All of these now receive embedded skill content during sync, ensuring subagents have complete instructions.

## Benefits

### For Users
- **Reliability**: No more missing or incomplete skill instructions
- **Consistency**: Every sync produces identical results
- **Transparency**: Commands are self-contained and reviewable
- **No action required**: Works automatically on `nextai sync`

### For AI Agents
- **Complete context**: All skill instructions embedded in commands
- **No file reading**: No dependency on Claude's ability to follow file reading instructions
- **Immediate access**: Skills available without runtime tool calls
- **Reduced errors**: Fewer opportunities for misinterpretation

### For Development
- **Testability**: Pure function transformation is easy to test
- **Maintainability**: Single transformer used by both platforms
- **Extensibility**: Pattern can be reused for other placeholder types
- **Debuggability**: Transformation happens once at sync, not at runtime

## Implementation Notes

### Design Decisions

1. **Single-pass replacement**: Used `String.replace()` with global regex for efficiency
2. **Instance field over parameter**: Chose to add `projectRoot` to base class rather than modify method signatures
3. **Warning over error**: Missing skills warn but don't fail sync (graceful degradation)
4. **Raw content embedding**: No transformation of skill content, preserving original formatting

### Trade-offs

**Advantages:**
- Atomic sync operation
- Deterministic output
- No runtime dependencies
- Follows existing patterns
- Automatic and testable

**Costs:**
- Slightly larger command files (embedded content increases size)
- Slightly longer sync time (file reads during transformation)
- Template updates require re-sync (acceptable - sync is cheap)

### Alternative Approaches Considered

- **Keep runtime skill loading**: Rejected due to Claude's unreliability
- **Generate skill-specific commands**: Rejected due to command explosion
- **Dynamic loading at runtime**: Rejected due to runtime dependencies
- **Separate pre-processing step**: Rejected to keep sync atomic

The chosen approach (pre-sync embedding in transformCommandTemplate) was selected because it fits naturally into the existing architecture, requires no user intervention, and eliminates all runtime variability.

## Related Documentation

### Architecture Updates
No significant architectural changes required. The implementation follows the existing transformer pattern established in `src/core/sync/transformers/agent.ts` and `src/core/sync/transformers/skill.ts`.

### Relevant Files
- **Specification**: `nextai/todo/20251224_skill-placeholder-injection/spec.md`
- **Implementation Tasks**: `nextai/todo/20251224_skill-placeholder-injection/tasks.md`
- **Code Review**: `nextai/todo/20251224_skill-placeholder-injection/review.md`
- **Unit Tests**: `tests/unit/core/sync/transformers/skill-embedder.test.ts`
- **Integration Tests**: `tests/unit/core/sync/claude-code.test.ts`, `tests/unit/core/sync/opencode.test.ts`

### Component Documentation
- **Transformer**: `src/core/sync/transformers/skill-embedder.ts` - Single exported function
- **Base Configurator**: `src/core/sync/base.ts` - Added `projectRoot` field
- **Claude Code Configurator**: `src/core/sync/claude-code.ts` - Calls embedder
- **OpenCode Configurator**: `src/core/sync/opencode.ts` - Calls embedder

## Future Enhancements

While the current implementation is production-ready, potential future improvements include:

1. **Metric logging**: Track number of skills embedded per sync
2. **Content caching**: Cache skill content during single sync operation (micro-optimization)
3. **Placeholder variants**: Support for alternate placeholder formats
4. **Validation**: Verify embedded skills are valid markdown

These are optional enhancements and not required for the feature to function correctly.

## Conclusion

This feature successfully solves the reliability problem with runtime skill loading by pre-embedding skill content at sync time. The implementation is clean, well-tested, and follows established project patterns. All 16 tests pass with 100% success rate, and the code review verdict is PASS.

The transformation is atomic, deterministic, and requires no user intervention. Command templates now receive complete skill instructions, ensuring subagents have the detailed methodologies they need to perform their specialized roles effectively.