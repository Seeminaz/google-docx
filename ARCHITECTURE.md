# Architecture

## Overview

Two services: a FastAPI backend (SQLAlchemy over SQLite) and a React/Vite
frontend using Tiptap for rich text. The backend is the source of truth for
everything — documents, sharing, and the three seeded users; the frontend is
a thin client that autosaves and re-fetches.

```
Browser (React + Tiptap)
   │  fetch, ?user_id=... on every request
   ▼
FastAPI (main.py)
   │  SQLAlchemy ORM
   ▼
SQLite (docs.db)
```

## Data model

Three tables (`backend/models.py`): `User`, `Document` (owned by a `User`,
stores `title` + `content` as HTML), and `Share` (a join row: which `User`
can access which `Document`). Access control is computed on every request
from these two relations — owner or a row in `Share` grants access, anyone
else gets a 403 (`get_accessible_doc_or_403` in `main.py`).

## Decisions and why

**Mock auth via explicit `user_id`, not sessions/JWTs.** The assignment
explicitly allows this ("You may simulate users with seeded accounts, mocked
auth"). Building real auth would have eaten hours better spent on the actual
editing experience, which is what's graded. The tradeoff: any client can
claim to be any user by passing a different `user_id` — fine for a take-home
demo, not fine for production.

**SQLite, not Postgres.** Zero setup, ships as a single file, and the data
model (3 tables, no complex queries) doesn't need more. The real cost shows
up in deployment: Render's free tier has no persistent disk, so the SQLite
file resets when the service spins down from inactivity. A production
version would use Postgres (Render's free Postgres tier would have solved
this too) — deferred because it adds a second service to configure and
wasn't worth the setup time for a demo that's mainly evaluated live.

**Tiptap over a from-scratch contentEditable.** Tiptap (ProseMirror) handles
the hard parts of rich-text editing — schema-consistent documents, undo/redo,
mark toggling — that would otherwise be its own multi-day project. Cost:
inheriting ProseMirror's model means content lives as HTML strings in the
DB, and syncing that model with React state has real footguns (see below).

**Debounced autosave (600ms), not save-on-blur or manual save.** Matches
what Google Docs actually feels like, and means a browser refresh never
loses more than ~600ms of typing. Cost: every keystroke schedules a timer,
so rapid edits mean the save status flickers between "Saving…" and "Saved"
more than a longer debounce would — acceptable for a doc-sized editor.

**Sharing is binary (view+edit), not role-based.** The schema (`Share` as a
plain join table) only tracks *who* has access, not *what level*. Adding a
`role` column and branching the UI on it was scoped out — see
[SUBMISSION.md](SUBMISSION.md) for what that would take.

## Bugs found and fixed during first real browser testing

The frontend had never been opened in an actual browser before this pass —
only `vite build` and backend curl tests. Driving it end-to-end (create,
format, upload, share, switch users, refresh) surfaced four real issues,
all now fixed:

1. **Content-sync feedback loop corrupting typed text.** `Editor.jsx`
   re-ran `editor.commands.setContent()` whenever the `content` prop
   changed — which happened on *every keystroke*, because typing updates
   parent state, which flows back down as a new `content` prop. Under any
   latency this reset the ProseMirror document mid-keystroke, silently
   dropping characters (spaces were hit hardest and dropped 100% of the
   time at any typing speed). Fixed by remounting the editor per-document
   (`key={activeDoc.id}` in `App.jsx`) instead of diffing content at
   runtime — the standard Tiptap+React pattern.
2. **Leftover Vite template CSS.** `index.css` still had the default
   template's `#root { text-align: center; width: 1126px; ... }`, so all
   editor text was centered and the app didn't fill the viewport. Replaced
   with a minimal reset.
3. **Delete was wired in the API client but never exposed in the UI.**
   `api.deleteDocument()` existed and the backend endpoint worked, but
   there was no delete button anywhere. Added, with a confirmation modal.
4. **Spurious autosave on opening a document.** Tiptap fires `onUpdate`
   once immediately after mount, before any user action — so merely
   opening or switching documents triggered an unnecessary save (and, if
   the debounce hadn't fired yet, deleting a document right after opening
   it could surface a confusing "Document not found" error from the
   in-flight stale save). Fixed by comparing emitted HTML against the
   editor's initial content and skipping the no-op, and by cancelling any
   pending save timer when a document is deleted.

## What I'd do with more time

See [SUBMISSION.md](SUBMISSION.md) for the full list — the short version is
Postgres instead of SQLite for deploy durability, granular share roles
(view vs. edit), and either version history or real-time collaboration
indicators (the two stretch goals the assignment itself flags as the most
tractable given the existing schema).
