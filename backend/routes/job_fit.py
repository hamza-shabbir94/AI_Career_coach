"""
Bonus: Job-fit score

Compares a CV with a job ad. The AI only LABELS each requirement
(must-have / nice-to-have, met / partial / missing). Python then calculates
the percentage, so the score is consistent and easy to explain.
"""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ai import MODEL, client
from cv_reader import get_cv_text
from models import JobFitAnalysis, JobFitResult
from prompts import job_fit_prompt

router = APIRouter(tags=["Job Fit"])

MIN_JOB_AD_CHARS = 50    # shorter than this is not a real job ad
MAX_JOB_AD_CHARS = 20_000

# How much each requirement counts, and how much credit each status gets
WEIGHTS = {"must-have": 2, "nice-to-have": 1}
CREDIT = {"met": 1.0, "partial": 0.5, "missing": 0.0}


def calculate_match(analysis: JobFitAnalysis) -> int:
    """Weighted score: (points earned / points possible) * 100."""
    possible = sum(WEIGHTS[r.importance] for r in analysis.requirements)
    if possible == 0:
        return 0
    earned = sum(WEIGHTS[r.importance] * CREDIT[r.status] for r in analysis.requirements)
    return round(earned / possible * 100)


def verdict_for(percent: int) -> str:
    if percent >= 75:
        return "Strong match"
    if percent >= 50:
        return "Partial match"
    return "Weak match"


@router.post("/job-fit", response_model=JobFitResult)
def job_fit(
    job_description: str = Form(...),
    job_role: str = Form(""),
    cv_text: str = Form(""),
    file: UploadFile | None = File(None),
):
    # 1. Check the job ad
    job_description = job_description.strip()
    if len(job_description) < MIN_JOB_AD_CHARS:
        raise HTTPException(400, "Paste the full job ad (at least 50 characters).")

    # 2. Get the CV text (shared helper, same rules as the CV Reviewer)
    cv = get_cv_text(file, cv_text)

    # 3. The AI labels each requirement. User text goes inside tags.
    response = client.responses.parse(
        model=MODEL,
        instructions=job_fit_prompt(job_role),
        input=(
            f"<job_ad>\n{job_description[:MAX_JOB_AD_CHARS]}\n</job_ad>\n\n"
            f"<cv>\n{cv}\n</cv>"
        ),
        text_format=JobFitAnalysis,
    )
    analysis = response.output_parsed

    # 4. Python calculates the score from the labels
    percent = calculate_match(analysis)
    return JobFitResult(analysis=analysis, match_percent=percent, verdict=verdict_for(percent))
