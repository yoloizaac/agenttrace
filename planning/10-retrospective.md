# 10: Retrospective

Date: 2026-06-19

## What worked

- **Parser first, UI second.** Building and testing the pure parser pipeline
  before any component meant the UI only ever displayed honest, tested data. The
  graded core was solid before time went into presentation.
- **Grounding the parser in a real log.** Sampling the actual Claude Code schema
  (keys only) up front meant the tolerant design matched reality instead of the
  brief's simplified assumptions. The "preserve unknown, warn separately"
  contract held against every edge case.
- **A verification loop at each phase.** Tests green before the UI, build green
  after the UI, then a live preview. The live preview caught a real labelling bug
  (verification outcomes) that the unit tests did not, because the tests did not
  assert on that display string.
- **Parallel, single-purpose reviewers.** Security and UX ran at once on distinct
  concerns. The security pass found a genuine stack-overflow bug and a batch-wipe
  behaviour that a casual read would have missed.
- **Honesty as a design constraint.** Flagging every heuristic `inferred` and
  refusing to claim untested success made the planning docs and the product
  consistent, which is exactly what the assessment grades.

## What did not work the first time

- Toolchain friction ate real time: a wrong-directory `npm install`, a Vitest /
  Vite dual-version type clash, and a config-typing error. All were resolved, but
  they are a reminder that "scaffold" is not free.
- A bracket typo in the hand-written sample slipped in and was only caught by the
  sample test. Generating the sample from objects rather than hand-typed JSON
  would have avoided it; the test net caught it anyway.
- The preview screenshot tool hung repeatedly on this machine, so visual
  verification leaned on DOM reads instead of images.

## Did subagents improve the result?

Yes, materially. The parser-design reviewer changed the parser's shape for the
better and pre-empted format brittleness. The security reviewer found a real bug
and a real privacy-test gap. The scope reviewer kept the build from sprawling.
The cost was coordination: subagents did analysis only and the main agent
integrated, which is the right pattern but means findings arrive as text to act
on, not as merged code. For a project this size that trade was clearly positive.

## What I would do differently with more time

- Generate the synthetic sample programmatically so it cannot contain a syntax
  typo, and add a second sample in a non-Claude shape to demonstrate tolerance.
- Add a small end-to-end test that loads a real exported log fixture (sanitised)
  and asserts on counts, to complement the synthetic sample.
- Spend a little of the saved UI-polish budget on a single, tasteful visual
  pass, since "plain" is the first thing a reviewer notices, while still
  resisting a full redesign.
