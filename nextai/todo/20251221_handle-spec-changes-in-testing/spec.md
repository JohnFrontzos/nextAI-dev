# Handle Spec Changes in Testing

## Overview
This feature extends the testing-investigator skill to detect specification changes during test failure investigation. When a test fails, the Investigator agent analyzes whether the failure represents a bug or a specification change, prompting the user for approval before resetting to product refinement.

## Requirements Summary
- Testing phase only (triggered by FAIL status)
- Investigator agent performs both bug investigation AND spec change classification
- User approval flow with Yes/No/Cancel options
- Approved spec changes append to initialization.md and reset to product_refinement
- Declined spec changes write investigation report and return to implementation
- Metrics tracking for spec change events
- No archiving of previous specs (overwrite on re-run)

## Technical Approach

### Integration Point
Enhance the existing `triggerInvestigator()` function in `src/cli/commands/testing.ts` (currently lines 64-76) to invoke the Investigator agent using the testing-investigator skill and handle the classification result.

### Workflow
```
FAIL logged (via /nextai-testing)
  ↓
triggerInvestigator() invokes Investigator agent
  ↓
Investigator analyzes (reads spec.md, code, failure notes)
  ↓
Investigator classifies: BUG or SPEC_CHANGE?
  ↓
  ├─ BUG (or <70% confidence)
  │   ↓
  │   Write investigation report → Return to implementation (existing)
  │
  └─ SPEC_CHANGE (>70% confidence)
      ↓
      Prompt user (Yes/No/Cancel)
      ↓
      ├─ Yes: Append to initialization.md + Reset to product_refinement
      ├─ No: Write investigation report → Return to implementation
      └─ Cancel: Stay in testing, no changes
```

## Architecture

### Components Involved

1. **testing-investigator skill** (`resources/skills/testing-investigator/SKILL.md`)
   - Extended with "Phase 0: Classification" section
   - Outputs classification result before investigation

2. **testing.ts** (`src/cli/commands/testing.ts`)
   - `triggerInvestigator()` enhanced to invoke agent and handle classification
   - User approval prompt integration
   - Phase reset logic

3. **Metrics System** (`src/core/metrics/`)
   - New spec change metrics writer
   - JSONL format for spec-changes.jsonl

4. **State Management** (`src/core/state/ledger.ts`)
   - Reuse `updateFeaturePhase()` for phase reset

### Data Flow

```
User runs: /nextai-testing <id> --status fail --notes "..."
  ↓
testing.ts logs FAIL → calls triggerInvestigator()
  ↓
triggerInvestigator() invokes Investigator agent with:
  - Feature ID
  - Failure notes
  - Attachments
  - Spec.md path
  - Testing.md path
  - Tasks.md path
  ↓
Investigator agent (using testing-investigator skill):
  - Phase 0: Quick classification (BUG vs SPEC_CHANGE)
  - Returns: { classification, confidence, reasoning, specChangeDescription }
  ↓
triggerInvestigator() handles result:
  - If BUG → return (existing flow continues)
  - If SPEC_CHANGE → prompt user
  ↓
User selects option:
  - Yes → appendToInitialization() + updateFeaturePhase('product_refinement') + logMetrics()
  - No → (Investigator writes bug report) + return to implementation
  - Cancel → exit, stay in testing
```

### Integration Points

- **Agent Invocation**: Use existing agent system (to be determined based on SDK implementation)
- **User Prompts**: `selectOption()` from `src/cli/utils/prompts.ts`
- **Phase Management**: `updateFeaturePhase()` from `src/core/state/ledger.ts`
- **Metrics**: Pattern from `src/core/metrics/metrics-writer.ts`

## Implementation Details

### 1. Extend testing-investigator Skill

**File**: `resources/skills/testing-investigator/SKILL.md`

**Changes**:
- Add new section before "Phase 1: Context Gathering":
  ```markdown
  ### Phase 0: Classification

  Before deep investigation, perform quick classification:
  1. Read spec.md to understand agreed-upon behavior
  2. Read failure notes to understand what went wrong
  3. Determine: Is this a BUG or SPEC_CHANGE?

  **Classification Criteria:**

  **SPEC_CHANGE (>70% confidence):**
  - Changes agreed-upon behavior/features described in spec.md
  - Adds NEW functionality not mentioned in spec.md
  - Requires significant code changes (not single-line fixes)

  **BUG (<70% confidence, default):**
  - Simple fixes like changing sort order or formatting
  - Restores original intended behavior from spec.md
  - Single-line code changes or minor adjustments
  - Code does not match what spec.md describes

  **Output Format:**
  ```json
  {
    "classification": "BUG" | "SPEC_CHANGE",
    "confidence": 0-100,
    "reasoning": "Explanation of why...",
    "specChangeDescription": "What needs to change in spec (only if SPEC_CHANGE)"
  }
  ```

  If classification is BUG, continue to Phase 1.
  If classification is SPEC_CHANGE with >70% confidence, return early for user approval.
  ```

### 2. Enhance triggerInvestigator()

**File**: `src/cli/commands/testing.ts`

**Current (lines 64-76)**:
```typescript
async function triggerInvestigator(
  projectRoot: string,
  featureId: string,
  failureNotes: string,
  attachments: string[]
): Promise<void> {
  // Placeholder for future investigator integration
  logger.dim('Investigation trigger: Future integration with testing-investigator skill');
  logger.dim(`Failure notes: ${failureNotes}`);
  if (attachments.length > 0) {
    logger.dim(`Attachments: ${attachments.join(', ')}`);
  }
}
```

**New Implementation**:
```typescript
async function triggerInvestigator(
  projectRoot: string,
  featureId: string,
  failureNotes: string,
  attachments: string[]
): Promise<void> {
  // 1. Get feature paths
  const featurePath = getFeaturePath(projectRoot, featureId);
  const specPath = join(featurePath, 'spec.md');
  const testingPath = join(featurePath, 'testing.md');
  const tasksPath = join(featurePath, 'tasks.md');

  // 2. Check if spec.md exists (edge case)
  if (!existsSync(specPath)) {
    logger.warn('Cannot analyze spec change - spec.md not found');
    logger.dim('Defaulting to bug investigation. Run /nextai-refine first if needed.');
    return;
  }

  // 3. Invoke Investigator agent with testing-investigator skill
  // TODO: Agent SDK integration
  // For now, log what would happen
  logger.info('Invoking Investigator agent for failure analysis...');

  // 4. Parse agent response
  const classification = {
    classification: 'SPEC_CHANGE', // Mock for now
    confidence: 85,
    reasoning: 'The failure indicates a change to core behavior described in spec.md section 3.2',
    specChangeDescription: 'Update authentication flow to redirect to /dashboard instead of /login'
  };

  // 5. Handle classification
  if (classification.classification === 'BUG' || classification.confidence < 70) {
    // Continue with existing bug investigation flow
    logger.dim('Classified as bug - investigation report will be written to testing.md');
    return;
  }

  // 6. Spec change detected - prompt user
  await handleSpecChangeApproval(
    projectRoot,
    featureId,
    failureNotes,
    classification.reasoning,
    classification.confidence,
    classification.specChangeDescription
  );
}
```

### 3. User Approval Flow

**File**: `src/cli/commands/testing.ts`

**New Function**:
```typescript
async function handleSpecChangeApproval(
  projectRoot: string,
  featureId: string,
  failureDescription: string,
  reasoning: string,
  confidence: number,
  specChangeDescription: string
): Promise<void> {
  // Display spec change detection
  logger.blank();
  logger.warn(`Spec change detected in feature ${featureId}`);
  logger.blank();
  logger.keyValue('Failure Description', failureDescription.substring(0, 200) + '...');
  logger.keyValue('Analysis', reasoning);
  logger.keyValue('Confidence', `${confidence}%`);
  logger.blank();
  logger.dim('This will:');
  logger.dim('1. Append the spec change to initialization.md');
  logger.dim('2. Reset to product_refinement phase');
  logger.dim('3. Re-run refinement (overwrites existing specs)');
  logger.blank();

  // Prompt user
  const decision = await selectOption<'yes' | 'no' | 'cancel'>(
    'How would you like to proceed?',
    [
      { value: 'yes', name: 'Yes - Approve spec change and restart refinement' },
      { value: 'no', name: 'No - Treat as bug, return to implementation' },
      { value: 'cancel', name: 'Cancel - Stop and wait for manual input' }
    ]
  );

  // Handle decision
  switch (decision) {
    case 'yes':
      await approveSpecChange(projectRoot, featureId, specChangeDescription);
      break;
    case 'no':
      await declineSpecChange(projectRoot, featureId, failureDescription);
      break;
    case 'cancel':
      logger.info('Cancelled. Feature remains in testing phase.');
      logger.dim(`Run /nextai-testing ${featureId} when ready.`);
      break;
  }
}
```

### 4. Approval Actions

**File**: `src/cli/commands/testing.ts`

**New Functions**:
```typescript
async function approveSpecChange(
  projectRoot: string,
  featureId: string,
  specChangeDescription: string
): Promise<void> {
  // 1. Append to initialization.md
  const featurePath = getFeaturePath(projectRoot, featureId);
  const initPath = join(featurePath, 'planning', 'initialization.md');

  const specChangeEntry = `\n## Spec Changes\n\n### ${new Date().toISOString()}\n${specChangeDescription}\n`;

  if (existsSync(initPath)) {
    appendFileSync(initPath, specChangeEntry);
  } else {
    logger.warn('initialization.md not found - spec change will not be recorded');
  }

  // 2. Log metrics
  await logSpecChangeMetrics(projectRoot, featureId, 'approved', specChangeDescription);

  // 3. Reset phase to product_refinement
  const result = await updateFeaturePhase(projectRoot, featureId, 'product_refinement', { skipValidation: true });

  if (result.success) {
    logger.success('Spec change approved');
    logger.info('Phase reset to product_refinement');
    logger.blank();
    logger.dim('Next step: Run /nextai-refine to restart refinement with updated requirements');
    printNextCommand(featureId, 'product_refinement', featurePath);
  } else {
    logger.error('Failed to reset phase');
    logger.dim(result.error || 'Unknown error');
  }
}

async function declineSpecChange(
  projectRoot: string,
  featureId: string,
  failureDescription: string
): Promise<void> {
  // 1. Log metrics
  await logSpecChangeMetrics(projectRoot, featureId, 'declined', failureDescription);

  // 2. Let investigator write bug report (existing flow)
  logger.info('Treating as bug - investigation report will be generated');
  logger.dim('The Investigator will write findings to testing.md');

  // Phase already transitioned to implementation in main testing command
  logger.blank();
  logger.dim('Fix the issues and run through review again before re-testing.');
}
```

### 5. Metrics Logging

**File**: `src/cli/commands/testing.ts`

**New Function**:
```typescript
async function logSpecChangeMetrics(
  projectRoot: string,
  featureId: string,
  userDecision: 'approved' | 'declined' | 'cancelled',
  description: string
): Promise<void> {
  try {
    const metricsDir = join(projectRoot, 'nextai', 'metrics');
    ensureDir(metricsDir);

    const metricsPath = join(metricsDir, 'spec-changes.jsonl');

    const entry = {
      timestamp: new Date().toISOString(),
      featureId,
      failureDescription: description,
      userDecision,
      originalPhase: 'testing'
    };

    // Append as JSONL (one JSON object per line)
    const line = JSON.stringify(entry) + '\n';
    appendFileSync(metricsPath, line);
  } catch (error) {
    // Log error but don't crash - metrics are non-critical
    logger.dim(`Failed to log spec change metrics: ${error}`);
  }
}
```

**Import additions**:
```typescript
import { selectOption } from '../utils/prompts.js';
import { ensureDir } from '../utils/config.js';
```

## API/Interface Changes

### Investigator Agent Output Schema

```typescript
interface InvestigatorClassification {
  classification: 'BUG' | 'SPEC_CHANGE';
  confidence: number; // 0-100
  reasoning: string;
  specChangeDescription?: string; // Only present if SPEC_CHANGE
}
```

### Metrics Schema

**File**: `nextai/metrics/spec-changes.jsonl`

Each line is a JSON object:
```json
{
  "timestamp": "2025-12-21T14:30:22.123Z",
  "featureId": "20251221_example-feature",
  "failureDescription": "Expected X but got Y...",
  "userDecision": "approved|declined|cancelled",
  "originalPhase": "testing"
}
```

## Data Model

### Changes to initialization.md

**New section appended**:
```markdown
## Spec Changes

### 2025-12-21T14:30:22.123Z
Update authentication flow to redirect to /dashboard instead of /login after successful authentication.
```

### New Metrics File

**Path**: `nextai/metrics/spec-changes.jsonl`
- Format: JSON Lines (one JSON object per line)
- Append-only for easy parsing and analysis

## Error Handling

### Edge Cases

1. **Missing spec.md**
   ```typescript
   if (!existsSync(specPath)) {
     logger.warn('Cannot analyze spec change - spec.md not found');
     logger.dim('Defaulting to bug investigation. Run /nextai-refine first if needed.');
     return;
   }
   ```

2. **Empty Failure Description**
   - Already handled by existing validation in testing.ts (line 110-113)
   - Requires `--notes` parameter

3. **User Approval Timeout**
   - `selectOption()` from @inquirer/prompts handles timeout
   - Default behavior: waits indefinitely (user can Ctrl+C)

4. **Metrics Write Failure**
   ```typescript
   catch (error) {
     logger.dim(`Failed to log spec change metrics: ${error}`);
     // Continue execution - metrics are non-critical
   }
   ```

5. **Phase Reset Failure**
   ```typescript
   if (result.success) {
     // Success handling
   } else {
     logger.error('Failed to reset phase');
     logger.dim(result.error || 'Unknown error');
   }
   ```

6. **Multiple Consecutive Spec Changes**
   - No retry limit enforced
   - Each spec change appended to initialization.md
   - Metrics track all events

## Security Considerations

- No authentication/authorization changes
- File system operations use existing utilities (ensureDir, appendFileSync)
- No external API calls
- Metrics contain only feature metadata (no sensitive data)

## Alternatives Considered

### 1. Separate Product Owner Agent
**Rejected**: Requirements explicitly state to extend Investigator agent instead. Simpler to maintain one agent with dual responsibility.

### 2. Archive Previous Specs
**Rejected**: Keep consistent with existing `/nextai-refine` re-run behavior (overwrites without archiving). Reduces complexity.

### 3. Explicit `--spec-change` Flag
**Rejected**: Out of scope for this phase. Focus on automatic detection during testing only.

### 4. Configurable Confidence Threshold
**Rejected**: Nice to have, but not required. Fixed 70% threshold is sufficient for MVP.

## Alternatives Chosen

### Integrated Investigator Approach
**Rationale**: Reuses existing skill infrastructure, maintains single responsibility for failure analysis, reduces number of agents to maintain.

### Append to initialization.md
**Rationale**: Preserves spec change history without complex archiving, aligns with existing refinement workflow.

### JSONL Metrics Format
**Rationale**: Simple to parse, easy to append, human-readable, compatible with existing metrics patterns in the project.
