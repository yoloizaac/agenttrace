# Agent-log export note

Date: 2026-06-19

## What was attempted

The lead agent located the live Claude Code session log for this build under the
local Claude projects directory (`~/.claude/projects/<project-slug>/<session-id>.jsonl`,
about 1.75 MB at the time of writing). The exact path and session id are omitted
here on purpose. Only the file metadata was inspected; the raw contents were not
opened for committing.

## Why the raw log is not committed

The raw session `.jsonl` is not safe to publish:

- It embeds, on every turn, the operator's private global instructions
  (`~/.claude/CLAUDE.md`) and a personal memory index that names many unrelated
  private projects, plus a personal email address. That is personal data, it is
  irrelevant to AgentTrace, and the assessment explicitly forbids committing API
  keys, credentials, personal data, or raw private session logs.
- Reliably sanitizing a 1.75 MB multi-turn transcript to a public-safe state by
  hand is error-prone; a single missed line would leak.

The assessment explicitly allows documenting this rather than committing a raw
log, and forbids fabricating one.

## What is provided instead

- `agent-activity-log.md`: a sanitized, human-curated chronological log of the
  agent's actual actions on this project (commands run, failures hit, fixes,
  test/lint/build results, subagent runs). It is drawn from the real session but
  is a curated summary, not a raw transcript, and is labelled as such so it is
  never mistaken for a verbatim export.
- The four subagent handoff notes in `planning/agent-handoffs/`, which are the
  genuine analysis artifacts each subagent produced.
- `planning/06-agent-contributions.md` and `planning/07-problems-and-corrections.md`,
  which narrate the agent process honestly.

If a verbatim export is required, it can be produced from the path above and
sanitized before sharing, but it is intentionally kept out of this public
repository.
