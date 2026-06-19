# 11 — Next steps

Date: 2026-06-19

Ordered roughly by value for effort.

1. **Record the demo.** Follow `09-demo-script.md` and capture a 3 to 5 minute
   screen recording. This is a submission requirement and the one remaining
   manual step.
2. **Publish the repository.** It is currently local (and would be created
   private by default per the owner's GitHub habit). Flip to public only with
   explicit approval before submitting, since the assessment asks for a public
   repo.
3. **Add a real, sanitised log fixture test.** Drop one anonymised exported
   session under `examples/` and assert counts on it, to complement the synthetic
   sample with a real-shape case.
4. **Generate the sample programmatically.** Build `sample-session.jsonl` from
   typed objects in a small script so it cannot drift or carry a syntax typo.
5. **Virtualise the timeline.** Replace the 1500-card render cap with windowed
   rendering so very large logs stay smooth without relying on filters.
6. **Two-session comparison.** Load two logs and diff their tool usage, failures,
   and verification, for before/after reviews.
7. **Tighter file linkage.** Where a log includes diffs, link a tool call to the
   specific file region it changed.
8. **One tasteful visual pass.** A single restrained design improvement to the
   cards and overview, without turning it into a redesign.

Explicitly not planned: any backend, account, AI API, analytics, or remote
logging. Those would break the core promise that everything stays in the browser.
