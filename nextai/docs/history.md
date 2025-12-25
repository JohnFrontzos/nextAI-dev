# Feature History

Completed features are archived in `nextai/done/` with full artifacts.

| Date | Feature ID | Type | Summary | Archive |
|------|------------|------|---------|---------|
| 2025-12-25 | 20251225_repair-doesnt-rebuild-ledger | bug | Extended repair command to detect and reconstruct missing ledger entries from feature folders in todo/ and done/ directories | [summary](../done/20251225_repair-doesnt-rebuild-ledger/summary.md) |
| 2025-12-25 | 20251225_fix-initledger-overwrite | bug | Fixed critical data loss bug where initLedger() overwrote existing ledger during re-initialization. Ledgers are now preserved unless corrupted. | [summary](../done/20251225_fix-initledger-overwrite/summary.md) |
| 2025-12-24 | 20251224_update-agent-templates | feature | Established canonical base format for agents/skills with platform-specific transformers, enabling multi-platform support (Claude Code and OpenCode) from a single source of truth in resources/ directory | [summary](../done/20251224_update-agent-templates/summary.md) |
| 2025-12-24 | 20251224_missing-investigator-skills | bug | Fixed investigator agent skill integration by adding skillDependencies frontmatter for native skill loading, and replaced "(Future)" placeholders with complete test failure investigation delegation using testing-investigator workflow skill | [summary](../done/20251224_missing-investigator-skills/summary.md) |
| 2025-12-23 | 20251223_nextai-usage-guidelines-skill | feature | Created comprehensive usage guidelines skill to educate AI agents about NextAI architecture, CLI usage, directory structure, auto-managed files, and common pitfalls. Integrated with ai-team-lead agent for consistent workflow understanding. | [summary](../done/20251223_nextai-usage-guidelines-skill/summary.md) |
| 2025-12-22 | 20251222_fix-phase-transition-edge-case | bug | Fixed two edge cases in phase detection: review phase now correctly shows as incomplete when verdict is FAIL, and testing phase is properly detected when testing.md contains status: fail | [summary](../done/20251222_fix-phase-transition-edge-case/summary.md) |
| 2025-12-21 | 20251221_handle-spec-changes-in-testing | feature | Extended testing-investigator skill to detect specification changes during test failures, added user approval flow with Yes/No/Cancel options, and implemented metrics tracking for spec change events | [summary](../done/20251221_handle-spec-changes-in-testing/summary.md) |
| 2025-12-21 | 20251212_remove-manual-verification-fro | feature | Redesigned testing workflow with dedicated testing.md file, eliminated manual verification from tasks.md, added hybrid testing command modes, and integrated test failure investigation | [summary](../done/20251212_remove-manual-verification-fro/summary.md) |
| 2025-12-12 | 20251212_add-readme-badges | task | Added professional shields.io badges, MIT LICENSE file, and updated README documentation sections | [summary](../done/20251212_add-readme-badges/summary.md) |
| 2025-12-11 | 20251211_cleanup-agents-skills-commands | task | Refactored agents/skills/commands to eliminate duplication and establish skills as single source of truth | [summary](../done/20251211_cleanup-agents-skills-commands/summary.md) |
| 2025-12-11 | 20251209_version-aware-auto-update-sync | feature | Version-aware auto-update sync for templates | [summary](../done/20251209_version-aware-auto-update-sync/summary.md) |
| 2025-12-10 | 20251209_skills-not-found-despite-exist | bug | Fix skill discovery by flattening directory structure | [summary](../done/20251209_skills-not-found-despite-exist/summary.md) |
| 2025-12-09 | 20251209_delete-slash-command-for-todo | feature | Remove feature command for safe cleanup | [summary](../done/20251209_delete-slash-command-for-todo/summary.md) |
| 2025-12-09 | 20251209_subagents-not-using-assigned-s | bug | Fix subagents not loading assigned skills | [summary](../done/20251209_subagents-not-using-assigned-s/summary.md) |
| 2025-12-09 | 20251209_investigator-bypasses-technica | bug | Investigator agent workflow bypass fix | [summary](../done/20251209_investigator-bypasses-technica/summary.md) |
| 2025-12-09 | 20251209_ai-review-phase-not-auto-start | bug | Auto-transition between implementation and review phases | [summary](../done/20251209_ai-review-phase-not-auto-start/summary.md) |
| 2025-12-09 | 20251208_complete-command-archives-befo | bug | Fix complete command phase update timing | [summary](../done/20251208_complete-command-archives-befo/summary.md) |
| 2025-12-08 | 20251207_import-archived-features-from-1 | feature | Import archived features from OpenSpec | [summary](../done/20251207_import-archived-features-from-1/summary.md) |

## Archive Contents

Each archived feature contains:
- `summary.md` - AI-generated completion summary
- `planning/` - Original initialization and requirements
- `spec.md` - Technical specification
- `tasks.md` - Implementation checklist (code tasks only)
- `testing.md` - Manual test checklist and session log
- `review.md` - Code review results

## Viewing Archives

Use `/nextai-show <id>` to view details of any archived feature, or browse the `nextai/done/` directory directly.
