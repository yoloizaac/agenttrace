# 03: Task breakdown

Date: 2026-06-19. Status updated as work progresses.

Ownership: **main** = the lead agent (integrates and writes all source). **sub** = a named analysis subagent (handoff note only, no source edits).

| # | Task | Depends on | Owner | Status |
|---|------|-----------|-------|--------|
| 1 | Inspect repo, init git, create planning tree |: | main | done |
| 2 | Scope challenge + handoff | 1 | sub (scope) | done |
| 3 | Parser design + real-log shape + handoff | 1 | sub (parser) | done |
| 4 | Planning docs 00 to 05 | 2,3 | main | done |
| 5 | Scaffold Vite + React + TS, ESLint, Vitest | 1 | main | done |
| 6 | Synthetic sample log (fake data) | 5 | main | done |
| 7 | Domain event model | 5 | main | done |
| 8 | Parser stages: decode, detect, normalize, classify | 7 | main | done |
| 9 | Analysis reductions | 8 | main | done |
| 10 | Vitest parser/edge-case suite | 8,9 | main | done |
| 11 | Markdown export builder + test | 9 | main | done |
| 12 | UI: input panel + sample/clear flow | 8 | main | done |
| 13 | UI: overview, tool usage, insights | 9 | main | done |
| 14 | UI: timeline, filters, search, event cards | 8 | main | done |
| 15 | UI: export bar wiring | 11 | main | done |
| 16 | Privacy badge + no-network assertion | 12 | main | done |
| 17 | Testing + security review + fixes | 10 to 16 | sub (sec) + main | done |
| 18 | UX/demo review + first-open polish | 12 to 16 | sub (ux) + main | done |
| 19 | README + evidence map | 17,18 | main | done |
| 20 | Planning docs 06 to 11 | 17,18 | main | done |
| 21 | Agent-log export attempt + sanitise/note | 19 | main | done |
| 22 | Final audit (requirement-by-requirement) | all | sub (audit) + main | done |
| 23 | Verify build/test/lint green, git log | all | main | done |

## Critical path

5 → 7 → 8 → 9 → 10 (parser must be correct and tested before UI is worth building). UI (12 to 15) can only show honest metrics once 9 is real. Reviews (17,18) gate documentation (19,20). Audit (22) gates "done".

## Parallelism actually used

- Tasks 2 and 3 ran as two subagents concurrently before any source existed.
- Reviews 17 and 18 ran as independent subagents (different concerns: security vs UX), then the main agent integrated fixes serially to avoid file conflicts.
