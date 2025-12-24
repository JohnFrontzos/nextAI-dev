# Implementation Tasks

## Pre-implementation
- [x] Review existing transformer patterns in `src/core/sync/transformers/agent.ts`
- [x] Verify all affected command templates in `resources/templates/commands/`
- [x] Confirm skill file locations in `resources/skills/*/SKILL.md`

## Core Implementation

### 1. Create Skill Embedder Transformer
- [x] Create file: `src/core/sync/transformers/skill-embedder.ts`
- [x] Import required modules: `fs`, `path`, `getNextAIDir`
- [x] Define regex pattern for placeholder detection: `/\[Insert full content of \.claude\/skills\/([^\/]+)\/SKILL\.md here\]/g`
- [x] Implement `embedSkillPlaceholders(templateContent: string, projectRoot: string): string` function
- [x] Add skill path resolution logic using `getNextAIDir()` and `path.join()`
- [x] Add file existence check with `fs.existsSync()`
- [x] Add file read logic with `fs.readFileSync()` and UTF-8 encoding
- [x] Add error handling with `console.warn()` for missing skills
- [x] Add try-catch for file read errors with graceful fallback
- [x] Export function as named export

### 2. Update ClientConfigurator Base Class
- [x] Open `src/core/sync/base.ts`
- [x] Add `protected projectRoot?: string` field to `ClientConfigurator` class
- [x] Update `sync()` method to set `this.projectRoot = projectRoot` at start

### 3. Integrate into ClaudeCodeConfigurator
- [x] Open `src/core/sync/claude-code.ts`
- [x] Import `embedSkillPlaceholders` from `./transformers/skill-embedder.js`
- [x] Update `transformCommandTemplate()` method signature if needed
- [x] Add call to `embedSkillPlaceholders(template, this.projectRoot!)` before existing transformations
- [x] Verify transformation order (skill embedding → skill tool text addition)
- [x] Test that existing logic still works after change

### 4. Integrate into OpenCodeConfigurator
- [x] Open `src/core/sync/opencode.ts`
- [x] Import `embedSkillPlaceholders` from `./transformers/skill-embedder.js`
- [x] Update `transformCommandTemplate()` method signature if needed
- [x] Add call to `embedSkillPlaceholders(template, this.projectRoot!)` before existing transformations
- [x] Verify transformation order (skill embedding → skill tool removal)
- [x] Test that existing logic still works after change

## Unit Tests

### 5. Unit Tests for Skill Embedder
- [x] Create file: `tests/unit/core/sync/transformers/skill-embedder.test.ts`
- [x] Add imports: `vitest`, `fs`, `path`, test utilities
- [x] Set up test fixtures with `createTestProject()` and skill files
- [x] Test case: Single placeholder replaced with skill content
- [x] Test case: Multiple placeholders in one template all replaced
- [x] Test case: Missing skill logs warning and keeps placeholder
- [x] Test case: Template with no placeholders returns unchanged
- [x] Test case: Mixed scenario - some skills exist, some missing
- [x] Test case: Malformed placeholder ignored (doesn't match regex)
- [x] Test case: File read error handled gracefully
- [x] Add cleanup logic in `afterEach()` hook

### 6. Integration Tests for Claude Code
- [x] Open `tests/unit/core/sync/claude-code.test.ts`
- [x] Add test suite: "skill placeholder embedding"
- [x] Test case: `transformCommandTemplate()` embeds skills from actual files
- [x] Test case: Embedded content matches source skill file exactly
- [x] Test case: Full sync transforms all command templates with placeholders
- [x] Test case: Force sync re-embeds skills (tests idempotency)

### 7. Integration Tests for OpenCode
- [x] Open `tests/unit/core/sync/opencode.test.ts`
- [x] Add test suite: "skill placeholder embedding"
- [x] Test case: `transformCommandTemplate()` embeds skills from actual files
- [x] Test case: Embedded content matches source skill file exactly
- [x] Test case: Full sync transforms all command templates with placeholders
- [x] Test case: Verify OpenCode-specific transformations still work after embedding

### 8. Run Test Suite
- [x] Run: `npm test` to execute all tests
- [x] Fix any failing tests
- [x] Verify test coverage includes new transformer
- [x] Check for edge cases or uncovered scenarios
