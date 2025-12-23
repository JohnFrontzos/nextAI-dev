# Bug: Fix phase detection

## Description
Phase detection broken after nextai-guidelines update. Feature 20251223_continuous-location-updates in honestli-android has all artifacts through testing (requirements.md, spec.md, tasks.md, review.md with PASS, testing.md with 2 sessions) but ledger shows phase stuck at product_refinement. Phase should be testing. Investigate detectPhaseFromArtifacts and phase transition logic.

## Context

**Observed in:** `research/projects-with-nextai/honestli-android`

**Feature ID:** `20251223_continuous-location-updates`

**Current State (from ledger.json):**
```json
{
  "phase": "product_refinement",
  "updated_at": "2025-12-23T12:43:56.669Z"
}
```

**Actual Artifacts Present:**
- `planning/initialization.md` ✓
- `planning/requirements.md` ✓ (product refinement complete)
- `spec.md` ✓ (tech spec complete)
- `tasks.md` ✓ (implementation tasks defined)
- `review.md` ✓ (Session 2: PASS verdict)
- `testing.md` ✓ (2 test sessions, both FAIL due to design refinements - this is expected behavior, feature is IN TESTING)

**Expected Phase:** `testing`

**Actual Phase in Ledger:** `product_refinement`

**Possible Causes:**
1. `detectPhaseFromArtifacts()` not correctly detecting all artifacts
2. Phase transition not being triggered after review PASS
3. Ledger not updated when artifacts are created/modified
4. New `nextai-guidelines` skill may have interfered with phase detection
5. Race condition in phase updates

**Related Recent Changes:**
- v0.2.3/v0.2.4 version updates
- `nextai-guidelines` skill added
- Refinement skills renamed (refinement-questions → refinement-product, refinement-spec-writer → refinement-technical)

## Acceptance Criteria
- [ ] Bug is reproduced
- [ ] Root cause identified
- [ ] Phase detection correctly identifies `testing` phase when review.md has PASS and testing.md exists
- [ ] Ledger correctly updated on phase transitions
- [ ] Fix verified in honestli-android project

## Evidence
See: `research/projects-with-nextai/honestli-android/.nextai/state/ledger.json`
See: `research/projects-with-nextai/honestli-android/nextai/todo/20251223_continuous-location-updates/`

## Notes
This is a critical bug - incorrect phase detection breaks the entire workflow visibility.

---

## Additional Issue: nextai-guidelines skill not enforcing workflow

**Symptom:** The `nextai-guidelines` skill was supposed to guide Claude to use NextAI commands (`/nextai-refine`, `/nextai-implement`, `/nextai-review`, `/nextai-testing`) but instead Claude's ai-team-lead agent skipped the commands entirely and started developing directly.

**Expected Behavior:** When nextai-guidelines is loaded, Claude should:
1. Recognize the NextAI workflow
2. Run `/nextai-refine <id>` for refinement phase
3. Run `/nextai-implement <id>` for implementation phase
4. Run `/nextai-review <id>` for review phase
5. Run `/nextai-testing <id>` for testing phase

**Actual Behavior:** Claude bypassed the NextAI commands and wrote artifacts directly (requirements.md, spec.md, tasks.md, review.md, testing.md) without calling the skills, resulting in:
1. Ledger not being updated (phase stuck at product_refinement)
2. Metrics not being collected
3. History not being logged
4. Workflow guardrails bypassed

**Root Cause Hypothesis:** The nextai-guidelines skill content may not be strong enough to override Claude's default behavior, or the skill isn't being loaded/triggered correctly in the consumer project.

**Proposed Solution:** Remove the `nextai-guidelines` skill entirely and return to the simpler, working approach:

1. **Keep minimal info in ai-team-lead agent** - Just enough context about NextAI workflow
2. **Each phase skill prompts the next command** - At phase completion, show the user what slash command to run next (e.g., "Next: Run `/nextai-implement <id>`")
3. **User-driven workflow** - Don't try to make Claude automatically chain commands; let the user control the flow

This was working correctly in previous versions before the guidelines skill was added.

**Files to Change:**
- `resources/skills/nextai-guidelines/` - DELETE (remove the skill)
- `resources/agents/ai-team-lead.md` - Add minimal NextAI context
- Phase completion skills - Ensure they prompt the next command
- `src/core/scaffolding/project.ts` - Remove nextai-guidelines from sync

**Benefits of this approach:**
- Simpler, fewer moving parts
- User stays in control
- Phase transitions happen through CLI commands (ledger/metrics updated correctly)
- Was already working before
