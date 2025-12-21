# Feature: Add metrics

## Original Request
Add metrics to the metrics folder. Creating a nextai\metrics folder (location TBD - could be `.nextai/` or `nextai/` folder).

## Type
feature

## Description
Create a metrics system for the NextAI project to help operators and administrators evaluate the framework's impact on development flow and efficiency. Metrics should be loggable and visualizable for performance evaluation and team efficiency tracking.

## Initial Context
**Key Questions to Resolve:**
1. **Location**: Should metrics live in `.nextai/metrics/` or `nextai/metrics/`?
2. **Data Source**: Can metrics be extracted from the existing ledger, or do we need to capture additional data?
3. **Timestamp Tracking**: Do we currently log timestamps for every phase for every issue? If not, where should this data live?
4. **Storage Format**: File-based (JSON/YAML) vs database for future scalability

**Metrics to Track:**
- Feature development metrics (time to complete, retry counts)
- Workflow performance (phase transitions, time in each phase)
- Review metrics (pass/fail rates, review cycles)
- Agent usage statistics (most used agents)
- Totals (done features, todos, in-progress)
- Timestamps per phase per feature

**Future Considerations:**
- Frontend dashboard to render metrics data (out of scope for this feature)
- Potential database integration (not now, but architecture should allow it)

**Research Needed:**
- Review what other projects in `/research` folder do for metrics/analytics
- Analyze current ledger structure to see what data is already captured

## Acceptance Criteria
- [ ] Determine optimal location for metrics folder
- [ ] Define metrics schema/structure
- [ ] Implement metrics collection mechanism
- [ ] Ensure timestamps are captured for phase transitions
- [ ] Design for future database migration
- [ ] Add documentation for the metrics system

## Notes
The end goal is to have a frontend to render this data for project development monitoring, but this feature focuses on data capture and storage only.
