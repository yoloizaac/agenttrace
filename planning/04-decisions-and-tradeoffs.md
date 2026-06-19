# 04: Decisions and trade-offs

Date: 2026-06-19

## Why local-only (no backend, no upload)

Session logs are among the most sensitive artifacts a developer has: they contain source code, file paths, command output, and sometimes secrets. Uploading them to a server, even the tool's own, creates a leak surface and a trust barrier. Doing everything in the browser means the privacy claim is structural, not a promise: there is no network code to misbehave. It also removes a whole class of infrastructure (server, hosting, auth, storage) that would be pure overhead for a review tool.

## Why no AI API

The task is parsing and aggregation, which is deterministic and cheap to do with plain code. An LLM call would add a key requirement, a cost, a network dependency, non-determinism, and a privacy hole, in exchange for nothing the heuristics cannot do honestly. The "insights" are intentionally simple, labelled heuristics rather than an AI judgement, which is both more honest and more reproducible. The assessment also forbids paid APIs and external AI services.

## Why Vite + React + TypeScript

Vite gives an instant dev server and a small, fast production build with near-zero config. React keeps the one-directional data flow (parsed result in, rendered view out) simple and makes safe rendering the default: putting a string in JSX escapes it, so untrusted content is inert unless we deliberately opt out (which we never do). TypeScript lets the normalized event model be a single source of truth that the parser and UI both type-check against, which is the cheapest way to keep a tolerant parser honest. All three are the assessment's named stack.

## Why heuristic classification (and how it stays honest)

Logs do not reliably label "this was a retry" or "this verified the work". Inferring those requires judgement. Rather than pretend certainty, the parser marks any guessed category or status with an `inferred` flag, the UI badges it, and the report repeats the disclaimer. A retry is inferred from a failed command followed by a similar command; verification is inferred from test/lint/build/typecheck commands. These are adjacency and keyword heuristics, documented as such, not a statistical model. Being explicitly approximate is the correct trade-off for the time box and for trust.

## Why broad format tolerance beats pretending to support every format perfectly

There is no single "agent log" standard. Even within Claude Code the top-level `type` is an open set (the parser-design subagent observed `attachment`, `queue-operation`, `ai-title`, `mode`, and more beyond the documented four), and a user line's `content` is more often a `tool_result` array than a prompt string. Hard-coding one schema would crash on the assessor's own file. The chosen contract is: probe for common keys, map what we recognise, preserve everything else as `unknown` with its raw data intact, and surface warnings separately. The tool degrades gracefully instead of failing or, worse, silently inventing meaning. This is stated to the user rather than hidden.

## What was deliberately simplified

- **Counts shown as CSS bars, not a charting library.** A dependency-free `<div>` with a width percentage is enough; a chart lib would be weight for nothing.
- **No persistence.** Re-loading is one click; storing parsed sessions would add a privacy question (where does it live) for little gain.
- **No timeline virtualisation.** Instead, a size cap (25 MB hard, 10 MB soft warning) plus a capped render count with a visible "showing N of M" notice. Documented, not silent.
- **Retry detection is adjacency-based, not semantic.** It can miss non-adjacent corrections and over-match coincidental repeats. Labelled inferred.
- **Single in-memory state, no router.** One screen, no routes needed.
- **Minimal styling.** One hand-written CSS file, accessible contrast and keyboard focus, no animation budget.

## Structure note

The repo follows the suggested layout (`src/parser`, `src/domain`, `src/export`, `src/components`, `src/sample`, `src/styles`, plus `src/__tests__` for Vitest and `examples/` for the sample log as a file). Tests live in `src/__tests__` rather than `src/tests` to match the conventional Vitest/Jest discovery pattern; this is the only deviation from the suggested directory names and is noted here.
