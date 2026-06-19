# 02 — Parser Design & Edge Cases (AgentTrace)

Date: 2026-06-19
Author: parser-design-reviewer (subagent)
Status: pre-build design. Read before writing `src/parser/*`. Analysis only — no source written.

---

## 1. Confirmed real Claude Code `.jsonl` shape (sampled, keys only, no values copied)

I sampled top-level key names and `message.content` block types from real logs at
`~/.claude/projects/<slug>/<uuid>.jsonl` — first a short file, then the 6 largest for coverage.
**Observed vs. the assumed shape:**

**Top-level `type` values seen:** `user`, `assistant`, `system`, `summary` (assumed) **plus** several
record kinds the brief did not mention: `attachment`, `queue-operation`, `ai-title`, `custom-title`,
`last-prompt`, `mode`. Treat the `type` set as **open** — do not hardcode an exhaustive enum; anything
unrecognized must fall through to `unknown`, not crash. (`result` was *not* seen; do not assume it.)

**Top-level keys present** (superset of assumed): `type`, `uuid`, `parentUuid`, `timestamp`, `sessionId`,
`cwd`, `version`, `message`, and also `isSidechain`, `userType`, `gitBranch`, `permissionMode`,
`entrypoint`, `promptId`, `operation`, `content` (on non-message records), `attachment`. Not every key is
on every line — `timestamp` and `message` are absent on `summary`/title/mode records. **Never assume a key
exists; probe defensively.**

**`message` object keys.** Assistant: `role`, `model`, `id`, `type`, `content`, `stop_reason`,
`stop_sequence`, `stop_details`, `usage`. User: `role`, `content`.

**`message.content` block types seen:** `text`, `thinking`, `tool_use`, `tool_result`, **and also**
`image`, `document` (the brief listed only the first four). Handle `image`/`document` as non-fatal:
represent as an event with a placeholder title, never try to render bytes.

**User content shape — confirmed both forms, array dominates:** across the large files, user
`message.content` was an **array** 3482 times (carrying `tool_result` blocks) vs. a plain **string** 261
times (the actual human prompt). The earlier tiny file was string-only. So: a `user` line is a real human
prompt **only when `content` is a string** (or an array of `text` blocks with no `tool_result`); a `user`
line whose array contains `tool_result` is a **tool-result carrier, not a prompt** — this distinction is
load-bearing for classification (see §3).

**`tool_use` block keys:** `type`, `id`, `name`, `input`, and `caller`. `input` is a free-form object;
across all tools the union of `input` keys included `command`, `file_path`, `path`, `old_string`,
`new_string`, `content`, `pattern`, `description`, `url`, `prompt`, `subagent_type`, `skill`, etc. **Do not
assume any specific input key** — probe `command`/`file_path`/`path` and degrade if absent.

**`tool_result` block keys:** `type`, `tool_use_id`, `content`, `is_error`. **`is_error` confirmed
present.** `content` is itself polymorphic: **string 2555 times, array 887 times** (array of `text`/`image`
sub-blocks). Both must be flattened to a string safely.

**Distinct tool names seen** (drives the file/command/verification mapping): `Bash`, `PowerShell`, `Read`,
`Write`, `Edit`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `Agent`, `Skill`, `Workflow`, `Monitor`,
`Task*`, plus many `mcp__*` tools. **MCP tools use the `mcp__server__tool` naming convention** — the
classifier must handle that prefix shape, not just bare names.

**Net correction to the brief:** the assumed shape is right about the core (`type`/`message`/blocks/
`tool_use`/`tool_result`/`is_error`) but **understates the variety** of top-level record types, the extra
metadata keys, the `image`/`document` block types, and that `tool_result.content` is frequently an array.
Design for openness, not a closed enum.

---

## 2. Layered parsing pipeline (stage boundaries, signatures, where warnings live)

Pure functions, no I/O inside the core, no throwing across stage boundaries. **Warnings are a separate
returned channel — never thrown, never mixed into events.** A single `ParseWarning[]` accumulator threads
through and is returned alongside events, so a malformed line degrades to a warning + (optionally) an
`unknown` event rather than aborting the parse.

```ts
type ParseWarning = { stage: string; lineNumber?: number; recordIndex?: number; message: string; sample?: string };
type ParseResult  = { events: Event[]; warnings: ParseWarning[]; format: DetectedFormat; stats: {...} };
```

**Stage 0 — decode.** `decodeFile(file: File): Promise<{ text: string; warnings }>`
Enforce the size cap (§6) *before* reading. Read as UTF-8; strip a BOM; normalize `\r\n`→`\n`. Truncation
or decode issues become warnings, not exceptions.

**Stage 1 — format detection.** `detectFormat(text): DetectedFormat` → `'jsonl' | 'json-array' | 'json-object' | 'plain-text'`.
Cheap, no full parse: trim; if it starts `[` and `JSON.parse` succeeds → `json-array`; if it starts `{`,
try whole-text parse (single object) → `json-object`, else fall to jsonl (NDJSON of objects); if ≥2 newline-separated
lines each independently parse as JSON → `jsonl`; otherwise `plain-text`. Record the decision in `result.format`.
Ambiguity (e.g. one giant object that is actually one jsonl line) resolves toward `jsonl`. **Detection never
throws** — worst case it returns `plain-text`.

**Stage 2 — per-record extraction → raw records.** `splitRecords(text, format): { raw: unknown; lineNumber? }[]`
- jsonl: split on `\n`, skip blank lines, `JSON.parse` each line in a `try/catch`; a failed line →
  `ParseWarning{stage:'parse', lineNumber}` and is **dropped or emitted as an `unknown` event** (decision:
  emit `unknown` so counts stay honest and the line is visible, per 01 §5 "counts must be defensible").
- json-array: iterate elements; each element is a raw record.
- json-object: the single object is one raw record.
- plain-text: the whole text becomes **one** `unknown` event (title "Unstructured text", content = the text,
  truncated for display); emit a warning that no structure was detected.

**Stage 3 — normalization to the event model.** `normalizeRecord(raw, ctx): Event[]`
This is the tolerant-key layer. One Claude `assistant` record **fans out to multiple events** (one per
content block: each `text`→assistant_message, each `tool_use`→tool_call, `thinking`→assistant_message
marked thinking). A `user` record with `tool_result` blocks fans out to tool_result/error events. Probe the
common keys (`type, role, content, message, tool, tool_name, tool_use, tool_result, command, path,
file_path, timestamp, error`) in priority order; **preserve the original on every event** via `rawType`
(the source `type`/block `type`) and `rawData` (the untouched record/block). Anything that matches no known
shape → `category: 'unknown'`, content = best-effort stringification. Missing `timestamp` → `timestamp:
undefined` (do **not** invent one; see §4/§5).

**Stage 4 — heuristic classification (inferred pass).** `classifyHeuristics(events): events` (annotates,
does not relabel destructively). Adds the **inferred** categories `verification`, `retry` and refines
`command`/`file_operation` where a tool_call's tool/name implies it. Every event it touches gets a flag
`inferred: true` (or `meta.heuristic = '<rule-id>'`) so the UI can badge it. This stage is the only place
allowed to *guess*; stages 2–3 only *read*.

**Stage 5 — analysis/derivation.** `analyze(events): { summary, toolTally, files, failures, retries }`
Pure reductions over the event array (counts, first→last duration, file list, failure/retry counts). No new
truth, just aggregation. Feeds the summary cards and the markdown report.

**Top-level orchestrator:** `parseAgentLog(file): Promise<ParseResult>` runs 0→5, concatenating warnings.
It has **one job at the boundary: never reject the promise for bad *content*** (only for the hard size cap,
which is a deliberate, user-facing refusal). The UI consumes `{events, warnings, format, stats}` and renders
`warnings.length` as a "skipped/malformed: N" stat.

---

## 3. Category mapping (Claude Code record/block → normalized category)

| Source record / block | Condition | category | role | Notes / fields |
|---|---|---|---|---|
| `user` record, `content` is **string** | always | `user_prompt` | user | the human prompt; `title` = first line |
| `user` record, array of `text` only | no tool_result present | `user_prompt` | user | concatenate text blocks |
| `user` record, array w/ `tool_result`, `is_error:false` | — | `tool_result` | tool | `toolName` via matching `tool_use_id`→earlier tool_use; flatten string/array `content` |
| `user` record, `tool_result` with `is_error:true` | — | `error` | tool | status `error`; keep `tool_result` linkage in `rawData` |
| `assistant` block `text` | — | `assistant_message` | assistant | one event per text block |
| `assistant` block `thinking` | — | `assistant_message` | assistant | `meta.thinking=true`; collapsed in UI by default |
| `assistant` block `tool_use`, `name` = `Bash`/`PowerShell` | — | `command` | assistant | `command` = `input.command`; `toolName` = name |
| `assistant` block `tool_use`, `name` = `Read`/`Write`/`Edit`/`Glob`/`Grep` | — | `file_operation` | assistant | `filePath` = `input.file_path`/`input.path`/`input.pattern` |
| `assistant` block `tool_use`, name = `ExitPlanMode` **or** plan-like text | see §4 | `plan` (inferred when text-derived) | assistant | `ExitPlanMode` is structural→not inferred; plan *text* sniffing→inferred |
| `assistant` block `tool_use`, any other tool (incl. `mcp__*`) | — | `tool_call` | assistant | generic; `toolName` = full name |
| `assistant` block `tool_use`, Bash running tests/typecheck/lint/build | regex on `input.command`, see §4 | `verification` (**inferred**) | assistant | base category stays `command`; verification is an added inferred label |
| `assistant` block `image`/`document` | — | `assistant_message` | assistant | placeholder title, never render bytes |
| top-level `summary` / `*-title` / `last-prompt` / `mode` / `queue-operation` / `attachment` | — | `unknown` (or skip from timeline) | system | metadata; keep in `rawData`, exclude from main counts or tag `meta.system` |
| any record with top-level `error` key or unparseable | — | `error` / `unknown` | system | never throw |

**Linkage rule:** maintain a `Map<tool_use_id, toolName>` while walking so each `tool_result`/`error` can
carry the originating `toolName`. Pair display (tool_call ↔ tool_result) is by `tool_use_id`, not order.

---

## 4. Retry & verification heuristics — and how they are labelled honest

Both are **inferred**. Each carries `inferred: true` and a stable `meta.heuristic` rule-id, and the UI must
show an "inferred / heuristic" badge plus a one-line rule statement on hover (per 01 §5). No heuristic ever
overwrites a structural category destructively — it is an **added** label so the raw mapping stays auditable.

**Verification heuristic (`heuristic: 'verify-cmd-v1'`).** A `command`/`tool_call` event is *also* tagged
`verification` when `input.command` (lowercased) matches a conservative allowlist of test/quality runners:
`\b(vitest|jest|pytest|npm (run )?(test|build|lint|typecheck)|tsc|eslint|playwright|go test|cargo test)\b`.
Rule statement shown in UI: *"Inferred from the command text matching a known test/build/lint runner."*
Conservative on purpose — a false negative (missing one) is cheaper than a false positive that inflates the
"verification" count.

**Retry / failure→correction heuristic (`heuristic: 'retry-correction-v1'`).** Flag an event as `retry`
when: a `tool_result`/`command` with `is_error:true` (or non-zero/failed output) is **followed**, within a
small window (e.g. next N≈3 tool events), by another `tool_use` **targeting the same `filePath` or
re-running a command with the same head token**. Rule statement shown in UI: *"Inferred: a failed
operation was followed shortly by another operation on the same file/command — treated as a correction
attempt, not confirmed."* Explicitly **not** a causal claim. Per 01 §3/§5: ship this *named, documented*
heuristic and do not oversell it as a "correction engine".

**Plan-text inference (`heuristic: 'plan-text-v1'`).** `ExitPlanMode` tool_use → `plan` is **structural**
(not inferred). Free assistant *text* that looks like a plan (numbered steps / "Here's the plan") may be
suggested as `plan` but only when inferred-labelled; default off if it proves noisy.

---

## 5. Edge cases the Vitest suite MUST cover

Each is a fixture + assertion that **the parser returns a result and never throws**, warnings land in the
separate channel, and counts are defensible:

1. **Malformed JSONL line** (one bad line among good) → good events parsed, bad line → 1 warning + 1
   `unknown` event; total line count reconciles.
2. **Truncated/half-written final line** (real export artifact) → handled as case 1, no crash.
3. **JSON array input** (`[ {...}, {...} ]`) → `format:'json-array'`, every element normalized.
4. **Single JSON object** (not an array, not NDJSON) → `format:'json-object'`, one record handled.
5. **Plain text, no structure** → `format:'plain-text'`, one `unknown` event, explanatory warning, no throw.
6. **Unknown/unsupported record type** (`type:'queue-operation'`, `'mode'`, fabricated type) → preserved as
   `unknown`, `rawType`/`rawData` retained, not dropped silently.
7. **Error event** — `tool_result` with `is_error:true` → `category:'error'`, status `error`.
8. **tool_call + tool_result pair** — assistant `tool_use` then user `tool_result` with matching
   `tool_use_id` → linked, `toolName` propagated to the result.
9. **Empty file** (0 bytes / whitespace only) → `events:[]`, `warnings` notes empty input, no throw.
10. **Oversized file** (> cap) → rejected at Stage 0 with a clear single warning/error, parser not run.
11. **Content that looks like HTML/script (XSS)** — a record whose `content`/command contains
    `<script>` / `<img onerror=...>` / `javascript:` → stored as **inert string**; test asserts the value is
    passed through as text and the design forbids `dangerouslySetInnerHTML`/`eval`/`new Function` (renderer
    test: it renders as visible text, not live DOM).
12. **Missing timestamps** — record with no `timestamp` → `event.timestamp === undefined`, **not** a
    fabricated/`Date.now()` value; duration math tolerates undefined.
13. **Duplicate ids** — two records with the same `uuid`/`id` → both kept; event `id` is made unique
    (e.g. suffix/index) so React keys and the UI don't collide; a warning notes the duplicate.
14. **Huge single line** — one extremely long JSONL line (e.g. a giant tool_result) → parses or degrades to
    one warning without hanging; assert it doesn't blow the per-line guard.
15. **`tool_result.content` as array** (confirmed common: 887×) → flattened to string safely.
16. **MCP tool name** (`mcp__server__tool`) → classified as generic `tool_call`, name preserved.
17. **Mixed/garbage non-Claude JSON** (valid JSON, unknown schema) → degrades to `unknown`, never throws.

A reconciliation invariant is worth one test of its own: `events_from_lines + warnings_for_dropped ==
input_record_count` so "skipped/malformed: N" is always provable.

---

## 6. Browser file-size limit & rationale

**Recommend a hard cap of 25 MB, with a soft warning at ~10 MB.** Rationale:

- Real exported sessions are typically tens of KB to a few MB; 25 MB covers long multi-hour sessions with
  fat tool outputs while staying comfortably parseable on the main thread in well under a second of GC-safe
  work. The 6 largest local logs sampled were well within this.
- Everything is client-side and synchronous-ish: `File.text()` + `JSON.parse` per line holds the whole
  string plus the event array in memory. Above ~25 MB you risk main-thread jank and a multi-hundred-MB heap
  once parsed objects + `rawData` retention are counted (we keep `rawData` for honesty/auditability, which
  roughly doubles memory). A cap protects the demo from a tab-freeze on a pathological file.
- The cap is a **deliberate, user-facing refusal** (clear message: "File exceeds 25 MB; this MVP parses up
  to 25 MB client-side") — the one place the pipeline legitimately stops, distinct from never-throw content
  handling. Document it in the README trade-offs (per 01 §5): streaming/worker parsing for larger files is a
  named, intentional cut for the 2-day box, not a silent gap.
- Pair the cap with the **huge-single-line** guard (§5.14) so a small file with one giant line can't defeat
  the byte cap.

---

*Bottom line: the real format has more record types and more polymorphism than the brief assumed, so design
for an open `type` set and probe-don't-assume key access. Keep stages pure and non-throwing, route every bad
line to a separate warning channel plus a visible `unknown` event, link tool_use↔tool_result by id, and badge
every retry/verification/plan-text guess as inferred with its rule stated. Test the 17 cases above; cap at
25 MB.*

— parser-design-reviewer (subagent)
