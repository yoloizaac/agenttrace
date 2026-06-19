# 07: Problems and corrections

Date: 2026-06-19

An honest log of what went wrong during the build and how it was fixed. These
are real events in this repository, not hypotheticals.

## Commands and approaches that failed

1. **`npm install --prefix agenttrace` read the wrong package.json.** The first
   install ran from the parent `Downloads` directory and `--prefix` made npm
   look for `Downloads\package.json`, which does not exist (ENOENT, exit 38). Fixed by
   `Set-Location` into the project directory before installing.

2. **The production build failed on the Vitest config typing.** `tsc -b`
   type-checks `vite.config.ts`; the `test` field is not on vite's
   `defineConfig`. Switching the import to `vitest/config`'s `defineConfig`
   then surfaced a deeper problem.

3. **Two copies of Vite.** Vitest 2.1 pulled its own nested Vite, so
   `@vitejs/plugin-react`'s `Plugin` type (from top-level Vite 6) was not
   assignable to the type Vitest expected, and the build errored with a long
   structural mismatch. Fixed by upgrading Vitest to v3, which supports Vite 6
   and dedupes to a single Vite. (Downgrading Vite to v5 was the alternative;
   keeping modern Vite and moving Vitest up was the better trade.)

4. **The synthetic sample had a JSON bracket typo.** Line 5 closed the nested
   `tool_result.content` array with `}]}}]}}` instead of `}]}]}}`, so the parser
   correctly dropped it as a warning. Caught immediately because `sample.test.ts`
   asserts the sample parses with zero warnings. Fixed the bracket.

5. **Tests accumulated mounted React trees.** Vitest runs without injected
   globals, so `@testing-library/react`'s automatic `afterEach(cleanup)` was not
   registered and a later test found multiple "Load sample" buttons. Fixed by
   registering `cleanup` explicitly in the test setup.

6. **A test fixture overflowed `JSON.stringify`.** The deep-nesting hardening
   test first used 2000 levels; `JSON.stringify` itself overflowed before the
   parser ran. Lowered to 100 levels, which still exceeds the flattener's depth
   cap of 24 and proves the point.

## Incorrect assumptions, corrected

- **"User role means a prompt."** False for Claude Code: a user line's content is
  usually a `tool_result` array. The parser routes tool results to a `tool` role
  and only treats string content as a prompt.
- **"A tool's `path` input is a file."** A `Grep` over `path: "src"` is a
  directory search, not a file the agent touched. "Files touched" was restricted
  to real file operations so the count is honest.
- **"Tool calls equals Claude `tool_use` blocks."** That undercounts generic
  logs whose tool calls are flat records. The count is now category-based so any
  source format is counted fairly.

## Changes made after tests or reviews

- After the live preview showed verification cards reading "outcome not linked",
  the analysis was changed to resolve a verification's pass/fail from its linked
  tool result, so the sample now tells the true story (a `npm test` failure,
  then a fix, then a passing re-run).
- After the security review: the content flattener got a recursion depth cap, and
  per-record normalization was isolated so one pathological record cannot wipe
  its siblings; the Markdown export defangs link syntax.
- After the UX review: a focus ring on the file input, a visible filter caption,
  and `aria-hidden` on the decorative glyph.

## Human judgment that was still required

- Deciding which features to cut and holding the line against polishing the plain
  UI (the overbuild trap the reviewers warned about).
- Choosing the Vitest-up over Vite-down dependency fix.
- Designing the synthetic sample so it contains a real failure-to-fix-to-verify
  arc, which is what makes the demo land.
- The honesty framing throughout: labelling every heuristic `inferred`, not
  claiming untested success, and writing these notes from what actually happened
  rather than a template.
- Tooling limitation noted honestly: the preview screenshot tool hung repeatedly
  on this machine, so UI verification used DOM reads via the preview eval channel
  plus one successful full-page capture, rather than asserting success blindly.
