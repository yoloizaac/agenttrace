# 05 — Test plan

Date: 2026-06-19

Tests run under Vitest (`npm test`). The parser is pure, so every case is a direct function call with an asserted `ParseResult`. The guiding invariant: **the parser never throws to the UI**; malformed input produces warnings, not exceptions.

## Core invariant tests

- **Never throws.** Each malformed/edge input asserts `parseSession(...)` returns a value (no throw) and that warnings are an array.
- **Line reconciliation.** For JSONL, the number of consumed lines plus warned lines accounts for every non-blank source line (no records silently dropped).

## Required cases (from the brief, plus parser-design additions)

1. **Valid JSONL** — a small well-formed Claude Code session parses to the expected event categories and counts.
2. **Malformed JSONL line** — one junk line among valid lines yields a warning and the valid lines still parse.
3. **Truncated last line** — a half-written final JSON object is warned, not fatal (real exports can end mid-write).
4. **JSON array** — a `[ {...}, {...} ]` file is detected as `json-array` and parsed.
5. **Single JSON object** — a lone `{...}` is handled.
6. **Plain text** — unstructured text becomes at least one `unknown` event plus a warning; never a crash, never a blank result.
7. **Unknown event type** — a record with an unrecognised `type` is preserved as `category: 'unknown'` with `rawType`/`rawData` kept.
8. **Error event** — a `tool_result` with `is_error: true` classifies as an error and increments the failure count.
9. **Tool call + result pair** — a `tool_use` followed by its `tool_result` links and produces a tool-usage entry with a success/failure outcome.
10. **Empty file** — empty/whitespace input returns zero events and a clear warning, no crash.
11. **Oversized file** — input beyond the size cap is rejected with a specific warning and no attempt to parse.
12. **Markdown export** — `buildMarkdown` over a known analysis contains the summary, tool table, files, failures, verification, and the heuristic disclaimer.
13. **Unsafe-looking HTML text** — content containing `<script>` / `<img onerror=...>` survives parsing as plain text and is never interpreted; a render smoke test asserts it appears as text, not as a live element.

## Parser-design subagent additions

14. **Array-shaped `tool_result.content`** — `content` as an array of blocks (observed 887× in a real file) is flattened to text, not `[object Object]`.
15. **MCP tool naming** — `mcp__server__tool` names are recognised as tool calls and displayed readably.
16. **Missing timestamps** — events keep `timestamp: undefined`; nothing is fabricated; the timeline still orders by source position.
17. **Duplicate ids** — duplicate source ids do not collide; rendering keys stay unique.
18. **Huge single line** — one very long valid JSON line parses without pathological behaviour.
19. **Non-Claude JSON** — valid JSON that is not a session (for example an arbitrary config object) does not crash; it becomes `unknown` events with a warning that the shape was unrecognised.

## Heuristic labelling tests

20. **Verification inferred** — a `npm test` / typecheck / build command is flagged `category: 'verification'` with `inferred: true`.
21. **Retry inferred** — a failed command followed by a similar command yields a retry insight marked inferred; the underlying events are not destructively relabelled.

## UI / safety smoke tests

22. **Sample loads** — the bundled sample parses to a populated analysis (non-zero events, tools, at least one file).
23. **No network** — a source-level assertion that the app bundle contains no `fetch(`/`XMLHttpRequest`/`sendBeacon` calls (guards the privacy claim).

Each numbered case maps to a named `it(...)` in `src/__tests__`. The final audit cross-checks that every case here has a corresponding passing test.
