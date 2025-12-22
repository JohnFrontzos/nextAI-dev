# Implementation Tasks

## Pre-implementation
- [ ] Review existing sync and scaffolding code to understand current flow
- [ ] Verify resources directory structure matches expected patterns
- [ ] Review all usages of --force flag in init and sync commands

## Core Implementation

### 1. Auto-Discovery (src/core/sync/resources.ts)
- [ ] Create scanResourcesFromPackage() function to replace hardcoded manifest
- [ ] Implement directory scanning for agents (.md files in resources/agents/)
- [ ] Implement directory scanning for skills (directories with SKILL.md in resources/skills/)
- [ ] Implement directory scanning for commands (.md files in resources/templates/commands/)
- [ ] Add error handling for missing or unreadable directories
- [ ] Replace getResourceManifest() calls with scanResourcesFromPackage()
- [ ] Test with empty directories to ensure graceful fallback

### 2. Enhanced Change Tracking (src/core/sync/resources.ts)
- [ ] Create ResourceStats interface (total, new, updated, unchanged)
- [ ] Update CopyResult interface to use ResourceStats for each resource type
- [ ] Implement change detection logic in copyResourcesToNextAI():
  - [ ] Check if destination file exists (determines "new")
  - [ ] Compare file content to determine if modified (determines "updated")
  - [ ] Track unchanged files
  - [ ] Update stats for each operation
- [ ] Add helper function to compare file contents (readFileSync + string comparison)
- [ ] Ensure error handling still populates errors array

### 3. Framework File Management (src/core/scaffolding/project.ts)
- [ ] Remove force checks from copyAgentTemplates() for .nextai/ operations
- [ ] Remove force checks from copySkillTemplates() for .nextai/ operations
- [ ] Remove force checks from copyCommandTemplates() for .nextai/ operations
- [ ] Update scaffoldProject() to always pass force for .nextai/ initialization
- [ ] Review and document which operations respect force flag (user space only)

### 4. Deprecated Resource Removal (src/core/sync/resources.ts)
- [ ] Create removeDeprecatedResources() function
- [ ] Implement logic to remove agents not in current manifest from .nextai/agents/
- [ ] Implement logic to remove skills not in current manifest from .nextai/skills/
- [ ] Implement logic to remove commands not in current manifest from .nextai/templates/commands/
- [ ] Add error handling for file deletion failures
- [ ] Ensure function only operates on .nextai/ directory (never .claude/)
- [ ] Call removeDeprecatedResources() from copyResourcesToNextAI()

### 5. Output Formatting (src/cli/commands/sync.ts)
- [ ] Create formatResourceStats() helper function
- [ ] Update sync command output to use new format: "Commands: 13 (1 new, 2 updated)"
- [ ] Handle "no changes" case when new=0 and updated=0
- [ ] Update auto-update mode output (lines 112-131)
- [ ] Update normal sync mode output (lines 162-164, 197-201)
- [ ] Ensure error messages still display from CopyResult.errors

### 6. Init Command Review (src/cli/commands/init.ts)
- [ ] Review all --force flag usages in init command
- [ ] Ensure scaffoldProject() always updates framework files in .nextai/
- [ ] Verify sync call uses force:true for initial setup (line 97)
- [ ] Update output messages if needed to reflect new stats format
- [ ] Document decision on --force flag behavior in code comments

### 7. Documentation (README.md)
- [ ] Add "Upgrading NextAI" section after installation section
- [ ] Include 3-step upgrade process: npm install, nextai init, nextai sync
- [ ] Explain that framework files auto-update
- [ ] Add clear, simple code examples
- [ ] Ensure formatting is consistent with rest of README

### 8. Type Updates
- [ ] Update consumers of CopyResult to handle new ResourceStats structure
- [ ] Update any TypeScript interfaces or types referencing the old CopyResult
- [ ] Ensure backward compatibility where needed

## Unit Tests

- [ ] Write tests for scanResourcesFromPackage():
  - [ ] Test with complete resources directory
  - [ ] Test with missing agents directory
  - [ ] Test with missing skills directory
  - [ ] Test with missing commands directory
  - [ ] Test filtering of non-.md files in agents
  - [ ] Test filtering of skill directories without SKILL.md
  - [ ] Test error handling for unreadable directories
- [ ] Write tests for change detection:
  - [ ] Test detection of new files (destination doesn't exist)
  - [ ] Test detection of updated files (content differs)
  - [ ] Test detection of unchanged files (content identical)
  - [ ] Test stats tracking accuracy
- [ ] Write tests for removeDeprecatedResources():
  - [ ] Test removal of deprecated agents
  - [ ] Test removal of deprecated skills
  - [ ] Test removal of deprecated commands
  - [ ] Test error handling for locked/unreadable files
- [ ] Write tests for formatResourceStats():
  - [ ] Test output with new files only
  - [ ] Test output with updated files only
  - [ ] Test output with both new and updated
  - [ ] Test output with no changes
- [ ] Update existing tests that depend on old CopyResult structure
- [ ] Ensure all tests pass

## Post-Implementation Verification
- [ ] Run build and verify no TypeScript errors
- [ ] Run all tests and ensure they pass
- [ ] Test in local development environment with nextai link
