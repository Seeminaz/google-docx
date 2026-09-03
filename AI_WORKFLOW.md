# AI Workflow

This project was built with Claude Code across two work sessions: an initial
build session that produced the backend, the frontend scaffold, and the
9-test backend suite (documented as the starting point in `HANDOFF.md`), and
a second session — this one — that took it from "builds clean, never opened
in a browser" to a tested, polished, deployed submission. What follows
describes the second session in detail, since that's the one I can speak to
firsthand.

## Where AI sped things up

- **Writing the routine CRUD/schema code fast.** The FastAPI endpoints,
  SQLAlchemy models, and Pydantic schemas are boilerplate-shaped work Claude
  handled quickly in the first session, freeing time for the parts that
  actually needed judgment.
- **Systematic bug isolation, not just pattern-matching a fix.** When typed
  text came out corrupted in testing, instead of guessing at the Tiptap
  config, I had Claude write a sequence of narrowing test scripts (disable
  the suspect effect and retest; test with only Bold vs. Bold+Italic; test
  keyboard vs. mouse selection; test with a delay vs. no delay) to isolate
  the exact mechanism before touching the fix. That process also caught a
  second, unrelated real bug (spurious autosave on document open) that a
  "looks fine, ship it" pass would have missed.
- **Driving the actual app in a headless browser.** This environment has no
  GUI, so Claude set up Playwright + Chromium on the fly to click through
  the real running app (create → format → upload → share → switch users →
  refresh) rather than reasoning about the code in the abstract. Several of
  the bugs below only exist as failure modes in the *rendered* app — they
  would not show up from reading the source.

## What AI output was changed or rejected

- **The first theory for the typing-corruption bug was wrong and I said so
  before accepting a fix.** The initial hypothesis (a browser/Playwright
  timing quirk) didn't hold up — a follow-up test with a 150ms delay before
  the next keystroke reproduced *cleanly*, which pointed at a React
  re-render race instead. I pushed for root-causing the actual mechanism
  (the `content` prop feeding back into `setContent` on every keystroke)
  rather than accepting "add a small delay" as a fix, since a delay would
  have papered over data loss instead of removing it.
- **A "text vanishes" finding was investigated and explicitly ruled out as
  a false positive**, rather than reported as a bug or silently patched.
  Isolating it down to zero-delay automated clicks immediately followed by
  Enter (not reproducible with any realistic human timing) showed it was an
  artifact of the test script's speed, not the app. It's called out here
  instead of hidden because a wrong bug report is its own kind of error.
- **Removed unused Tiptap extension import** (`@tiptap/extension-underline`)
  that Claude's first pass had flagged only as a console warning
  ("duplicate extension") — worth fixing since it signaled a real
  misunderstanding of what StarterKit v3 already bundles, not just noise.

## How correctness was verified

- Backend: the existing 9-test `pytest` suite, re-run after every backend
  touch (none were needed — the backend was untouched this session beyond
  a database reset for clean test data).
- Frontend: no unit tests were added for the editor specifically (out of
  scope for the time available — see `SUBMISSION.md`), but every fix was
  verified against the *running* app via Playwright: full create → format →
  autosave → upload → share → cross-user access-control → refresh flow,
  re-run after each change, plus targeted isolation scripts for the two
  data-integrity bugs (content corruption, spurious autosave) with
  before/after HTML diffs proving the fix.
- `npm run build` and `npm run lint` (oxlint) run clean as a final gate
  before deploy.
