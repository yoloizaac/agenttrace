# 01 — Product scope

Date: 2026-06-19

## Problem

Developers run long coding-agent sessions (Claude Code and similar) that produce large exported logs. After the fact it is hard to answer simple questions: what did I ask for, what did the agent actually do, which tools and commands ran, which files were touched, where did commands fail, did it retry or correct itself, did it verify its work. Scrolling raw JSONL does not scale, and pasting a private session into a hosted tool leaks code and secrets.

## Intended user

A developer who uses coding agents and wants a fast, private, post-hoc review of a session: for self-review, for a teammate handoff, or to assemble an assessment/report. Secondary user: an assessor who opens the tool cold and needs to understand a session in seconds.

## Must-have features (the graded core)

1. Three input methods: upload `.jsonl`, upload `.json`/`.txt`, paste raw text.
2. Tolerant parser that normalises any of the above into a single event model and **never throws to the UI** on malformed input.
3. Session overview: total events, user prompts, tool calls, detected failures, verification events, detected files.
4. Tool-usage breakdown with success/failure counts where available.
5. Chronological timeline of expandable event cards, with visual distinction for errors and verification.
6. Filter by category and free-text search over the timeline.
7. Insights section: possible failure-to-retry sequences and likely verification actions, each clearly labelled heuristic, plus parse warnings.
8. Markdown report export (summary, tools, files, failures, verification, timeline highlights).
9. A bundled synthetic sample log loadable in one click.
10. Safe rendering of all untrusted text; a documented file-size limit.

## Acceptance criteria

- Sample data renders a full populated dashboard on one click.
- A real exported Claude Code `.jsonl` parses without errors and produces sensible counts.
- A deliberately malformed file (truncated last line, junk lines) parses with warnings, not a crash.
- A plain-text paste produces at least `unknown` events and a warning, never a blank screen or an exception.
- Filtering and search update the timeline live.
- Metrics shown are derived from parsed events, not hard-coded.
- Inferred findings are visibly badged as inferred.
- Markdown export downloads a file whose contents match the on-screen analysis.
- Uploaded text that looks like HTML/script renders as inert text.
- `npm run build`, `npm test`, `npm run lint` all pass.

## Explicitly cut (with rationale in doc 04)

- Charting libraries (counts shown as plain HTML/CSS bars).
- Multi-session comparison and persistence/localStorage.
- A real statistical retry-correlation engine (a documented adjacency heuristic ships instead).
- Theming / dark mode toggle, animations beyond minimal.
- Virtualised timeline for very large logs (size cap + a render limit instead; documented).
- Any backend, auth, or AI call.
