"""
Feature 2: CV Reviewer Mode

The user can EITHER upload a file (PDF/DOCX/TXT) OR paste the CV as text.
Because a file is involved, React sends a FORM (multipart/form-data), not JSON.
Optional: a second AI checks the quality of the review (LLM-as-a-judge, see judge.py).
"""
from fastapi import APIRouter, File, Form, UploadFile

from ai import MODEL, client
from cv_reader import get_cv_text
from judge import judge_cv_review
from models import CVReview, CVReviewResult
from prompts import cv_review_prompt

router = APIRouter(prefix="/cv", tags=["CV Reviewer"])


def run_cv_review(cv: str, job_role: str, job_description: str) -> CVReview:
    """Ask the AI for a structured review. Also used by evals/run_judge.py."""
    response = client.responses.parse(
        model=MODEL,
        instructions=cv_review_prompt(job_role, job_description),
        input=f"<cv>\n{cv}\n</cv>",   # the CV goes inside <cv> tags
        text_format=CVReview,         # the AI fills in CVReview (no evaluation field)
    )
    return response.output_parsed


@router.post("/review", response_model=CVReviewResult)
def review_cv(
    job_role: str = Form(...),
    job_description: str = Form(""),
    cv_text: str = Form(""),
    file: UploadFile | None = File(None),
    evaluate: bool = Form(False),     # "true" from the checkbox = run the judge too
):
    # 1. Get the CV text (file or pasted text). Errors become a 400 with a clear message.
    cv = get_cv_text(file, cv_text)

    # 2. The review
    review = run_cv_review(cv, job_role, job_description)

    # 3. Optional: a second AI judges the review (makes the request about twice as slow)
    evaluation = judge_cv_review(cv, job_role, job_description, review) if evaluate else None

    # CVReviewResult = all review fields + evaluation (None if not asked for)
    return CVReviewResult(**review.model_dump(), evaluation=evaluation)
