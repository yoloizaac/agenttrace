# 06 — Agent contributions

Date: 2026-06-19

## Subagents used

Four analysis subagents ran, each with a distinct job and a handoff note under
`planning/agent-handoffs/`. None edited implementation files; the main agent
(Claude Code, lead) integrated everything to avoid parallel-write conflicts.

### 1. assessment-and-scope-reviewer (`01-scope-review.md`)
Restated what the assessment really grades, challenged the long feature list,
and named the overbuild risks. Key call accepted: the graded core is a
deterministic, well tested parser plus a UI a stranger understands in 30 seconds
plus an honest paper trail, and timeline polish is garnish. The main agent
followed this priority order and cut charts, persistence, theming, and any real
retry-correlation engine.

### 2. parser-design-reviewer (`02-parser-design.md`)
Sampled the real Claude Code log on this machine (top-level key names only, no
content) and corrected the brief's assumptions: `type` is an open set (it saw
`attachment`, `queue-operation`, `ai-title`, `mode`, and more), and a user
line's `content` is more often a `tool_result` array than a prompt string. It
proposed the layered pipeline and the category mapping that the parser
implements, and the edge-case list that became the test plan. Accepted almost
wholesale; it directly shaped `normalize.ts` and the 25 MB / 10 MB size caps.

### 3. testing-and-security-reviewer (`03-testing-security.md`)
Read the finished parser, export, and UI, ran the build and tests itself, and
ran adversarial probes. It found one real bug (unbounded recursion in the
content flattener that could overflow the stack, and the fact that the outer
try/catch then wiped the whole batch rather than the one bad record). It also
proposed a runtime egress trap to back the privacy claim with behaviour, not
just a source grep. Both accepted and implemented.

### 4. UX-and-demo-reviewer (`04-ux-demo.md`)
Judged the cold-open experience and accessibility. Three quick wins accepted: a
visible focus ring on the hidden file input, a visible "Filter:" caption on the
chip group, and `aria-hidden` on the decorative reset glyph. It also recommended
the demo click-path and named the honest weakness (plain visual design). Its
advice to resist a redesign was followed.

## What the main agent accepted, modified, or rejected

- **Accepted:** the scope cuts; the parser architecture and category mapping; the
  size caps; the stack-overflow fix; the egress trap; the three a11y fixes; the
  demo path.
- **Modified:** the security reviewer suggested defanging Markdown links with a
  zero-width space inside the scheme; the main agent dropped that (it left an
  invisible character in source) and relied on breaking the `](` link syntax
  instead, which is enough and keeps the source clean. The verification-outcome
  fix (resolving a verification card's pass/fail from its linked result) was the
  main agent's own catch from running the live preview, not a subagent finding.
- **Rejected / deferred:** any redesign of the visual layer (overbuild); a real
  statistical retry engine (documented adjacency heuristic instead).

## Where AI accelerated the work

- The parser-design subagent's schema sampling removed a whole class of "guess
  the format" risk up front, so the parser was tolerant from the first version.
- Running two reviewers in parallel (security and UX) covered independent
  concerns at once and surfaced the stack-overflow bug before it could reach a
  reviewer's own file.
- The bulk of boilerplate (component scaffolding, test fixtures, the synthetic
  sample) was generated quickly, leaving human attention for the judgement calls:
  scope, honesty framing, and the dependency-version fix.
