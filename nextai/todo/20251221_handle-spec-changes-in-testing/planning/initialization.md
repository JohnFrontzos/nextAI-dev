# Feature: Handle spec changes in testing

## Original Request
Handle changes to specifications when a feature is in the testing phase. Currently if specs change during testing, there's no clear workflow for re-validating or updating the test plan accordingly.

## Type
feature

## Initial Context

### Problem Statement
When a feature reaches the testing phase, the specifications (spec.md) are considered "locked" but in practice they may need to change due to:
- Discovered edge cases during testing
- Clarified requirements from stakeholders
- Technical constraints found during implementation
- Bug fixes that require spec amendments

### Current Behavior
There's no defined workflow for handling spec changes once testing begins. This leads to:
- Confusion about whether to update specs or just note discrepancies
- Testing against outdated specs
- Unclear versioning of what was actually tested

## Refined Scope (Integrated with Investigator)

### Trigger Point
- **Testing phase only** - not other phases
- **When operator marks a test as FAIL** - and provides failure description
- **Investigator agent handles both** - bug investigation AND spec change detection

### Detection Flow
1. Operator runs `/nextai-testing` and marks a test as FAIL with description
2. **Investigator agent** analyzes the failure (reads spec.md, testing.md, code, etc.)
3. Investigator determines: Is this a **BUG** or a **SPEC CHANGE**?
4. **If BUG** → Writes investigation report to testing.md → Return to implementation (existing flow)
5. **If SPEC CHANGE** → Prompt user for approval:
   - **Yes** → Append to initialization.md + Reset to product_refinement
   - **No** → Treat as bug, write investigation report → Return to implementation
   - **Cancel** → Stay in testing, no changes

### Spec Change Criteria
**IS a spec change:**
- Changes agreed-upon behavior/features
- Adds NEW functionality not in original spec
- Requires significant code changes (not single-line fixes)

**NOT a spec change:**
- Simple fixes (like changing sort order)
- Bug fixes that restore original intended behavior
- Single-line code changes

### What Happens on Approval
- **No archiving** - just overwrite like existing re-run behavior
- Append the spec change description to `initialization.md`
- Reset phase to `product_refinement`
- Re-run both product and technical refinement (overwrites existing files)
- Generate fresh requirements.md, spec.md, tasks.md, testing.md

### User Approval Flow
- Inform user: "This appears to be a spec change: [reason]. This will restart refinement and overwrite existing specs."
- Options:
  - **Yes** = proceed with re-refinement (full reset)
  - **No** = treat as regular bug, continue testing
  - **Cancel** = stop and wait for input

### Metrics Tracking
- Log all spec change events for analysis
- Track: timestamp, feature ID, reason, user decision

## Out of Scope (Future)
- Implementation phase spec changes
- Review phase spec changes
- Explicit `--spec-change` flag on commands
- Archiving previous specs (currently just overwrites)
- Spec diff viewer

## Attachments
None provided.
