"""
Feature 2: CV Reviewer Mode

The user can EITHER upload a file (PDF/DOCX/TXT) OR paste the CV as text.
Because a file is involved, React sends a FORM (multipart/form-data), not JSON.
"""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ai import MODEL, client
from cv_reader import ALLOWED_TYPES, extract_text
from models import CVReview
from prompts import cv_review_prompt

router = APIRouter(prefix="/cv", tags=["CV Reviewer"])

MAX_FILE_SIZE = 4 * 1024 * 1024   # 4 MB (Vercel rejects requests above ~4.5 MB)
MAX_CV_CHARS = 20_000             # enough for a long CV, protects token costs
MIN_CV_CHARS = 100                # less than this is not a real CV


@router.post("/review", response_model=CVReview)
def review_cv(
    job_role: str = Form(...),
    job_description: str = Form(""),
    cv_text: str = Form(""),
    file: UploadFile | None = File(None),
):
    # 1. Get the CV text: from the file if there is one, otherwise from the pasted text
    if file is not None and file.filename:
        if not file.filename.lower().endswith(ALLOWED_TYPES):
            raise HTTPException(400, "Please upload a PDF, DOCX or TXT file.")

        data = file.file.read()
        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(400, "File is too big. The limit is 4 MB.")

        try:
            cv_text = extract_text(file.filename, data)
        except Exception:
            raise HTTPException(400, "Could not read this file. Try another format or paste the text.")

    cv_text = cv_text.strip()

    # 2. Check we really have a CV
    if len(cv_text) < MIN_CV_CHARS:
        raise HTTPException(
            400,
            "Not enough text found. If your PDF is a scanned image, paste the CV as text instead.",
        )

    # 3. Ask the AI for a structured review
    response = client.responses.parse(
        model=MODEL,
        instructions=cv_review_prompt(job_role, job_description),
        input=f"CV:\n{cv_text[:MAX_CV_CHARS]}",
        text_format=CVReview,
    )
    return response.output_parsed
