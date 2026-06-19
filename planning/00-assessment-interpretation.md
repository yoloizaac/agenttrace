# 00 — Assessment interpretation

Date: 2026-06-19

## What this assessment is

An "AI-Native Builder" technical assessment. The deliverable is a small, focused tool (AgentTrace) built largely with coding agents, plus a full paper trail of how the agents were used. The assessors are explicit that this is **not** a request for a large production app. A small, well executed, honestly documented project beats a sprawling one.

## What is actually being evaluated

Reading past the feature list, six things are graded:

1. **Effective use of coding agents.** Did subagents and AI tooling genuinely improve speed and quality, or were they theatre?
2. **Planning and handoff artifacts.** Clear, specific planning notes and agent handoffs that reflect real work, not boilerplate.
3. **A working project understandable quickly.** An assessor opens it and "gets it" in under a minute.
4. **Simple, secure, maintainable choices.** Minimal dependencies, safe rendering, no needless infrastructure.
5. **Sensible trade-offs for a 2-day box.** Evidence of deliberate cutting, not unfinished sprawl.
6. **Honesty.** Where AI helped, where it failed, how the human corrected it. Heuristics labelled as heuristics. No claimed-but-untested success.

The scope-review subagent reinforced this: the graded core is a deterministic, well tested parser, a UI a stranger understands in 30 seconds, and an honest paper trail. Timeline polish is garnish.

## How AgentTrace addresses each criterion

- **Coding agents:** five purpose-built subagents (scope, parser design, testing/security, UX/demo, final audit), each leaving a concrete handoff note under `planning/agent-handoffs/`. The main agent integrates; subagents do not edit the same implementation files in parallel.
- **Planning/handoffs:** twelve planning documents plus per-subagent handoffs, all written against what really happened in this repo (for example, the parser design was grounded in a real Claude Code log whose schema was sampled by the parser-design subagent).
- **Understandable quickly:** a one click "Load sample" so the app is never empty on first open, a privacy badge in the header, and a six-tile overview that summarises any session at a glance.
- **Simple/secure:** Vite + React + TypeScript, a handful of dependencies, all parsing in the browser, no network calls, no `dangerouslySetInnerHTML`, untreated text rendered through React's default escaping.
- **Trade-offs:** documented in `04-decisions-and-tradeoffs.md`; cut features are listed explicitly rather than hidden.
- **Honesty:** every inferred finding (retries, verification) is badged "inferred" in the UI and the report; the agent-log export is sanitised and, if a clean export is not possible, the failure is documented rather than faked.

## Submission requirements (checklist target)

- [ ] Public repository (created PRIVATE first per the user's default; flipped to public only with explicit approval before submission).
- [ ] Short demo recording (script in `planning/09-demo-script.md`; recording is a manual step for the user).
- [ ] `planning/` folder (this folder).
- [ ] README explaining what was built, how to run it, and trade-offs.
- [ ] Exported coding-agent logs where possible (`planning/agent-logs/`, sanitised; a failure note if export is not feasible).

## Out of scope (stated up front)

No API key, no database, no backend server, no account, no external AI service, no analytics, no remote logging. All uploaded data stays in the browser.
