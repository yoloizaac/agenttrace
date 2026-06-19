# Agent logs

This folder is the agent-log evidence for the assessment.

## What is here

- `EXPORT-NOTE.md` — what was attempted for a raw session export, and why the raw
  `.jsonl` is deliberately not committed.
- `agent-activity-log.md` — a sanitized, human-curated chronological log of what
  the coding agent actually did on this project (commands, failures, fixes, test
  results, subagent runs). It is curated from the real session, not a raw
  transcript, and is labelled as such.

## How to interpret it

The curated activity log is the honest, public-safe view of the agent process.
For the deeper narrative of who did what and what was corrected, read
`planning/06-agent-contributions.md` and `planning/07-problems-and-corrections.md`,
and the four subagent handoffs in `planning/agent-handoffs/`.

## What was excluded and why

The raw Claude Code session log for this build embeds, on every turn, the
operator's private global instructions and a personal memory index that names
unrelated private projects, plus an email address. None of that is relevant to
AgentTrace, and committing it would leak personal data. So the raw log is
excluded by policy and `.gitignore` blocks any `*.raw.jsonl` or
`planning/agent-logs/raw/` from being committed by accident. See `EXPORT-NOTE.md`.
