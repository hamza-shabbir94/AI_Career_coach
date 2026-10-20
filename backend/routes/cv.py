"""
Feature 2: CV Reviewer Mode

The user can EITHER upload a file (PDF/DOCX/TXT) OR paste the CV as text.
Because a file is involved, React sends a FORM (multipart/form-data), not JSON.
"""
from fastapi import APIRouter, File, Form, UploadFile

from ai import MODEL, client
from cv_reader import get_cv_text
from models import CVReview
from prompts import cv_review_prompt

router = APIRouter(prefix="/cv", tags=["CV Reviewer"])


@router.post("/review", response_model=CVReview)
def review_cv(
    job_role: str = Form(...),
    job_description: str = Form(""),
    cv_text: str = Form(""),
    file: UploadFile | None = File(None),
):
    # 1. Get the CV text (file or pasted text). Errors become a 400 with a clear message.
    cv = get_cv_text(file, cv_text)

    # 2. Ask the AI for a structured review. The CV goes inside <cv> tags.
    response = client.responses.parse(
        model=MODEL,
        instructions=cv_review_prompt(job_role, job_description),
        input=f"<cv>\n{cv}\n</cv>",
        text_format=CVReview,
    )
    return response.output_parsed
