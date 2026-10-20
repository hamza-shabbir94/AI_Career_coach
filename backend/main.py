"""
AI Career Coach - Backend (FastAPI)

This file only:
  1. creates the app
  2. sets up CORS
  3. plugs in the routes (endpoints) from the routes/ folder

Run locally:  python -m uvicorn main:app --reload
Docs:         http://localhost:8000/docs
"""
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()  # read .env BEFORE importing files that use the API key

from routes import company, cv, interview, job_fit, roadmap  # noqa: E402

app = FastAPI(title="AI Career Coach")

# CORS = which websites may call this API
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Plug in the endpoints
app.include_router(interview.router)  # /interview/...
app.include_router(cv.router)         # /cv/...
app.include_router(job_fit.router)    # /job-fit
app.include_router(company.router)    # /company/...
app.include_router(roadmap.router)    # /roadmap


@app.get("/")
def health():
    return {"status": "ok"}
