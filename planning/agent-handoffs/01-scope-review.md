# 01 — Scope Review & Build Priorities (AgentTrace)

Date: 2026-06-19
Author: assessment-and-scope-reviewer (subagent)
Status: pre-build advisory. Read before writing any code or planning doc.

---

## 1. What is actually being assessed

The deliverable is a parser + a small viewer. The product is the excuse. What the assessors are scoring is **how a developer wields coding agents under a time box and stays honest about it**. Concretely:

- Can you scope a vague, feature-heavy brief down to something that actually ships and works? (Restraint is a graded skill here, not a shortcut.)
- Is the parser **correct and robust** on messy real input, or does it look good on one happy-path file and crash on the second?
- Are the planning notes and agent handoffs **evidence of real thinking**, or generic AI filler that could describe any project?
- Does the README and the report tell the truth about what AI did, where it failed, and how the human caught it?

The "filterable searchable timeline with heuristic insights" is the visible surface. The graded core is: **a deterministic, well-tested parser; a UI a stranger understands in 30 seconds; and an honest paper trail.** Treat polish on the timeline as worth far less than one good Vitest suite over realistic malformed input.

A useful mental test for every hour spent: *"Does this make the parser more correct, the project more understandable, or my honesty more verifiable?"* If no, it is probably overbuild.

---

## 2. Scope challenge — the minimum coherent build

### Must-build (the definition of done)
- **File ingest**: drag/drop + file picker + paste-text box. Accept `.jsonl`, `.json`, `.txt`. One ingest path that normalizes all three. Nothing fancy.
- **Robust parser → normalized event model.** This is the project. Handle: line-delimited JSON, a JSON array, truncated/half-written final line, blank lines, unknown event types (keep them, label `unknown`), and non-Claude JSON (degrade gracefully, do not throw). Output a stable typed `Event[]`.
- **Session summary card**: total events, duration (first→last timestamp), counts by type, tool-usage tally, count of files touched, failures, retries/corrections detected.
- **Chronological timeline**: virtualized-or-simple list, each event with timestamp, type, one-line preview. **Filter by type + free-text search.** This is the headline feature — make it smooth.
- **Detected files / tool list**: derived tables. Cheap once the model is right.
- **A few heuristic insights**, each clearly labelled inferred (see §5).
- **Markdown report download**: serialize the summary + insights to a `.md` Blob, client-side. Low cost, high rubric value (it is a listed feature and demonstrates the model is complete).
- **One synthetic sample log**, fake names/paths/commands, loadable via a "Load sample" button so the assessor sees a populated app in one click with zero setup.
- **Tests**: Vitest over the parser, including the malformed cases above. **Green `build`/`test`/`lint` is non-negotiable** — it is an explicit pass/fail gate.

### Cut or keep-thin (overbuild risk / low ROI in 2 days)
- **Retry/correction-cycle detection beyond a simple heuristic.** A real correlation engine (matching a failed tool call to the later fix) is a multi-hour rabbit hole. Ship a *named, documented heuristic* (e.g. "edit to a file that immediately followed a failed edit/test on the same file") and label it inferred. Do not oversell it.
- **Fancy charts / D3 / timeline zoom-pan / Gantt visuals.** A clean list + counts beats a half-working chart. Skip any charting dependency.
- **Multi-file / multi-session compare, upload history, localStorage persistence.** Out of scope. Don't.
- **Theming, dark mode, animation polish, responsive breakpoints below tablet.** One clean desktop layout is enough. Don't burn the demo budget here.
- **Syntax highlighting of tool payloads, collapsible JSON trees.** Nice, not graded. Only if everything else is solid and tested.
- **"AI insight" text that reads like analysis but is actually templated.** Either make insights genuinely derived from the data or cut them. Fake-smart insights actively hurt the honesty score.

**Verdict:** roughly 60% of the listed features are the real build; the rest are garnish. Spend the saved time on parser test coverage and the README/honesty artifacts.

---

## 3. Top 5 ways this build FAILS the assessment

1. **Brittle parser.** Works on the sample, throws on a real exported `.jsonl` with a truncated last line or an unrecognized event type. A white-screen crash on the assessor's own file is the single most likely fail. Parsing must never throw to the UI — bad lines become a counted "skipped/malformed" stat, not an exception.
2. **Dishonest or untested claims.** README/report says "detects retries and correction cycles" when it is a thin heuristic, or claims tests pass when they were never run, or the "AI helped/failed" section is vague and self-congratulatory. Assessors are explicitly looking for the honest account; a polished lie scores worse than a modest truth.
3. **Confusing on first open.** App loads to an empty box with no instructions, no sample button, no idea what to paste. If the assessor can't get a populated view in one action, the "understandable quickly" criterion is gone. A one-click "Load sample" is the cheapest highest-leverage feature in the whole build.
4. **Generic planning docs.** `planning/` full of boilerplate ("we will build a robust scalable solution") that could apply to any project. The handoffs must reference *this* event model, *these* parser edge cases, *these* specific trade-offs and cuts. Specificity is the signal.
5. **Missing or fabricated artifacts.** No exported agent logs, no demo recording, private repo, or — worst — invented/edited logs to look better. Missing is a gap; fabricated is a disqualifier. Capture real `agent-logs/` as you go and keep them raw.

Honorable mention: a security smell (any `dangerouslySetInnerHTML`, eval of input, a network call) silently tanks the "secure" criterion even if nothing breaks.

---

## 4. Priority order (rock-solid → thin)

**Tier 1 — must be rock-solid (spend the most time):**
1. Parser correctness + the typed event model + the malformed-input test suite.
2. Safe rendering: all log content rendered as text, never as HTML. No `dangerouslySetInnerHTML`, no `eval`, no `new Function`, no network.
3. Working synthetic sample + one-click load so the app is never empty on open.
4. Honest planning docs, README (what / how-to-run / trade-offs), and the AI-help/-fail account. Capture agent logs continuously.
5. Green `npm run build` / `npm test` / `npm run lint` — verify by actually running them, not by assertion.

**Tier 2 — should be solid but can be plain:**
6. Timeline list with filter + search.
7. Summary cards and derived tool/file tables.
8. Markdown report export.

**Tier 3 — thin / cut-first if time runs short:**
9. Heuristic insights (keep few, keep labelled).
10. Retry/correction detection (simple, documented heuristic only).
11. Any visual polish, charts, collapsible payloads.

If forced to drop something at hour 40, drop from Tier 3 upward and **say so in the README trade-offs section** — a documented cut scores; a silent gap does not.

---

## 5. Honesty traps (label, don't fabricate, don't overclaim)

- **Heuristics must be labelled inferred.** Every derived insight (correction cycle, "verification action", retry, "the agent struggled here") carries a visible "inferred" / "heuristic" marker in the UI and a one-line statement of the rule used. Never present a guess as ground truth.
- **Do not claim untested success.** README must not say "all tests pass" / "handles all formats" unless the command was run and the output is real. Prefer "tested against N synthetic + malformed cases (see `src/parser/__tests__`)" with the actual number.
- **Do not fabricate or edit logs.** `agent-logs/` and the demo must be genuine captures of the real session, including the mistakes. If an export is partial or unavailable, state that plainly rather than reconstructing a clean-looking one.
- **The "where AI failed and how I corrected it" section must contain real incidents** with specifics (the wrong assumption, the failing test, the fix), not a token "AI occasionally made small errors." This section is graded; a concrete failure story is an asset, not an admission.
- **Sample data must be obviously synthetic** — fake names, paths, commands — and labelled as such, so nobody mistakes it for a real leaked session.
- **Counts must be defensible.** "Files detected", "failures", "tool calls" must be reproducible from the input by the documented rule. If a number is an estimate or excludes malformed lines, say so near the number.
- **Trade-offs section must list what was cut and why**, honestly tied to the 2-day box, not framed as "future enhancements" to hide that they were dropped.

---

*Bottom line: ship a correct, well-tested parser; make the app populated and legible on first open; tell the truth in the docs and label every heuristic. Everything else is optional.*
