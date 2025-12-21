# Requirements: Add Metrics

## Feature Summary

Create a comprehensive metrics system for the NextAI project to track and analyze development workflow performance. This system will collect data about feature lifecycles, agent performance, and workflow efficiency to help operators evaluate the framework's impact on development flow. The metrics should be loggable for future visualization, but the actual frontend dashboard is out of scope for this feature.

## Initial Analysis

After reviewing the codebase, I've found:

**Current State:**
- The ledger (`.nextai/state/ledger.json`) tracks: `id`, `title`, `type`, `phase`, `blocked_reason`, `retry_count`, `created_at`, `updated_at`
- The history log (`.nextai/state/history.log`) contains granular event tracking with timestamps for:
  - `feature_created`, `phase_transition`, `validation`, `validation_bypass`, `feature_completed`
  - Each event includes timestamp, feature_id, and event-specific data
- No existing metrics collection or aggregation system exists
- The `.nextai/state/` folder is for runtime state management
- The `nextai/` folder is for user-visible project artifacts

**Key Insight:**
Much of the raw data needed for metrics already exists in the history log! The question is whether we need to:
1. Extract/aggregate metrics from the history log on-demand
2. Duplicate/cache metrics in a separate metrics folder
3. Enhance the history log to capture additional data points

## Clarifying Questions

### 1. Metrics Location & Architecture

**Question 1.1:** Based on the existing structure where `.nextai/state/` contains runtime state (ledger, history, session) and `nextai/` contains user-visible artifacts, I propose the metrics folder should live at `.nextai/metrics/` alongside the state folder. This keeps infrastructure data separate from user-visible project artifacts. Does this align with your vision, or would you prefer `nextai/metrics/`?

**Question 1.2:** The history log already contains timestamped events for phase transitions, validations, completions, etc. Should the metrics system:
- **Option A:** Generate metrics by parsing/aggregating the history log on-demand (no duplication)
- **Option B:** Maintain a separate metrics cache that updates when events occur (faster queries, some duplication)
- **Option C:** Replace the history log with a more queryable format (breaking change)

I recommend **Option B** for performance and ease of querying, while keeping the history log as the source of truth.

### 2. Data Capture & Timestamps

**Question 2.1:** Currently, the ledger tracks `created_at` and `updated_at` for each feature, but we don't track individual phase start/end times. The history log has timestamps for phase transitions, but not the duration in each phase. Should we:
- **Option A:** Calculate phase durations from history log transitions (requires parsing)
- **Option B:** Add phase timing metadata to the ledger (e.g., `phase_timings: { product_refinement: { start, end, duration } }`)
- **Option C:** Store phase timing in the metrics folder separately

I recommend **Option C** to keep the ledger lean and metrics data separate.

**Question 2.2:** Beyond phase transitions, what other timestamps do we need to capture? For example:
- Agent spawn/completion times within a phase?
- Individual task completion times?
- Review iteration timestamps?
- Testing attempt timestamps?

Please specify which granular timestamps are must-haves versus nice-to-haves.

### 3. Metrics Schema & Content

**Question 3.1:** For the metrics you mentioned (time to complete, retry counts, workflow performance, review metrics, agent usage, totals), I propose this structure:

```
.nextai/metrics/
├── features/                    # Per-feature metrics
│   ├── 20251212_add-readme-badges.json
│   └── 20251212_fix-docs-output-path.json
├── aggregated/                  # Pre-computed aggregates
│   ├── daily-summary.json       # Daily rollups
│   ├── feature-stats.json       # Overall feature stats
│   └── agent-usage.json         # Agent usage statistics
└── index.json                   # Metrics catalog
```

Does this structure work for you, or would you prefer a different organization (e.g., all-in-one file, database-like structure, time-series format)?

**Question 3.2:** For each completed feature, what specific metrics should we track? My proposed schema:

```json
{
  "feature_id": "20251212_add-readme-badges",
  "title": "Add README badges",
  "type": "feature",
  "created_at": "2025-12-12T07:12:17.523Z",
  "completed_at": "2025-12-12T07:57:41.824Z",
  "total_duration_ms": 2724301,
  "retry_count": 0,
  "phases": {
    "created": { "entered_at": "...", "duration_ms": 100 },
    "product_refinement": { "entered_at": "...", "duration_ms": 189192, "agent": "product-owner" },
    "tech_spec": { "entered_at": "...", "duration_ms": 71229, "agent": "technical-architect" },
    "implementation": { "entered_at": "...", "duration_ms": 220137, "agent": "developer" },
    "review": { "entered_at": "...", "duration_ms": 1117971, "agent": "reviewer" },
    "testing": { "entered_at": "...", "duration_ms": 1065712 },
    "complete": { "entered_at": "...", "agent": "document-writer" }
  },
  "validations": {
    "passed": 5,
    "bypassed": 0,
    "failed": 0
  },
  "review_iterations": 1
}
```

Is this the right level of detail? Anything missing or unnecessary?

### 4. Aggregated Metrics

**Question 4.1:** You mentioned needing totals (done features, todos, agent usage). Should aggregated metrics be:
- **Option A:** Computed on-demand from individual feature metrics (slower, always accurate)
- **Option B:** Pre-computed and cached, updated when features complete (faster, requires update logic)
- **Option C:** Both (cache with fallback to computation)

I recommend **Option B** for performance, with periodic verification.

**Question 4.2:** What aggregated metrics are most important for the initial implementation? My proposal:
1. Feature completion metrics (total done, average time to complete by type)
2. Phase performance (average time per phase, bottleneck identification)
3. Agent usage statistics (which agents are used most, average task duration)
4. Success rates (validation pass/fail rates, review pass/fail rates)
5. Workflow health (features blocked, retry count distribution)

Should all of these be in scope, or should we prioritize a subset?

### 5. Storage Format

**Question 5.1:** The current ledger and history use JSON/JSONL. Should metrics use:
- **Option A:** JSON (human-readable, easy to parse)
- **Option B:** JSONL (append-friendly, time-series style)
- **Option C:** Both (JSON for aggregates, JSONL for time-series)
- **Option D:** Prepare for SQLite (structured for future migration)

I recommend **Option A** initially (JSON) with the schema designed to be SQLite-compatible for future migration.

### 6. Data Collection Integration

**Question 6.1:** When should metrics be updated?
- On every phase transition (via the existing phase update logic)?
- Only when features complete (via the complete command)?
- On-demand via a new `nextai metrics update` command?

I recommend updating individual feature metrics on phase transitions and aggregates when features complete.

**Question 6.2:** Should metrics collection be:
- **Option A:** Always enabled (automatic)
- **Option B:** Opt-in via config flag
- **Option C:** Enabled by default but can be disabled

I recommend **Option A** for maximum data availability.

### 7. Future Database Migration

**Question 7.1:** You mentioned potential database integration in the future. To prepare for this, should we:
- Design the JSON schema to match a future database schema (e.g., separate tables for features, phases, validations)?
- Keep it simple now and plan for migration scripts later?

I recommend designing with future SQLite migration in mind (normalized structure) but implementing as JSON files initially.

### 8. Edge Cases & Error Handling

**Question 8.1:** What should happen if:
- A feature is removed before completion? (Should partial metrics be kept?)
- The history log is corrupted or missing? (Should we rebuild from ledger?)
- Metrics files become inconsistent? (Should there be a repair command?)

Please advise on error handling strategy.

**Question 8.2:** Should there be a `nextai metrics repair` or `nextai metrics rebuild` command to regenerate metrics from the history log?

### 9. Visual Assets & References

**Question 9.1:** Do you have any mockups, wireframes, or screenshots of the future frontend dashboard? Even rough sketches would help understand what metrics will be most valuable. If you have any, please add them to `nextai/todo/20251221_add-metrics/attachments/design/`.

**Question 9.2:** Are there any existing metrics/analytics systems you'd like to model this after (e.g., GitHub Insights, JIRA reports, other project management tools)?

### 10. Reusability & Existing Patterns

**Question 10.1:** I noticed the research projects (`honestli-android`, `auvious-android`) also use NextAI. Should the metrics system support aggregating across multiple projects (multi-project view), or is this single-project only?

**Question 10.2:** The existing state management uses Zod schemas for validation. Should the metrics system also define Zod schemas for metrics data to ensure consistency?

## Out of Scope

The following are explicitly out of scope for this feature:
- Frontend dashboard or visualization UI
- Database implementation (SQLite or other)
- Multi-project aggregation (unless confirmed in Q&A)
- Real-time metrics streaming
- Metrics export to external systems
- Historical data backfilling for features completed before this system

## Visual Assets

Checking for design attachments in `attachments/design/`...
(No design attachments found yet. Please add any mockups or references if available.)

## Reusability Notes

**Existing Components to Leverage:**
- `.nextai/state/history.log` - Primary source of truth for events and timestamps
- `.nextai/state/ledger.json` - Feature metadata (created_at, updated_at, retry_count)
- `src/core/state/history.ts` - History logging infrastructure
- `src/schemas/` - Zod schema pattern for validation
- Phase validation system - Hook point for metrics collection

**Similar Features:**
- The `complete` command already generates summaries - could share summary generation logic
- The `repair` command pattern could be used for metrics repair/rebuild
- The `list` command could be extended to show metrics summaries

## Operator Answers

### Confirmed Decisions:

**Q1.1 - Location:** `.nextai/metrics/` ✓

**Q1.2 - Architecture:** Option B (separate metrics cache) ✓

**Q2.2 - Timestamps to Track (must-haves):**
- Testing attempts (iterations)
- Phase transitions
- Review iterations
- Time spent in each phase
- Implementation-to-complete time (not just create-to-complete)

**Q3.2 - Schema Feedback:**
- Structure is OK
- Missing: Testing section with iterations (testing can go back and forth with FAIL/PASS cycles)

**Q4.2 - Aggregated Metrics (prioritized):**
- Total done count
- Total todos count
- Average time of implementation
- Average time of completion
- Average testing iterations (count FAILs)
- Counts by type (bug, task, feature) for both todo and done
- **NOT needed:** Agent usage statistics (already attached to workflow)

**Q5.1 - Storage Format:** JSON with SQLite-compatible schema ✓

**Q6.1 - Update Timing:** On phase transitions + aggregates on completion ✓

**Q10.1 - Scope:** Single project only ✓

---

## Final Requirements

### Location
`.nextai/metrics/` - alongside state folder, separate from user-visible artifacts

### Architecture
Separate metrics cache (Option B) that updates when events occur. History log remains source of truth.

### Per-Feature Metrics Schema (Updated)

```json
{
  "feature_id": "20251212_add-readme-badges",
  "title": "Add README badges",
  "type": "feature",
  "created_at": "2025-12-12T07:12:17.523Z",
  "completed_at": "2025-12-12T07:57:41.824Z",
  "total_duration_ms": 2724301,
  "implementation_to_complete_ms": 2403820,
  "retry_count": 0,
  "phases": {
    "created": { "entered_at": "...", "duration_ms": 100 },
    "product_refinement": { "entered_at": "...", "duration_ms": 189192 },
    "tech_spec": { "entered_at": "...", "duration_ms": 71229 },
    "implementation": { "entered_at": "...", "duration_ms": 220137 },
    "review": {
      "entered_at": "...",
      "duration_ms": 1117971,
      "iterations": 1,
      "history": [
        { "attempt": 1, "started_at": "...", "result": "pass", "duration_ms": 1117971 }
      ]
    },
    "testing": {
      "entered_at": "...",
      "duration_ms": 1065712,
      "iterations": 2,
      "fail_count": 1,
      "pass_count": 1,
      "history": [
        { "attempt": 1, "started_at": "...", "result": "fail", "duration_ms": 500000 },
        { "attempt": 2, "started_at": "...", "result": "pass", "duration_ms": 565712 }
      ]
    },
    "complete": { "entered_at": "..." }
  },
  "validations": {
    "passed": 5,
    "bypassed": 0,
    "failed": 0
  }
}
```

### Aggregated Metrics Schema

```json
{
  "updated_at": "2025-12-21T15:00:00.000Z",
  "totals": {
    "done": 15,
    "todo": 3,
    "by_type": {
      "feature": { "done": 10, "todo": 2 },
      "bug": { "done": 3, "todo": 1 },
      "task": { "done": 2, "todo": 0 }
    }
  },
  "averages": {
    "total_duration_ms": 2500000,
    "implementation_to_complete_ms": 2000000,
    "implementation_duration_ms": 300000,
    "testing_iterations": 1.5,
    "testing_fail_count": 0.8
  },
  "phase_averages": {
    "product_refinement_ms": 150000,
    "tech_spec_ms": 80000,
    "implementation_ms": 300000,
    "review_ms": 900000,
    "testing_ms": 800000
  }
}
```

### Folder Structure

```
.nextai/metrics/
├── features/                    # Per-feature metrics
│   ├── 20251212_add-readme-badges.json
│   └── 20251212_fix-docs-output-path.json
├── aggregated.json              # Pre-computed aggregates
└── index.json                   # Metrics catalog/metadata
```

### Out of Scope (Confirmed)
- Frontend dashboard or visualization UI
- Database implementation (SQLite) - but schema should be compatible
- Multi-project aggregation
- Agent usage statistics (redundant with workflow)
- Real-time metrics streaming
- Historical data backfilling

## Confidence Assessment

Current confidence level: **95%**

All key decisions have been confirmed. Ready for technical specification.