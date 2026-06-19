# Agent activity log (curated, sanitized)

Date: 2026-06-19

This is a human-curated, public-safe chronological log of what the coding agent
actually did while building AgentTrace. It is drawn from the real Claude Code
session but is a summary, not a verbatim transcript (see `EXPORT-NOTE.md`). No
personal data, paths outside the project, or secrets are included.

## Phase 1 — inspect and plan

- Inspected the environment: Node v22.13.1, npm 10.9.2, git 2.49. Confirmed no
  existing `agenttrace` folder.
- Created the project and planning tree; `git init` on `main`.
- Ran two analysis subagents in parallel: scope reviewer and parser-design
  reviewer. The parser reviewer sampled the real Claude Code log schema (key
  names only) and reported that `type` is an open set and that user content is
  usually a `tool_result` array. Both wrote handoff notes.
- Wrote planning docs `00`..`05`.

## Phase 2 — scaffold

- Hand-wrote the Vite + React + TypeScript scaffold (no interactive
  `create vite`): `package.json`, `tsconfig*`, `vite.config.ts`,
  `eslint.config.js`, `index.html`.
- **Problem:** `npm install --prefix agenttrace` failed (ENOENT, exit 38) because
  it read `package.json` from the parent directory. **Fix:** `Set-Location` into
  the project, then `npm install` succeeded.

## Phase 3 — parser and tests

- Implemented the domain model and the parser stages (`detectFormat`, `split`,
  `normalize`, `classify`, `analyze`, `index`, `util`, `constants`) as pure
  functions, plus the Markdown export.
- Authored the synthetic sample log with a real failure-to-fix-to-verify arc.
- Wrote the Vitest suite.
- **Problem:** first `npm test` run had 2 failures: a JSON bracket typo on sample
  line 5 (caught by the zero-warning sample assertion), and React trees not being
  cleaned between tests. **Fix:** corrected the bracket; registered
  `afterEach(cleanup)` in the test setup. Result: 43 tests passing.

## Phase 4 — toolchain build fix

- **Problem:** `npm run build` failed. First the `test` field was not typed on
  vite's `defineConfig`; switching to `vitest/config` then exposed a dual-Vite
  type clash because Vitest 2.1 pulled its own nested Vite. **Fix:** upgraded
  Vitest to v3 (supports Vite 6, dedupes to one Vite). Build then green
  (about 176 KB JS, 56 KB gzipped). Lint clean.

## Phase 5 — live verification and review

- Started the dev server and drove it via DOM reads. Confirmed 28 event cards,
  correct overview tiles, 7 tool rows, no console errors.
- **Problem found in the live preview:** verification cards read "outcome not
  linked" because the code used the tool call's own status. **Fix:** resolved
  each verification's pass/fail from its linked tool result; the sample now shows
  `npm test` failing, then passing, then a green build.
- Ran security and UX reviewers in parallel. Security found a real recursion
  stack-overflow in the content flattener and a batch-wipe behaviour; UX found
  three accessibility quick wins.
- **Fixes applied:** depth cap on the flattener; per-record normalize isolation;
  Markdown link defang; category-based tool-call count; file-input focus ring,
  filter caption, and `aria-hidden` on the reset glyph. Added a runtime
  network-egress trap test and deep-nesting tests. Result: 47 tests passing,
  lint clean, build green.

## Phase 6 — documentation

- Wrote the README, `LICENSE`, and planning docs `06`..`11`.

## Verification commands and results (representative)

- `npm test` → 47 passed (7 files).
- `npm run lint` → no errors.
- `npm run build` → green, about 177 KB JS / 56 KB gzip.

## Tooling note

The preview screenshot tool hung repeatedly on this machine, so UI verification
used the preview eval channel (DOM reads) plus one successful full-page capture,
rather than asserting success without evidence.
