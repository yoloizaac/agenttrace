# 03 — Testing & Security Review

Date: 2026-06-19
Author: testing-and-security-reviewer (subagent)
Scope: analysis only, no source files were modified.

## Verification I actually ran

- `npm test` → 43/43 pass (5 files). Re-ran after my probes were deleted: still 43/43.
- `npm run lint` → clean, zero warnings.
- `npm run build` → green (`tsc -b && vite build`, 48 modules, ~176 kB JS / 56 kB gzip).
- Plus ~18 throwaway adversarial probe cases (deleted before finishing): prototype
  pollution, deep nesting, numeric/null/bool/object content, BOM, 24 MB single line,
  Markdown table injection. Findings below cite exact behavior observed.

## Risk verdict

Low overall. The privacy and XSS guarantees are real and well-tested. There is one
genuine robustness bug (unbounded recursion in `flattenContent`) but it is *contained*
by the outer try/catch, so it degrades to a clean error rather than crashing the UI.
The cost is collateral data loss (see High-1). Nothing here is exploitable as code
execution or data egress.

---

## High

### High-1 — One pathologically deep record destroys the whole batch
**Where:** `src/parser/util.ts:51-67` (`flattenBlock` recurses through `block.content`
arrays with no depth cap) and `src/parser/index.ts:61-63` (the `flatMap(normalizeRecord)`
that calls it sits inside the single outer `try`).

**What I observed:** I fed a JSONL input of three lines — two good `user` messages and
one assistant message whose `message.content` was a ~50,000-deep nest of
`{"type":"text","content":[ … ]}` blocks. Result: `flattenBlock` overflowed
(`RangeError: Maximum call stack size exceeded`), the outer catch in `index.ts` fired,
and `parseText` returned `format: 'plain-text'`, **0 events**, one generic
`error: Unexpected parse error…` warning. Both good lines were lost.

**Why it matters:** The project's core promise is per-record tolerance — `split.ts`
already isolates a bad *JSON.parse* per line so one junk line never sinks the others.
But a record that parses fine yet overflows during *normalize* is not isolated, so a
single hostile/huge line silently discards every other event in the file. A user with a
real 5 MB session that happens to contain one deeply nested tool payload would see "0
events, unexpected error" instead of their session.

**Concrete fix (pick one, ideally both):**
1. Bound recursion in `flattenBlock`: add a `depth` parameter, stop at e.g. 200 and
   return `safeStringify(block)` (already truncated) instead of recursing further. This
   removes the overflow at the source and is the higher-value fix.
2. Isolate per-record normalize failures so one bad record cannot take down siblings.
   In `index.ts`, wrap the per-record call:
   ```ts
   split.records.flatMap((record, i) => {
     try { return normalizeRecord(record, i); }
     catch { return [{ id: `err-${i}`, category: 'unknown', role: 'unknown',
       title: 'Unparsable record', content: '(record skipped: too complex to render)',
       status: 'unknown', rawType: 'error' } as AgentEvent]; }
   })
   ```
   With (1) in place this becomes belt-and-suspenders, but it's cheap and matches the
   tolerance philosophy the rest of the parser already follows.

**Test to add (exact shape):** build the deep block *as a string* (do NOT `JSON.stringify`
a deep object — that overflows in the test itself, which is a red herring I hit):
```ts
const depth = 50000;
const deep = '{"type":"text","content":['.repeat(depth) + '"x"' + ']}'.repeat(depth);
const text = [
  '{"type":"user","message":{"role":"user","content":"keep me 1"}}',
  `{"type":"assistant","message":{"role":"assistant","content":[${deep}]}}`,
  '{"type":"user","message":{"role":"user","content":"keep me 2"}}',
].join('\n');
const r = parseText(text);
expect(() => parseText(text)).not.toThrow();          // already holds
expect(r.events.some(e => e.content.includes('keep me 1'))).toBe(true); // FAILS today
```

---

## Medium

### Med-1 — `flattenContent` recursion is unbounded by design
**Where:** `src/parser/util.ts:35-67`. `flattenContent` → `flattenBlock` → (array branch,
line 57-59) → `flattenBlock`, with no depth guard. The `{content:{content:…}}` *object*
chain happens to terminate early (line 56 returns the string at the first non-array
`content`), but the *array* chain (`content:[ … ]`) recurses one frame per level.

**Why it matters:** This is the root cause of High-1; calling it out separately because
the fix (a depth cap) hardens every caller at once, including any future one. It is also
the only place in the parser that can throw on well-formed JSON.

**Fix:** depth-capped `flattenBlock(block, depth = 0)`; bail to `safeStringify` at the cap.

### Med-2 — Privacy test is a source grep, not a runtime assertion
**Where:** `src/__tests__/privacy.test.ts:19-34`. It greps `src/**` for
`fetch|XMLHttpRequest|sendBeacon|new WebSocket|EventSource` and for
`dangerouslySetInnerHTML`. I independently confirmed by hand that the app contains none
of these, no `eval`/`new Function`/`import()`, no `localStorage`/`cookie`/`postMessage`/
`window.open`, no `target="_blank"`, and the CSS has no `url()`/`@import`/`@font-face`
(so no web-font or remote-image beacon either). So the guarantee currently holds.

**The gap:** a regex can be fooled — `globalThis['fet'+'ch']`, `img.src = userUrl`, a
dynamic `new (window.WebSocket)()`, or pulling a network primitive from a future
dependency would all pass the grep. The test asserts *absence of a spelling*, not
*absence of network traffic*.

**Fix:** add a runtime egress trap in jsdom that fails if anything tries to leave. In
`setup.ts` or a dedicated test:
```ts
beforeEach(() => {
  for (const k of ['fetch','XMLHttpRequest','WebSocket','EventSource','sendBeacon'])
    vi.spyOn(globalThis as any, k as any).mockImplementation(() => {
      throw new Error(`network call attempted via ${k}`);
    });
  vi.spyOn(navigator, 'sendBeacon').mockImplementation(() => { throw new Error('beacon'); });
});
```
Then drive the full flow (load sample → filter → export) and assert nothing threw. This
catches behavior, not spelling, and is the test most worth adding.

---

## Low

### Low-1 — Markdown export passes `javascript:` links through verbatim
**Where:** `src/export/markdown.ts`. `cell()` (132-134) and `snippet()` (136-140)
strip newlines and escape pipes — so untrusted content genuinely *cannot* break the
table structure or the file list (I verified `Tool|Name\nNewline` →
`| Tool\|Name Newline | … |`, and `a|b\nc.ts` → `` `a\|b c.ts` ``, both intact). Good.
But a content value like `[click](javascript:alert(1))` is copied into the report
unchanged (observed: `- [user_prompt] User message: [click](javascript:alert(1))`).

**Why it's only Low:** the danger is entirely downstream — it depends on *which Markdown
viewer the user opens the exported file in*, and most (GitHub, VS Code preview) neutralize
`javascript:` links. The AgentTrace app itself never renders this. Still, since the app
produces the artifact, defanging is cheap and honest.

**Fix (optional):** in `snippet`/`cell`, neutralize the scheme inside link syntax, e.g.
replace `](javascript:` / `](data:` / `](vbscript:` with `](unsafe:`. One regex.

### Low-2 — `toolCalls` count silently excludes flat-record tool calls
**Where:** `src/parser/analyze.ts:81` and `:94`. Both `counts.toolCalls` and
`computeToolUsage` count only `e.rawType === 'tool_use'`. A non-Claude log that expresses
a tool call as a *flat* record (handled by `flatRecordToEvent`, which sets
`rawType: recType ?? 'tool_use'` at normalize.ts:233, or `'command'`) is categorized as
`command`/`tool_call` in the timeline but is **not** counted in "Tool calls" or the Tool
usage table.

**Why it's Low and arguably correct:** the Tool-usage table is explicitly scoped to
linked tool_use/tool_result pairs (the UI hint in `ToolUsage.tsx:49-52` says exactly
this), and flat logs rarely carry result linkage. So the number is defensible. The risk
is only that "Tool calls: N" reads as *all* tool activity when it means *Claude-style
tool_use blocks*. If you want to be maximally honest, either relabel the tile/markdown
line to "Tool-use blocks" or broaden the count to include `category` of
`command`/`tool_call`/`file_operation`/`verification`. Flag, not a bug.

### Low-3 — Retry detection window is fixed and undocumented in the UI
**Where:** `analyze.ts:11` (`RETRY_WINDOW = 5`) and `detectRetries` (123-155). Retries
are only found within 5 subsequent tool calls and are correctly marked `inferred` and
shown under an "(inferred)" heading with a disclaimer (`Insights.tsx:13-17`), so honesty
is fine. The only note: a same-tool-name match with no command (e.g. two `Read`s in a row,
one after an unrelated error) will be reported as a "retry". The note text hedges
("shortly after"), so this is acceptable, but a test pinning the window behavior and the
no-false-positive-across-window case would lock it down.

---

## What is already solid (do not over-correct)

- **XSS / unsafe rendering: genuinely safe.** All log-derived strings render as JSX text
  children. `EventCard.tsx:29` puts content in `<pre>{event.content}</pre>` (React-escaped);
  title, toolName, command, filePath all render as `{…}` text. No `dangerouslySetInnerHTML`,
  no `eval`, no `new Function`, no `innerHTML`, no template-string HTML anywhere in `src`.
  Confirmed by the two render tests (render.test.tsx:35-52) and by hand.
- **No `href`/`src` fed from log content.** The only `href` in the app is
  `download.ts:10`, set to a `URL.createObjectURL(blob)` blob URL the app itself creates —
  not attacker-controlled. No `<a>` renders any parsed string.
- **Privacy: no egress in the app.** No fetch/XHR/beacon/WebSocket/EventSource/dynamic
  `import()`; no analytics; no storage APIs; no external links; no remote CSS assets. The
  sample is bundled via `?raw` (sampleLog.ts), not fetched. Download is an in-memory Blob.
- **`parseText` "never throws" contract holds even under the overflow.** I tried hard to
  make it throw to the caller (deep nesting, broken JSON, null/numeric/object content,
  BOM, 24 MB line) and could not — the outer try/catch in index.ts:46-113 plus the
  pre-parse size cap (MAX_BYTES, index.ts:24) catch everything. High-1 is about *data
  loss inside that guard*, not a crash.
- **Prototype pollution: not reachable.** `normalize` never assigns parsed keys onto a
  shared object; it reads named keys via `pickString`/`getObject` and builds fresh event
  literals. A `{"__proto__":{…}}` input did not pollute `Object.prototype` in my probe.
- **Metric honesty is good.** Counts derive from parsed events; `files` is correctly
  scoped to real `file_operation` events (analyze.ts:108-116, with the directory-vs-file
  comment); verification and retry are both flagged `inferred` and labeled as heuristics
  in UI and Markdown; timestamps are never fabricated (verified by sample.test.ts:33-36
  and parser.test.ts:226-229). The Markdown report carries an explicit heuristic + "no
  data uploaded" disclaimer.
- **Size guards are correct.** `parseFile` checks `file.size` before reading (index.ts:121),
  so an oversized file is never loaded into memory; `parseText` checks byte length and
  truncates content at 20 k chars.

## Suggested new tests (priority order)

1. **Runtime network egress trap** (Med-2 fix) — the single highest-value addition;
   turns the privacy claim from "no spelling found" into "no traffic emitted".
2. **Deep-record isolation** (High-1 test above) — assert sibling lines survive a deep line.
3. **`flattenContent` depth cap** — `flattenContent(deepArrayBlock)` returns a string and
   does not throw (build the structure directly, not via JSON.stringify).
4. **Markdown link defanging** (Low-1) — `[x](javascript:alert(1))` does not appear with
   an executable scheme in the exported `.md`.
5. **Markdown structural integrity** — a failure event whose content contains `|` and
   `\n` still yields a single, unbroken table/list line (partly covered for the table by
   export.test.ts:31-37; extend to the Failures and Files sections).
6. **Flat-record tool call accounting** (Low-2) — pin whether a flat `{tool, command}`
   record is or isn't counted in `toolCalls`, so the intended contract is explicit.
