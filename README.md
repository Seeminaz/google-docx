# Ajaia Docs

A lightweight Google-Docs-style collaborative editor. FastAPI + SQLite backend,
React + Vite + Tiptap frontend. Built for the Ajaia AI-Native Full Stack
Developer Assessment.

**Live demo:** frontend — _TODO: Vercel URL_ · backend — _TODO: Render URL_

See [ARCHITECTURE.md](ARCHITECTURE.md) for design decisions and tradeoffs,
[AI_WORKFLOW.md](AI_WORKFLOW.md) for how AI was used, and
[SUBMISSION.md](SUBMISSION.md) for what's included and what's not.

## Features

- Create, edit, rename, and delete documents with a rich-text editor
  (bold/italic/underline, headings, bullet & numbered lists)
- Autosave with a live "Saved Xs ago" indicator
- Share a document with another seeded user by email (view + edit access)
- Upload a `.txt` or `.md` file to create a new document from it
- Mock user-switcher (no real auth) — 3 seeded users: Alice, Bob, Carol
- Access control: only the owner or someone the doc was shared with can
  open/edit it; everyone else gets a 403

## Stack

- **Backend:** Python, FastAPI, SQLAlchemy, SQLite
- **Frontend:** React, Vite, Tiptap

## Run it locally

Requires Python 3.11+ and Node 18+.

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000` and seeds 3 users (Alice, Bob, Carol)
on first startup. API docs at `http://localhost:8000/docs`.

### Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and expects the backend at the URL
in `frontend/.env` (`VITE_API_BASE_URL`, defaults to `http://localhost:8000`).

### Run the backend tests

```bash
cd backend
python -m pytest test_main.py -v
```

9 tests covering document CRUD, access control (403 for non-owners/non-shared
users), sharing (including duplicate-share and non-owner-share rejection),
and file upload (including unsupported-extension rejection).

## Deploying

- **Backend → Render:** the repo includes `render.yaml`. In Render, New →
  Blueprint → point at this repo. It builds `backend/` with
  `pip install -r requirements.txt` and runs
  `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- **Frontend → Vercel:** set the project's Root Directory to `frontend`,
  and set the `VITE_API_BASE_URL` environment variable to the deployed
  backend's URL.

Note: Render's free tier has no persistent disk, so the SQLite file resets
when the service spins down from inactivity. See ARCHITECTURE.md for why
this tradeoff was accepted.

## Known limitations

- No real authentication — seeded users only, as explicitly permitted by
  the assignment brief
- Upload only supports `.txt` and `.md`, not `.docx`
- Sharing grants full view+edit access; there's no view-only role
- No real-time collaboration (single-user editing per document at a time)
