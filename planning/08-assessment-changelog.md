# 08: Assessment changelog

Date: 2026-06-19

**This repository was created from scratch for this assessment.** It is not an
extract of prior work. The git history starts with the scaffold commit and every
commit was made during the assessment.

## Features completed

- Tolerant parser pipeline (decode, format detection, split, normalize, classify,
  analyze) that never throws to the UI.
- Normalized event model with eleven categories, an `inferred` flag for
  heuristics, and preserved raw data.
- Three inputs: `.jsonl` upload, `.json` / `.txt` upload, paste.
- One-click bundled synthetic sample.
- Session overview (six metrics), tool-usage table with linked outcomes,
  heuristic insights (failure-to-retry, verification, warnings), and a
  filterable + searchable timeline of expandable cards.
- Markdown report export generated and downloaded in the browser.
- Safe rendering (escaped text only, no `dangerouslySetInnerHTML`), a 25 MB size
  cap, and a "100% local" privacy badge.
- 47 Vitest assertions, ESLint clean, production build green.

## Significant files added

- Parser: `src/parser/{index,detectFormat,split,normalize,classify,analyze,util,constants}.ts`
  (file decoding and the size guard live in `index.ts` via `parseText` / `parseFile`).
- Domain: `src/domain/{event,analysis}.ts`.
- Export: `src/export/{markdown,download}.ts`.
- UI: `src/App.tsx`, `src/components/*`, `src/styles/index.css`.
- Sample: `examples/sample-session.jsonl`, `src/sample/sampleLog.ts`.
- Tests: `src/__tests__/{parser,sample,export,render,privacy,egress,hardening}.test.ts(x)`.
- Planning: `planning/00`..`12` and `planning/agent-handoffs/*`, `planning/agent-logs/*`.
- Config: `package.json`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`,
  `.gitignore`, `.gitattributes`, `README.md`, `LICENSE`.

## Commit history (assessment)

1. `chore: scaffold AgentTrace assessment project`
2. `feat: add tolerant session log parser`
3. `feat: add Markdown report export`
4. `feat: add local session review dashboard`
5. `test: cover parser edge cases and harden local processing`
6. `docs: add assessment evidence and demo guide` (this documentation pass)

## Verification at time of writing

`npm test` 47 passing, `npm run lint` clean, `npm run build` green (about 177 KB
JS, 56 KB gzipped). See `planning/12-final-audit.md` for the requirement-by-
requirement audit and the exact command output.
