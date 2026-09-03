# Project Handoff — Ajaia Collaborative Docs Assignment

## What this is
Take-home assignment: build a lightweight Google-Docs-style collaborative editor.
Deliverables required: working app, README, architecture note, AI-workflow note,
SUBMISSION.md, live deploy link, walkthrough video, ≥1 automated test.
Time budget: 4-6 hours total. **Protect time for deploy + docs + video — don't let build eat it all.**

## Stack (already decided, do not re-litigate)
- Backend: Python + FastAPI + SQLAlchemy + SQLite (`backend/`)
- Frontend: React + Vite + Tiptap rich-text editor (`frontend/`)
- Mock auth: no real login. A user-switcher dropdown picks one of 3 seeded users
  (Alice/Bob/Carol) and every API call passes `user_id` explicitly.

## Current status (already built and verified working)
**Backend — fully working, 9/9 automated tests passing (`backend/test_main.py`):**
- Models: `User`, `Document`, `Share` (`backend/models.py`)
- Endpoints (`backend/main.py`): list users, list/create/get/update/delete documents,
  share a document by target email, upload `.txt`/`.md` → new document
- Access control: owner or shared user can read/edit; unrelated users get 403
- Validation: blank titles fall back to default, unsupported upload types get 400,
  duplicate shares blocked, non-owners can't share/delete
- Verified end-to-end via curl: create → share → 403 for outsider → upload → persistence

**Frontend — builds clean (`npm run build` succeeds), NOT yet visually verified in a browser:**
- `App.jsx`: user switcher, sidebar doc list (Owned/Shared badges), create/upload buttons,
  title rename, autosave (600ms debounce) with save-status indicator, share modal
- `Editor.jsx`: Tiptap editor with toolbar — bold/italic/underline/H1/H2/paragraph/
  bullet & numbered lists
- `api.js`: thin fetch wrapper for all backend calls
- Styling in `App.css` — functional but not yet polished/reviewed visually

## What's NOT done yet — this is the actual work remaining
1. **Run it locally and visually verify the editor/UI actually works in a real browser.**
   This has never been opened in a browser — only curl-tested on the backend and
   `vite build` on the frontend. Check for bugs, awkward UX, broken states.
2. **Polish pass** — this assignment explicitly grades "product judgment" and
   "editing experience should feel usable and coherent." Current UI is functional
   but plain. Tighten spacing, empty states, loading states, hover feedback,
   mobile-reasonable width, etc. See frontend-design skill for guidance.
3. **Deploy live** — backend to Render or Railway (free tier), frontend to Vercel
   or Netlify. Wire `VITE_API_BASE_URL` to the deployed backend URL. Confirm CORS
   works cross-origin. This is a required deliverable — reviewers must be able to
   test the live URL themselves.
4. **Write the required docs** (all currently missing):
   - `README.md` — local setup/run instructions for both backend and frontend
   - `ARCHITECTURE.md` — what was prioritized and why, tradeoffs made
   - `AI_WORKFLOW.md` — which AI tools used, where AI sped things up, what AI
     output was changed/rejected, how correctness was verified
   - `SUBMISSION.md` — exact list of what's included, what's working, what's
     incomplete, what you'd build next with 2-4 more hours
5. **Record 3-5 min walkthrough video** (Loom/YouTube, unlisted is fine) covering:
   main user flow, what works end-to-end, what was deprioritized, key implementation
   decisions, how AI supported the workflow.
6. **Optional stretch** (only if time remains after everything above): document
   version history, export to Markdown/PDF, or real-time collaboration indicators
   are the most tractable options given the existing schema.

## Known gaps / scope cuts already made (mention these honestly in ARCHITECTURE.md)
- No real authentication — deliberately simulated via seeded users, per assignment's
  explicit allowance ("You may simulate users with seeded accounts, mocked auth...")
- Upload only supports `.txt`/`.md` (not `.docx`) — stated clearly in UI and README
- Sharing is binary access (can view+edit), no granular roles (view-only vs edit)
- No real-time collaboration — out of scope per assignment, listed as optional stretch

## How to run locally
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```
Frontend expects backend at `http://localhost:8000` (see `frontend/.env`).

## How to run backend tests
```bash
cd backend
python -m pytest test_main.py -v
```
