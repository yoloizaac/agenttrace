# 04 — UX and Demo Review

Date: 2026-06-19
Author: UX-and-demo-reviewer (subagent)
Scope: analysis only, no source files changed. Reviewed `src/App.tsx`, all of
`src/components/`, `src/styles/index.css`, the sample at
`examples/sample-session.jsonl`, and the domain/analysis shapes.

## Verdict (the cold-open test)

An assessor opening this cold understands it in well under a minute. The header
states what it does in one line, the empty state names the single fastest action
("Load sample") in bold, and one click renders a complete, legible review:
overview tiles, tool table, inferred insights, a filterable timeline, and an
export. The honesty framing (inferred badges, "outcome not linked", parsing
warnings) is a genuine strength and rare in demo tools. Labels are defensible.
This is in good shape; the findings below are small, high-ROI polish, not a
redesign. Resist adding more.

---

## High

### H1. Hidden file input steals keyboard focus with no visible ring
`src/components/InputPanel.tsx` (the `.filelabel` + `<input>`), `src/styles/index.css`
(`.filelabel input` is `position:absolute; width:1px; opacity:0`).
The input is still in the tab order, so a keyboard user tabbing through lands
focus on the invisible input and the visible `:focus-visible` outline has nothing
to attach to. The upload control effectively has no focus indicator.
Minimal fix: move the focus ring to the label, e.g. add
`.filelabel:focus-within { outline: 3px solid var(--accent); outline-offset: 2px; }`.
One CSS rule, no markup change.

### H2. "Load sample" is the demo, but nothing nudges the eye to it
`src/components/InputPanel.tsx`. "Load sample" is styled `.primary` (good), but it
sits third in reading order after the file label and is visually equal-weight to
the upload control. For the cold-open story it should be the obvious first move.
Minimal fix: in the empty state copy (`App.tsx`) it is already named first and
bold, which mostly carries this. Optional one-liner: add a short helper under the
button, e.g. "New here? Start with Load sample." Do not restructure the row.

---

## Medium

### M1. Timeline filter chips have no visible label
`src/components/Timeline.tsx`. The chip group has `aria-label="Filter by category"`
(screen-reader fine) but no visible heading, and the search input's label is
`sr-only`. A sighted first-timer sees a row of pills with no prompt. Minimal fix:
add a small visible caption above the chips, e.g. `<span class="hint">Filter:</span>`
or a tiny `<h3 class="sr-only-... >`. Cheap clarity win.

### M2. Reset chip relies on a bare glyph
`src/components/Timeline.tsx` (`✕ Reset`). The button text "Reset" is present so
it is not a blocker, but the `✕` is decorative and read aloud by some screen
readers as "multiplication x". Minimal fix: wrap the glyph in
`<span aria-hidden="true">✕</span>` and keep the "Reset" text.

### M3. The sample's best moment (fail → fix → re-verify) is present but not spotlighted
The sample genuinely contains the cycle: `npm test` fails with
`exportToCsv is not a function` → rename edit → `npm test` passes 3/3 → build green
→ PR #42. In the UI this surfaces as: a red "Detected failures: 1" tile, an
inferred retry line in Insights, and red/green event cards in the timeline. It is
legible but spread across three sections, so a viewer skimming may miss that they
connect. This is the single most compelling thing the product proves, so it is
worth one cheap pointer. Minimal fix (optional, low priority): none required for
correctness; for the demo, just narrate it (see demo path). If you want a code
nudge, the inferred retry note in `Insights.tsx` already links the two event ids
in prose, which is enough. Do not build a dedicated "story" view; that is overbuild
for a 2-day assessment.

### M4. Render cap message can read as a limitation, not a safeguard
`src/components/Timeline.tsx` count-note. "Render is capped at N; refine the filter
to see the rest." is honest and good, but on the sample (27 records) it never
appears, and on a large real log it is the first thing a reviewer sees. Wording is
fine; just confirm the cap is high enough that the sample and typical small logs
never trigger it (they do not). No change needed; flagged so it is a conscious
choice.

---

## Low

### L1. Section headings are uppercase dim labels
`index.css` `.section h2` is `text-transform:uppercase` at 15px in `--text-dim`.
Reads as a label rather than a heading. Fine and intentional-looking; contrast of
`#5b6573` on white is ~5.2:1 (passes). No change.

### L2. Privacy badge and pills — contrast checks pass
Badge `--accent` `#1d4ed8` on `--accent-weak` `#e8eefc`, ok/err pills on their weak
backgrounds, and dim text on white all clear 4.5:1 by inspection. The privacy
message is repeated in header badge, input hints, and footer — slightly redundant
but reinforces the headline selling point, so leave it.

### L3. Event cards: `<pre>` content has its own scroll inside a `<details>`
`EventCard.tsx` / `.event-content max-height:320px; overflow:auto`. Nested scroll
regions can trap a mouse wheel, but content is short in the sample and this is a
reasonable guard for huge tool outputs. No change.

### L4. No dark-mode / reduced-motion handling
There is effectively no motion, so reduced-motion is moot. Dark mode is out of
scope for the assessment. Do not add either.

---

## Recommended demo click-path (3–5 min)

1. **Open cold.** Read the header line and the empty state aloud: the tool turns an
   exported agent session into a development timeline, everything local. Point at
   the "100% local, nothing uploaded" badge.
2. **Click "Load sample"** (one click — emphasize this is the fastest path). The
   whole review renders instantly.
3. **Overview tiles**: stop on the red "Detected failures: 1" and green
   "Verification events". This is the hook.
4. **Insights**: read the disclaimer first ("inferred, can be wrong") to establish
   honesty, then the inferred failure → retry line. This is the differentiator.
5. **Timeline**: scroll to the red `npm test` card showing
   `exportToCsv is not a function`, then the rename edit, then the green
   `3 passed` card and the green build. Say the sentence: "real failure, fix,
   re-verify — that is the cycle this tool makes visible." Expand one card to show
   raw content rendered as escaped plain text (the security posture).
6. **Filter**: click the "Error" chip, then "Verification", to show focus; type
   "csv" in search to show cross-field matching; hit Reset.
7. **Export**: click "Download Markdown report" and open the `.md` to show a
   portable, self-contained artifact.

That path is ~3 minutes and lands every claim the product makes.

## The one weakest area to call out honestly

The visual design is competent but plain: white cards, one blue accent, uppercase
gray labels. It reads as a clean internal tool, not a polished product, and a
reviewer will notice that before anything else. This is the right tradeoff for a
2-day, correctness-and-honesty-first assessment, and trying to make it look
"designed" now is the main overbuild risk. Name it in the demo as a deliberate
choice ("substance over skin for the assessment") rather than letting the reviewer
form the impression unprompted. Second-weakest: the filter chips appear without a
visible label (M1), the only spot where a first-timer might hesitate.
