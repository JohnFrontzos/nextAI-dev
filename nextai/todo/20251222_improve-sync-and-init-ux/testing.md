# Testing

## Manual Test Checklist
<!-- Generated during refinement based on spec.md Testing Strategy -->

### Auto-Discovery Testing
- [ ] Verify all existing agents are discovered (7 agent files)
- [ ] Verify all existing skills are discovered (8 skill directories)
- [ ] Verify all existing commands are discovered (13 command files)
- [ ] Add a new agent file to resources/agents/ and verify it's auto-discovered
- [ ] Add a new skill directory with SKILL.md and verify it's auto-discovered
- [ ] Add a new command to resources/templates/commands/ and verify it's auto-discovered
- [ ] Test with missing resources/agents/ directory (should create placeholders)
- [ ] Test with empty resources/skills/ directory (should skip gracefully)
- [ ] Add a non-.md file to resources/agents/ and verify it's ignored
- [ ] Add a skill directory without SKILL.md and verify it's ignored

### Change Tracking Testing
- [ ] Fresh init: Verify output shows all files as "new"
- [ ] Run sync twice: Verify second run shows "no changes"
- [ ] Modify a file in resources/agents/ and verify it shows as "updated"
- [ ] Add a new file and modify existing: Verify output shows both "new" and "updated" counts
- [ ] Delete a file from .nextai/agents/ and run sync: Verify output shows it as "new" again

### Output Format Testing
- [ ] Verify output format matches: "Commands: 13 (1 new, 2 updated)"
- [ ] Verify "no changes" appears when nothing changed
- [ ] Verify counts are accurate for each resource type
- [ ] Test auto-update mode output (upgrade scenario)
- [ ] Test normal sync mode output
- [ ] Test error messages display correctly when copy fails

### Framework File Management Testing
- [ ] Run nextai init: Verify .nextai/ files are created
- [ ] Manually modify a file in .nextai/agents/: Run nextai init again and verify it's overwritten
- [ ] Run nextai init without --force: Verify .nextai/ files still update
- [ ] Manually create a custom file in .claude/agents/: Run sync and verify it's NOT overwritten without --force
- [ ] Run sync with --force: Verify custom .claude/ file is overwritten

### Deprecated Resource Removal Testing
- [ ] Remove a skill from resources/skills/ directory
- [ ] Run nextai init: Verify the skill is removed from .nextai/skills/
- [ ] Verify the skill is NOT removed from .claude/skills/
- [ ] Remove an agent from resources/agents/ directory
- [ ] Run nextai init: Verify the agent is removed from .nextai/agents/
- [ ] Remove a command from resources/templates/commands/ directory
- [ ] Run nextai init: Verify the command is removed from .nextai/templates/commands/

### Upgrade Scenario Testing
- [ ] Simulate package upgrade: Add a new skill to resources/
- [ ] Run nextai init: Verify new skill appears in .nextai/
- [ ] Run nextai sync: Verify new skill syncs to .claude/
- [ ] Verify output shows "1 new" for skills

### Downgrade Scenario Testing
- [ ] Simulate package downgrade: Remove a skill from resources/
- [ ] Run nextai init: Verify skill is removed from .nextai/
- [ ] Verify skill is preserved in .claude/ (user space protection)
- [ ] Verify output accurately reflects the change

### Cross-Platform Testing
- [ ] Test on Windows: Verify all operations work correctly
- [ ] Test on Unix-like system (Linux/macOS): Verify all operations work correctly
- [ ] Test with case-sensitive filesystem: Verify filtering works correctly
- [ ] Test with case-insensitive filesystem: Verify no duplicate files

### Error Handling Testing
- [ ] Make resources/agents/ directory unreadable: Verify graceful fallback
- [ ] Make a file in .nextai/agents/ read-only: Verify error is collected in errors array
- [ ] Delete resources/ directory entirely: Verify fallback to placeholder creation
- [ ] Test with malformed skill directory structure: Verify filtering works

### README Documentation Testing
- [ ] Verify "Upgrading NextAI" section exists in README
- [ ] Verify upgrade instructions are clear and accurate
- [ ] Follow upgrade instructions manually: npm install, nextai init, nextai sync
- [ ] Verify upgrade process completes successfully
- [ ] Verify documentation matches actual behavior

### Backward Compatibility Testing
- [ ] Test existing project with old .nextai/ structure: Verify it upgrades smoothly
- [ ] Test project with custom agents in .claude/: Verify they're preserved
- [ ] Test project with no AI client detected: Verify init still works

### Performance Testing
- [ ] Measure directory scanning time with current resources (should be <100ms)
- [ ] Test with 100+ files in resources/: Verify acceptable performance
- [ ] Verify no performance regression in sync operation

---

## Test Sessions
<!-- Populated during /testing phase -->
