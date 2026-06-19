# 02: Architecture

Date: 2026-06-19

## Overview

A single-page React app. All logic runs in the browser. The data flow is one direction: raw input becomes a `ParseResult`, which the UI renders. No global state library is needed; one piece of state (the current `ParseResult`) lives in the root component.

```
input (file or paste)
        │
        ▼
  parser pipeline (pure, never throws)
        │  ParseResult { events, warnings, meta }
        ▼
  analysis (pure)  ──► SessionAnalysis
        │
        ▼
  React components (render only)
        │
        ▼
  Markdown export (pure string builder)
```

## Component structure (`src/components/`)

- `App.tsx`: owns the single `ParseResult` state and the active filters; wires everything.
- `Header`: name, one-line description, local-processing privacy badge.
- `InputPanel`: file upload, paste textarea, "Load sample", "Clear".
- `Overview`: six metric tiles derived from analysis.
- `ToolUsage`: table of tool name / count / ok / fail.
- `Insights`: retry sequences, verification actions, parse warnings, heuristic disclaimer.
- `Timeline`: filter bar (category chips + search box) and the list of `EventCard`s.
- `EventCard`: one event, collapsed title row, expandable detail; error/verification styling.
- `ExportBar`: "Download Markdown report" button.

UI components are render-only. They receive plain data and callbacks. No fetch, no side effects beyond the file read and the export download.

## Parser pipeline (`src/parser/`)

Separated into single-responsibility stages, each a pure function so each is unit-testable in isolation. Grounded in the parser-design subagent's findings on the real Claude Code log shape.

1. **decode** (`decode.ts`): takes a `File` or a string, enforces the size cap, returns text + a `source` tag. File reads use the browser `FileReader`/`File.text()`.
2. **detectFormat** (`detectFormat.ts`): classifies text as `jsonl`, `json-array`, `json-object`, or `plain-text`. Tolerant: a file that is mostly valid JSON lines is `jsonl` even if one line is junk.
3. **splitRecords**: turns text into an array of raw records (one per JSONL line, array elements, the single object, or the whole text for plain). Malformed lines become warnings, not throws.
4. **normalizeRecord** (`normalize.ts`): probes common keys without assuming a fixed layout and emits zero or more `AgentEvent`s. Assistant records with a `message.content` array fan out into one event per content block. Unknown shapes are preserved as `category: 'unknown'` with `rawType`/`rawData` kept.
5. **classify** (`classify.ts`): heuristic pass that upgrades categories (command, file_operation, verification, error, plan) from tool names and content, setting an `inferred` flag where the call is a guess.
6. **analyze** (`analyze.ts`): pure reductions over the event array producing `SessionAnalysis` (counts, tool usage, files, failures, retry sequences, verification list, warnings).

`parseSession()` (`index.ts`) composes the stages and returns `ParseResult`. It catches at the boundary so the UI never sees an exception.

## Normalized event model (`src/domain/event.ts`)

```ts
type EventCategory =
  | 'user_prompt' | 'assistant_message' | 'plan' | 'tool_call'
  | 'tool_result' | 'file_operation' | 'command' | 'error'
  | 'retry' | 'verification' | 'unknown';

interface AgentEvent {
  id: string;
  timestamp?: string;     // ISO string when present; never fabricated
  category: EventCategory;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'unknown';
  title: string;          // short human label
  content: string;        // safe text body (rendered escaped)
  toolName?: string;
  command?: string;
  filePath?: string;
  status: 'ok' | 'error' | 'unknown';
  inferred?: boolean;     // true when category/status was heuristically guessed
  rawType?: string;       // original record/block type
  rawData?: unknown;      // original record, kept for transparency
}
```

The parser does not depend on one exact field layout. Missing timestamps stay `undefined` (never invented). Ids are taken from the source when present, otherwise a deterministic index-based id is assigned.

## State flow

Root holds `result: ParseResult | null` and `filters: { categories: Set, query: string }`. Input actions replace `result`. Filter actions update `filters`. Everything else is derived by pure functions during render. No effects, no async beyond the initial file read.

## Privacy model

- All parsing happens in the browser; the file never leaves the machine.
- No `fetch`/`XMLHttpRequest`/`navigator.sendBeacon` anywhere in the app code. This is asserted by a test/lint check.
- No analytics, no remote logging, no service worker.
- The header shows a "100% local, nothing uploaded" badge so the user can verify the claim matches behaviour.
- Untrusted content is rendered as React children (escaped) only. No `dangerouslySetInnerHTML`.

## Export flow

`buildMarkdown(analysis, events)` (`src/export/markdown.ts`) is a pure function returning a Markdown string: summary, tool table, file list, failures, verification actions, timeline highlights, and an explicit "heuristic" disclaimer. `ExportBar` wraps the string in a `Blob`, creates an object URL, and triggers a download with `a.download`. No network.
