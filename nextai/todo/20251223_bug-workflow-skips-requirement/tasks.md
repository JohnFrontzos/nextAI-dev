# Implementation Tasks

## Pre-implementation
- [x] Review the 4 files to understand current content and exact line locations
- [x] Verify the exact text to be replaced in each file
- [x] Check that no other files reference `planning/investigation.md`

## Core Implementation

### Change 1: Update Orchestrator Template
- [x] Open `resources/templates/commands/refine.md`
- [x] Locate the "Context to provide the investigator subagent" section (around line 194)
- [x] Add new line after "Feature ID: $ARGUMENTS": `- Output: \`nextai/todo/$ARGUMENTS/planning/requirements.md\` (investigation findings)`
- [x] Verify the context section now has 5 bullet points instead of 4

### Change 2: Fix Agent Definition
- [x] Open `resources/agents/investigator.md`
- [x] Locate line 35 in the "Workflow" section
- [x] Replace "Together these skills help you analyze bugs, gather evidence, trace causation, and document findings in planning/investigation.md." with "Together these skills help you analyze bugs, gather evidence, trace causation, and document findings."
- [x] Verify line 27 still correctly documents output as `planning/requirements.md`

### Change 3: Clean Up Root Cause Tracing Skill
- [x] Open `resources/skills/root-cause-tracing/SKILL.md`
- [x] Locate the "Output Format" section (around line 60)
- [x] Replace "Write findings to \`planning/requirements.md\`:" with "Write findings to the investigation document:"
- [x] Verify the markdown template below this line remains unchanged

### Change 4: Clean Up Systematic Debugging Skill
- [x] Open `resources/skills/systematic-debugging/SKILL.md`
- [x] Locate the "Documentation" section (around line 117)
- [x] Replace "Throughout debugging, update \`planning/requirements.md\`:" with "Throughout debugging, update the investigation document:"
- [x] Verify the markdown template below this line remains unchanged

## Post-Implementation
- [x] Run `nextai sync` to propagate changes from resources/ to .claude/ and .nextai/
- [x] Verify the sync completed successfully (check command output)
- [x] Verify changes appear in `.claude/commands/nextai-refine.md`
- [x] Verify changes appear in `.claude/agents/investigator.md`
- [x] Verify changes appear in `.claude/skills/root-cause-tracing/SKILL.md`
- [x] Verify changes appear in `.claude/skills/systematic-debugging/SKILL.md`
