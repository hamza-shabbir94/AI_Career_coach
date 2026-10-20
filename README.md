# AI-Powered Career Coach

An AI app that helps you practise job interviews and improve your CV for a specific role.
Ironhack AI Engineer Bootcamp project.

**Stack:** FastAPI (Python backend) · React + Vite (frontend) · OpenAI Responses API · Vercel

---

## Features

| # | Feature | Status |
|---|---------|--------|
| 1 | Mock Interview Mode | ✅ Done |
| 2 | CV Reviewer Mode | ✅ Done |
| 3 | One app with both features + deployment (Vercel) | ✅ Built · ⏳ deploy |
| ⭐ | Bonus: job search, job-fit score, learning roadmap, company prep, LLM-as-a-judge | 💡 Next |

### 1. Mock Interview Mode
1. **Setup** – enter the role (e.g. "Junior AI Engineer") and optionally paste a job description.
2. **Interview** – the AI asks 5 questions, one at a time, with follow-ups based on your answers.
3. **Feedback** – score out of 10, strengths, weaknesses and tips to improve.

### 2. CV Reviewer Mode
1. Enter the role (and optionally the job description).
2. **Upload** your CV (PDF, DOCX, TXT – max 4 MB) **or paste** it as text.
3. Get: overall fit score, scores for content / clarity / formatting, spelling & grammar errors
   with fixes, matching and missing skills, top improvements, and before/after rewrites of weak lines.

---

## Project structure

```
career-coach/
├── README.md
├── .gitignore                ← keeps .env and node_modules out of git
├── backend/
│   ├── main.py               ← creates the app, CORS, plugs in the routes
│   ├── ai.py                 ← one shared OpenAI client + model name
│   ├── models.py             ← Pydantic models (shape of all data)
│   ├── prompts.py            ← all AI prompts
│   ├── cv_reader.py          ← turns PDF / DOCX / TXT into plain text
│   ├── routes/
│   │   ├── interview.py      ← /interview/next, /interview/feedback
│   │   └── cv.py             ← /cv/review
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html            ← the one HTML page
    ├── package.json
    ├── vite.config.js
    ├── .env.example
    └── src/
        ├── main.jsx          ← starts React
        ├── App.jsx           ← page layout: nav, hero, steps, tabs, footer
        ├── Hero.jsx          ← big headline + animated demo
        ├── ScoreRing.jsx     ← round score gauge (used by both features)
        ├── InterviewMode.jsx ← feature 1 screen
        ├── CVReviewer.jsx    ← feature 2 screen (with drag & drop upload)
        ├── api.js            ← all calls to the backend
        └── styles.css        ← all styles; colours and fonts are at the top
```

**Backend:** a request comes into `main.py` → goes to a file in `routes/` → which uses
`prompts.py` + `models.py` + `ai.py` to call OpenAI.

**Frontend:** `index.html` → `main.jsx` → `App.jsx` (shows `Hero.jsx` + tabs)
→ `InterviewMode.jsx` or `CVReviewer.jsx` → both use `api.js` to talk to the backend.

## Design

The look comes from the tools of editing a CV: **navy ink** `#14213d`, a **yellow highlighter**
`#ffd84d`, a **red correction pen** `#d93a3f` and white paper. Fonts: **Bricolage Grotesque**
(headings) and **Public Sans** (text). To change colours or fonts, edit the variables at the top
of `styles.css`, and every screen updates.

---

## API endpoints

| Method | Path | Sends | Returns |
|--------|------|-------|---------|
| GET | `/` | – | `{"status": "ok"}` |
| POST | `/interview/next` | JSON: `job_role`, `job_description`, `summary`, `last_question`, `last_answer`, `answers_given` | `reply`, `summary`, `question_number`, `max_questions`, `finished` |
| POST | `/interview/feedback` | JSON: `job_role`, `summary` | `score`, `summary`, `strengths`, `weaknesses`, `improvements` |
| POST | `/cv/review` | **Form**: `job_role`, `job_description`, and `file` **or** `cv_text` | `overall_score`, `summary`, `content`, `clarity`, `formatting`, `errors`, `matching_skills`, `missing_skills`, `improvements`, `rewrites` |

Try every endpoint at **http://localhost:8000/docs**.

---

## Key concepts used

**Summary memory** – the AI has no memory between calls. Instead of the whole chat we send a
short summary plus the last Q&A; the AI returns the next question *and* an updated summary.
Trade-off: constant, low token use, but the AI sees notes, not exact words.

**Structured output** – `client.responses.parse(..., text_format=CVReview)` forces the AI to
return JSON in the exact shape of a Pydantic model. Nested models (e.g. `SectionFeedback`
inside `CVReview`) work too.

**File upload (multipart/form-data)** – a file can't go inside JSON, so the CV is sent as a
form. React builds a `FormData`; FastAPI reads it with `Form(...)` and `File(...)`.

**Text extraction** – the AI reads text, not files. `pypdf` reads PDFs and `python-docx` reads
Word files. Scanned PDFs are images with no text, so the user must paste the text instead.

**Input limits** – max 4 MB per file and 20,000 characters of CV text sent to the AI. This keeps
costs predictable and stays under Vercel's request size limit.

**Routers** – `APIRouter` lets each feature live in its own file; `main.py` just plugs them in.

**CORS** – controls which websites may call the backend. `*` locally; your frontend URL in production.

**Environment variables** – secrets (API key) and settings live in `.env`, never in the code or git.

---

## Run it locally

You need **conda** (or Python 3.10+), **Node.js 18+** and an **OpenAI API key**.

### 1. Backend

```bash
conda create -n career-coach python=3.11 -y   # only once
conda activate career-coach
cd backend
python -m pip install -r requirements.txt
cp .env.example .env              # paste your OPENAI_API_KEY into .env
python -m uvicorn main:app --reload
```

Backend: http://localhost:8000 · test it at http://localhost:8000/docs

> Always use `python -m pip` and `python -m uvicorn`, so they run from the active conda env.

### 2. Frontend (new terminal)

```bash
cd frontend
npm install
cp .env.example .env              # VITE_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:5173

---

## Deploy to Vercel

Two Vercel projects from **one** GitHub repo: one for the backend, one for the frontend.

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "AI Career Coach: mock interview + CV reviewer"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```
Check that `.env` is **not** on GitHub (`.gitignore` handles this).

### 2. Backend project
1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory:** `backend` (Vercel finds `main.py` and the FastAPI `app` automatically).
3. **Environment Variables:** `OPENAI_API_KEY` = your key (optionally `OPENAI_MODEL`).
4. Deploy, then open `https://<backend>.vercel.app/` → should show `{"status":"ok"}`.

### 3. Frontend project
1. Vercel → **Add New → Project** → import the **same** repo again.
2. **Root Directory:** `frontend` · Framework: **Vite** (detected automatically).
3. **Environment Variables:** `VITE_API_URL` = your backend URL (no `/` at the end).
4. Deploy and open the frontend URL.

### 4. Lock down CORS (recommended)
In the **backend** project, add `ALLOWED_ORIGINS` = your frontend URL
(e.g. `https://career-coach.vercel.app`), then **Redeploy**.

> Changed an environment variable? You must **Redeploy** – Vercel reads them at build/start time.
> `VITE_` variables are baked into the frontend when it is built.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError: No module named 'fastapi'` | Activate the env, then use `python -m pip install ...` and `python -m uvicorn ...`. |
| "Server error (500)" | Check the backend logs. Usually a missing/wrong `OPENAI_API_KEY`. |
| "Failed to fetch" | Backend not running, or `VITE_API_URL` is wrong. |
| "Not enough text found" on a PDF | It's a scanned image. Use **Paste text** instead. |
| Works locally, CORS error on Vercel | `ALLOWED_ORIGINS` must exactly match the frontend URL (https, no `/` at the end). |
| Changed `.env` / Vercel env var, nothing happened | Restart locally, or Redeploy on Vercel. |

---

## Next steps

- [x] Feature 1: Mock Interview Mode
- [x] Feature 2: CV Reviewer Mode
- [x] Feature 3: one app with tabs
- [ ] Deploy to Vercel
- [ ] Bonus features
