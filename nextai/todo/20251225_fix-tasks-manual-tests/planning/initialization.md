# Bug: Fix tasks manual tests

## Original Request
The refinement process generates manual testing tasks in both `tasks.md` (implementation phase) and `testing.md` (testing phase). This causes two problems:

1. **Phase advancement validation fails** - The `advance` command checks if all tasks in `tasks.md` are complete (`[x]`). When `tasks.md` contains unchecked manual test tasks that shouldn't be checked until the testing phase, advancement from `implementation` to `review` fails with:
   ```
   ✗ Cannot advance to 'review'
   Phase 'product_refinement' is not complete. Cannot start 'review'.
   ```

2. **Manual tests are duplicated** - The same manual testing steps appear in both files, creating confusion about which file is authoritative for manual testing.

## Type
bug

## Initial Context

### Evidence from Recent Bugs
Looking at `20251225_fix-initledger-overwrite/planning/tasks.md`:
- Task 4.4-4.6: Manual verification tasks are `[ ]` unchecked (lines 143-166)
- Task 5.2: CHANGELOG update is `[ ]` unchecked
- Task 7.1, 7.3, 7.4: Commit/staging tasks are `[ ]` unchecked

Looking at `20251225_repair-doesnt-rebuild-ledger/planning/tasks.md`:
- ALL tasks remain unchecked `[ ]` even though implementation was completed
- Phase 7: Manual Testing section duplicates content from testing.md

### Root Cause Location
The `technical-architect` agent template (`resources/agents/technical-architect.md`) generates `tasks.md` with manual testing sections that should only be in `testing.md`.

### Expected Behavior
- `tasks.md` should ONLY contain automated implementation tasks (code changes, automated tests)
- Manual testing steps should ONLY appear in `testing.md`
- Phase advancement validation should pass when all automated tasks are complete

### Affected Components
1. `resources/agents/technical-architect.md` - Generates tasks.md with manual tests
2. `src/cli/commands/advance.ts` - Validates task completion
3. Possibly `resources/skills/refinement-technical-specs.md` - May instruct to include manual tests

## Acceptance Criteria
- [ ] `tasks.md` template/generation excludes manual testing tasks
- [ ] Manual testing tasks only appear in `testing.md`
- [ ] Phase advancement from `implementation` to `review` works when automated tasks are complete
- [ ] Existing feature workflows are not broken
- [ ] Update technical-architect agent template

## Attachments
None
