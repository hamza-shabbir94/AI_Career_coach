"""
Feature 1: Mock Interview Mode (with SUMMARY MEMORY)

We do not send the whole chat. We send a short summary + the last Q&A,
and the AI returns the next question AND an updated summary.
"""
from fastapi import APIRouter

from ai import MODEL, client
from models import Feedback, FeedbackRequest, InterviewReply, NextRequest, NextStep
from prompts import MAX_QUESTIONS, interview_feedback_prompt, interviewer_prompt

# All endpoints in this file start with /interview
router = APIRouter(prefix="/interview", tags=["Mock Interview"])


@router.post("/next", response_model=InterviewReply)
def next_question(req: NextRequest):
    finished = req.answers_given >= MAX_QUESTIONS
    question_number = min(req.answers_given + 1, MAX_QUESTIONS)

    # Build a SMALL input: summary + last Q&A (not the whole chat)
    if req.last_answer:
        input_text = (
            f"Interview notes so far:\n{req.summary or '(no notes yet)'}\n\n"
            f"Last question: {req.last_question}\n"
            f"Candidate's answer: {req.last_answer}"
        )
    else:
        input_text = "The candidate is ready. Start the interview."

    # One AI call returns BOTH the updated summary and the next question
    response = client.responses.parse(
        model=MODEL,
        instructions=interviewer_prompt(req.job_role, req.job_description, question_number, finished),
        input=input_text,
        text_format=NextStep,
    )
    step = response.output_parsed

    return InterviewReply(
        reply=step.next_message,
        summary=step.summary,
        question_number=question_number,
        max_questions=MAX_QUESTIONS,
        finished=finished,
    )


@router.post("/feedback", response_model=Feedback)
def interview_feedback(req: FeedbackRequest):
    response = client.responses.parse(
        model=MODEL,
        instructions=interview_feedback_prompt(req.job_role),
        input=f"Interview notes:\n{req.summary}",
        text_format=Feedback,
    )
    return response.output_parsed
