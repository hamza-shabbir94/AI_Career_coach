"""
LLM-as-a-Judge: a second AI checks the quality of a CV review.

The judge AI only gives a score (1-5) per criterion, with reasons.
Python then checks the result and calculates overall_score and passed,
so the final numbers are always consistent.
Used by routes/cv.py (checkbox in the app) and evals/run_judge.py (offline test).
"""
from fastapi import HTTPException

from ai import JUDGE_MODEL, client
from models import CVReview, Evaluation, JudgeResult
from prompts import judge_prompt, job_ad_block

# The order we always show the criteria in (same as the rubric in prompts.py)
CRITERIA = ["factual_accuracy", "relevance", "actionability", "completeness"]
PASS_SCORE = 3  # every criterion needs at least this to pass


def judge_cv_review(cv_text: str, job_role: str, job_description: str, review: CVReview) -> Evaluation:
    # 1. Everything the judge reads goes inside tags (see DATA_RULE).
    #    The review is sent as JSON, exactly as the reviewer AI returned it.
    input_text = (
        f"<cv>\n{cv_text}\n</cv>\n"
        f"{job_ad_block(job_description)}\n"
        f"<review>\n{review.model_dump_json(indent=2)}\n</review>"
    )

    # 2. The judge AI scores the review (can be a different model, see ai.py)
    response = client.responses.parse(
        model=JUDGE_MODEL,
        instructions=judge_prompt(job_role),
        input=input_text,
        text_format=JudgeResult,
    )
    result = response.output_parsed

    # 3. Python checks the result: one score per criterion, in rubric order
    by_name = {}
    for item in result.criteria:
        if item.criterion not in by_name:          # keep the first one if repeated
            item.score = max(1, min(item.score, 5))  # keep the score inside 1-5
            by_name[item.criterion] = item

    missing = [name for name in CRITERIA if name not in by_name]
    if missing:
        raise HTTPException(502, "The quality check returned an incomplete result. Please try again.")

    criteria = [by_name[name] for name in CRITERIA]

    # 4. Python calculates the final numbers (not the AI)
    scores = [c.score for c in criteria]
    overall = round(sum(scores) / len(scores), 1)
    passed = all(score >= PASS_SCORE for score in scores)

    return Evaluation(criteria=criteria, overall_score=overall, passed=passed)
