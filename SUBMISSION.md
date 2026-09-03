# Submission

## What's included

- FastAPI + SQLAlchemy backend (SQLite dev / Postgres prod), 9 automated
  tests, all passing
- React + Vite + Tiptap frontend, builds clean, lints clean
- `README.md`, `ARCHITECTURE.md`, `AI_WORKFLOW.md` (this file's siblings)
- Live deploy: frontend and backend both on Vercel (links in `README.md`)

## What's working end-to-end (verified live in a browser, not just tested in isolation)

- Create, rename, and delete documents (delete requires confirmation)
- Rich-text editing: bold, italic, underline, H1/H2/H3, paragraph, bullet
  and numbered lists — all with keyboard shortcuts and visible hints
- Autosave (600ms debounce) with a live "Saved Xs ago" indicator
- Upload a `.txt` or `.md` file → becomes a new document
- Share a document with another seeded user by email; shared users can open
  and edit it, see who it's shared with / who shared it with them
- Access control: a user with no access to a document gets a 403, verified
  both via backend tests and by switching users in the live UI
- Persistence: refreshing the browser reloads the correct state from the
  server every time — verified as part of the same flow, not assumed

## What's explicitly out of scope (and why)

- **Real authentication.** The assignment explicitly permits mocked/seeded
  auth; building real auth wouldn't have improved what's being graded
  (editing experience, product judgment) and would have cost hours.
- **Granular share roles (view-only vs. edit).** The `Share` table only
  tracks access, not a permission level. Adding this cleanly needs a
  `role` column, a migration, backend enforcement in `update_document`, and
  a read-only mode in the editor toolbar (`Editor.jsx` already has an
  `editable` prop and a "Read-only preview" state that's unused today —
  it was clearly meant for this and never wired up). Estimated 1–1.5 hours
  done properly.
- **`.docx` upload support.** Only `.txt`/`.md` are accepted, stated clearly
  in the UI. Parsing `.docx` to HTML reliably (styles, tables, images) is a
  meaningfully bigger problem than the rest of the upload feature combined.
- **Real-time collaboration.** No live cursors, no concurrent-edit merging.
  Each document is edited by one user at a time from the client's point of
  view; two users editing simultaneously will silently overwrite each
  other's last save. Flagged as optional stretch in the assignment brief.
- **Version history.** The schema doesn't track revisions, only the current
  `content` blob. Would need a `Revision` table and a decision about
  snapshot frequency (every save vs. periodic).
- **Editor unit tests.** The one required automated test is comfortably
  covered by the 9 backend tests; no frontend test harness (Vitest/RTL) was
  set up given the time budget. Correctness for the frontend was instead
  verified by actually driving the running app end-to-end (see
  `AI_WORKFLOW.md`) rather than left unverified.

## What I'd build next with 2–4 more hours

1. **View-only share role** — the highest-value gap given the editor
   already has an unused read-only mode ready to wire up.
2. **Version history** — append-only revision log with a simple "restore
   this version" action; the most tractable of the two stretch goals the
   assignment names, and the schema change is small.
3. **A frontend test** (Vitest + React Testing Library) covering the
   autosave debounce and the delete-confirmation flow, to complement the
   backend suite with something that exercises actual UI behavior.
4. **Database migrations** (Alembic) — right now Postgres and SQLite both
   rely on `create_all` at startup, fine for the current 3-table schema but
   not a real migration story for a schema that will keep changing.
