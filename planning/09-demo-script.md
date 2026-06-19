# 09 — Demo script (3 to 5 minutes)

Date: 2026-06-19

Goal: show that an evaluator can understand a coding session in under a minute,
that the parser is tolerant and safe, and that the findings are honest.

## Setup

`npm install` then `npm run dev`, open the localhost URL. Start on the empty
state (do not pre-load anything).

## Walkthrough

1. **Cold open (20s).** Read the header: name, the one-line description, and the
   "100% local, nothing uploaded" badge. Point out the empty state names "Load
   sample" as the fastest path. Say: "Everything here runs in the browser, no
   key, no server, nothing leaves the page."

2. **One click (30s).** Click **Load sample**. The whole dashboard appears.
   Stop on the overview tiles. Read them out: 28 events, 1 user prompt, 10 tool
   calls, and the red **Detected failures: 1** and green **Verification events: 3**.
   Say: "These numbers are all derived from the parsed log, not hard-coded."

3. **The story (60s).** Scroll to **Insights**. Read the disclaimer first ("these
   are inferred"). Then the inferred failure-to-retry line, and the verification
   list: `npm test` ran but reported a failure, then `npm test` reported success,
   then the build passed. Say: "The tool reconstructed a real fix loop: a test
   failed, the agent renamed the export, the re-run passed. And it labels that as
   inferred, not fact."

4. **Timeline (45s).** Scroll into the timeline. Open the red `npm test` failure
   card to show `exportToCsv is not a function`. Open the following `Edit` card
   (the rename) and the green re-run. Then use the **Filter** chips: click
   **Error**, then **Verification**, then **Reset**. Type "csv" in search to show
   it narrows live.

5. **Safety (20s).** Mention that all of that card content is rendered as escaped
   text, never HTML, and that there is a test which drives the whole app while
   trapping every network call and asserts none fire.

6. **Export (20s).** Click **Download Markdown report**. Open the downloaded
   `.md` and scroll the summary, tool table, failures, and the heuristic +
   privacy disclaimer at the bottom.

7. **Tolerance (optional, 20s).** Paste a couple of junk lines mixed with one
   valid JSON line and click **Parse pasted text** to show it warns on the bad
   line and still parses the good one, never crashing.

## Talking points to hit

- **Where AI helped:** a subagent sampled the real Claude Code log schema, so the
  parser was tolerant from the start; parallel security and UX reviewers caught
  issues a single pass would have missed.
- **One AI failure:** the first verification view showed "outcome not linked" for
  every check because it read the tool call's own status instead of the linked
  result. Running the live preview exposed it; the analysis was corrected to
  resolve outcomes from linked results.
- **One trade-off:** no AI API and no charts. Parsing is deterministic, so the
  insights are honest heuristics rather than an LLM guess, which is also more
  reproducible and private.
- **Weakest area (state it honestly):** the visual design is plain, and retry
  detection is a simple adjacency heuristic that can miss non-adjacent
  corrections. Both are deliberate for the time box and are labelled as such.
- **What I would improve next:** virtualised timeline for very large logs and
  optional two-session comparison.
