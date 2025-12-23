# Testing

## Manual Test Checklist

### Test 1: Verify Skill Deletion
- [ ] Confirm `resources/skills/nextai-guidelines/` directory no longer exists
- [ ] Run `nextai sync` in a test project
- [ ] Verify `.claude/skills/` or `.opencode/agent/` does not contain nextai-guidelines

### Test 2: Verify ai-team-lead Update
- [ ] Read `resources/agents/ai-team-lead.md`
- [ ] Confirm "NextAI Workflow" section is present
- [ ] Verify it includes guidance to use slash commands
- [ ] Verify it explicitly warns against writing artifacts directly

### Test 3: Verify Phase Skills Updated
- [ ] Check `refinement-product-requirements/SKILL.md` has "Next Steps" section
- [ ] Check `refinement-technical-specs/SKILL.md` has "Next Steps" section
- [ ] Check `executing-plans/SKILL.md` has "Next Steps" section
- [ ] Check `reviewer-checklist/SKILL.md` has "Next Steps" section
- [ ] Verify each prompts the correct next slash command

### Test 4: Integration Test in Consumer Project (honestli-android)
- [ ] Navigate to `research/projects-with-nextai/honestli-android`
- [ ] Run `nextai sync` to update with new resources
- [ ] Create a new test feature: `nextai create "Test workflow fix" --type feature`
- [ ] Use Claude to run `/nextai-refine <id>` with ai-team-lead
- [ ] Verify Claude uses the slash command, doesn't write files directly
- [ ] Check `.nextai/state/ledger.json` to verify phase advanced to `product_refinement`
- [ ] Continue through one full cycle (refine → implement → review)
- [ ] Verify ledger updates correctly after each phase
- [ ] Run `nextai show <id>` and verify phase matches actual artifacts

### Test 5: Verify No References Remain
- [ ] Run `grep -r "nextai-guidelines" resources/` from project root
- [ ] Verify no results (or only in comments/docs as historical reference)
- [ ] Check that no code references the deleted skill

### Test 6: Existing Feature State (Optional)
- [ ] Navigate to `research/projects-with-nextai/honestli-android`
- [ ] Run `nextai show 20251223_continuous-location-updates`
- [ ] Note current phase (should still be product_refinement due to stale ledger)
- [ ] This feature's ledger is stale but artifacts are correct
- [ ] User can manually advance or re-run phases with proper commands

---

## Test Sessions
