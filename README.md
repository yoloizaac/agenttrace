# AgentTrace

**Turn an AI coding session into an understandable development timeline.**

AgentTrace is a local-first, browser-only tool that takes an exported AI
coding-agent session log (Claude Code `.jsonl`, a JSON array, or pasted text)
and turns it into a transparent review: what you asked for, what the agent did,
which tools and commands ran, which files it touched, where commands failed,
where it retried or corrected itself, and whether it verified its work.

Everything runs in your browser. No API key, no database, no backend, no
account, no external AI service, and no data ever leaves the page.

---

## Why this exists

Long coding-agent sessions produce large exported logs. After the fact it is
hard to answer simple questions from raw JSONL: what actually happened, where
did it go wrong, did it check its own work. And pasting a private session into a
hosted tool leaks your source code and possibly secrets. AgentTrace answers
those questions locally, so the review is both fast and private.

## Screenshot

No static image is committed (kept honest: the capture tooling was unreliable in
the build environment). The bundled sample renders a full dashboard on one
click, so the fastest way to see it is to run it:

```
npm install
npm run dev
# open the printed localhost URL and click "Load sample"
```

You then see the header and privacy badge, six overview tiles (with "Detected
failures: 1" in red), the tool-usage table, the heuristic Insights, and a
filterable, searchable timeline of 28 event cards.

## Features

- Three inputs: upload `.jsonl`, upload `.json` / `.txt`, or paste raw text.
- Tolerant parser that normalises any of those into one event model and never
  throws to the UI on malformed input.
- Session overview: total events, user prompts, tool calls, detected failures,
  verification events, and files touched.
- Tool-usage table with success / failure counts where the log links a result
  to its call.
- Chronological timeline of expandable event cards, with errors and verification
  visually distinct, filterable by category and searchable by text.
- Insights: possible failure-to-retry sequences and likely verification actions,
  each clearly labelled as a heuristic, plus parsing warnings.
- One-click Markdown report export (summary, tools, files, failures,
  verification, timeline highlights).
- A bundled synthetic sample log so an evaluator can try it immediately.

## Privacy model

Privacy here is structural, not a promise:

- All decoding and parsing use browser APIs only (`File.text()`, `JSON.parse`).
- There is no `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, or
  `EventSource` anywhere in the app. Two tests guard this: a source scan
  (`privacy.test.ts`) and a runtime trap that drives the whole app while spying
  on every network primitive (`egress.test.tsx`).
- No analytics, no remote logging, no service worker.
- All log content is rendered as escaped React text. There is no
  `dangerouslySetInnerHTML` and no `eval`. Untrusted input is treated as text.
- A visible "100% local, nothing uploaded" badge sits in the header so the claim
  matches observable behaviour.

A file-size cap of 25 MB (hard) with a 10 MB soft warning protects the browser
from pathological inputs; oversized files are rejected before being read.

## Installation and commands

Requirements: Node 18+ and npm. Built and verified on Node 22 / npm 10.

```
npm install      # install dependencies
npm run dev      # start the Vite dev server
npm run build    # type-check (tsc -b) and build for production
npm test         # run the Vitest suite (47 tests)
npm run lint     # run ESLint
```

Everything runs with `npm install` then `npm run dev`.

## Accepted formats

- **JSONL** (one JSON object per line): the primary Claude Code export shape.
- **JSON array** of records (pretty-printed or single-line).
- **Single JSON object** (optionally wrapping an `events` / `messages` array).
- **Plain text**: kept as a single `unknown` note with a warning.

The parser probes for common keys (`type`, `role`, `content`, `message`, `tool`,
`tool_name`, `tool_use`, `tool_result`, `command`, `path`, `file_path`,
`timestamp`, `error`) rather than assuming one exact layout. Records it does not
recognise are preserved as `unknown` events with their raw data intact, and
parsing warnings are reported separately. It never invents meaning when the
source is ambiguous.

## Architecture

A one-directional flow: raw input becomes a `ParseResult`, which pure analysis
turns into a `SessionAnalysis`, which the React components render.

```
input ─► parser pipeline (pure, never throws) ─► analyze (pure) ─► React (render) ─► Markdown export (pure)
```

The parser is split into single-responsibility, individually tested stages:

- size guard and file decoding in `src/parser/index.ts` (`parseText` /
  `parseFile`) and `detectFormat` (jsonl / json-array / json-object /
  plain-text).
- `src/parser/split`: text to raw records; malformed JSONL lines become
  warnings, not throws.
- `src/parser/normalize`: probes keys and fans assistant content blocks out
  into events; unknown shapes preserved.
- `src/parser/classify`: heuristic refinement (command / file_operation / plan /
  verification), flagging guesses as `inferred`.
- `src/parser/analyze`: pure reductions: counts, tool usage, files, failures,
  verification, retries.
- `src/export/markdown`: pure report builder.

The normalized event model lives in `src/domain/event.ts`. See
[`planning/02-architecture.md`](planning/02-architecture.md) for the full design.

## AI-agent development process

This repository was built for an AI-Native Builder assessment, using Claude Code
as the lead agent plus four purpose-built subagents, each of which left a
handoff note under [`planning/agent-handoffs/`](planning/agent-handoffs/):

- a scope reviewer challenged the feature list and flagged overbuild risk;
- a parser-design reviewer sampled the real Claude Code log schema (key names
  only, no content) and designed the tolerant pipeline and edge cases;
- a testing-and-security reviewer found a real stack-overflow bug in the content
  flattener and proposed the runtime egress trap;
- a UX-and-demo reviewer checked first-open clarity and accessibility.

What the AI got wrong and how it was corrected is documented honestly in
[`planning/07-problems-and-corrections.md`](planning/07-problems-and-corrections.md)
and [`planning/06-agent-contributions.md`](planning/06-agent-contributions.md).

## Testing

`npm test` runs 47 Vitest assertions across parser correctness, every required
edge case (malformed JSONL, truncated line, JSON array, plain text, unknown
type, error event, tool call + result, empty, oversized, unsafe HTML, array
tool_result, MCP names, missing timestamps, duplicate ids, huge line, non-Claude
JSON), heuristic labelling, the Markdown export, safe rendering, and the two
privacy guards. The mapping from each planned case to a test is in
[`planning/05-test-plan.md`](planning/05-test-plan.md).

## Trade-offs

- **Local-only, no AI API.** Parsing and aggregation are deterministic; an LLM
  would add a key, a cost, non-determinism, and a privacy hole for no gain. The
  "insights" are honest heuristics, not an AI judgement.
- **Heuristic classification, labelled as such.** Logs do not reliably state
  "this was a retry" or "this verified the work". AgentTrace infers those from
  command keywords and adjacency and flags every guess `inferred`, rather than
  pretending certainty.
- **Broad tolerance over perfect format support.** There is no single agent-log
  standard; even Claude Code's `type` field is an open set. The parser degrades
  gracefully (preserve as `unknown`, warn separately) instead of crashing on an
  unexpected shape.
- **Plain HTML/CSS, no charting library.** Counts render as text and simple
  bars; a chart dependency would be weight for nothing.
- **No persistence, no router, single in-memory state.** One screen, re-load in
  one click.

Full reasoning is in
[`planning/04-decisions-and-tradeoffs.md`](planning/04-decisions-and-tradeoffs.md).

## Known limitations

- Retry detection is adjacency-based; it can miss non-adjacent corrections and
  over-match coincidental repeats. It is labelled inferred for this reason.
- The timeline renders up to 1500 cards, then shows a "showing N of M" notice;
  there is no virtualisation, so very large logs rely on filtering.
- Tool success / failure is only known when the log links a result to its call;
  otherwise it is shown as "unknown", not guessed.
- The visual design is deliberately plain (substance over skin for the time box).

## Future improvements

- Per-session diffing or comparison across two logs.
- Virtualised timeline for very large sessions.
- Richer linking of a tool call to the exact file region it changed.
- Optional, clearly-bounded retry correlation beyond simple adjacency.

## Assessment evidence map

| Requirement | Where |
| --- | --- |
| Planning notes | [`planning/00`](planning/00-assessment-interpretation.md) through [`planning/12`](planning/12-final-audit.md) |
| Agent handoffs | [`planning/agent-handoffs/`](planning/agent-handoffs/) |
| Normalized event model | [`src/domain/event.ts`](src/domain/event.ts) |
| Tolerant parser | [`src/parser/`](src/parser/) |
| Heuristics (labelled inferred) | [`src/parser/classify.ts`](src/parser/classify.ts), [`src/parser/analyze.ts`](src/parser/analyze.ts) |
| Markdown export | [`src/export/markdown.ts`](src/export/markdown.ts) |
| UI | [`src/App.tsx`](src/App.tsx), [`src/components/`](src/components/) |
| Tests (47) | [`src/__tests__/`](src/__tests__/) |
| Privacy guards | [`src/__tests__/privacy.test.ts`](src/__tests__/privacy.test.ts), [`src/__tests__/egress.test.tsx`](src/__tests__/egress.test.tsx) |
| Synthetic sample | [`examples/sample-session.jsonl`](examples/sample-session.jsonl) |
| Demo script | [`planning/09-demo-script.md`](planning/09-demo-script.md) |
| Agent-log export note | [`planning/agent-logs/`](planning/agent-logs/) |
| Final audit | [`planning/12-final-audit.md`](planning/12-final-audit.md) |

## License

MIT. See [`LICENSE`](LICENSE).
