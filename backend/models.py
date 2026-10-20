"""
Pydantic models = the SHAPE of the data.
- Request models:  what React sends to us
- Response models: what we send back (and what the AI must return)
"""
from pydantic import BaseModel


# ======================= Feature 1: Mock Interview =======================

class NextRequest(BaseModel):
    """What React sends to /interview/next"""
    job_role: str
    job_description: str = ""   # optional
    summary: str = ""           # the AI's memory (interview notes so far)
    last_question: str = ""     # empty on the very first call
    last_answer: str = ""       # empty on the very first call
    answers_given: int = 0      # how many answers the user has sent


class NextStep(BaseModel):
    """What the AI must return (structured output)"""
    summary: str        # updated interview notes
    next_message: str   # next question (or closing message)


class InterviewReply(BaseModel):
    """What the backend returns to React"""
    reply: str
    summary: str
    question_number: int
    max_questions: int
    finished: bool


class FeedbackRequest(BaseModel):
    job_role: str
    summary: str


class Feedback(BaseModel):
    score: int               # 1 to 10
    summary: str
    strengths: list[str]
    weaknesses: list[str]
    improvements: list[str]


# ======================= Feature 2: CV Reviewer =======================
# (The CV request comes as a FORM with a file, so it has no model here.
#  See routes/cv.py.)

class SectionFeedback(BaseModel):
    score: int            # 1 to 10
    comments: list[str]


class Issue(BaseModel):
    problem: str          # what is wrong
    fix: str              # how to fix it


class Rewrite(BaseModel):
    before: str           # a line from the CV
    after: str            # an improved version


class CVReview(BaseModel):
    overall_score: int            # 1 to 10, fit for THIS role
    summary: str
    content: SectionFeedback      # what is in the CV
    clarity: SectionFeedback      # how easy it is to read
    formatting: SectionFeedback   # structure, sections, consistency
    errors: list[Issue]           # spelling, grammar, inconsistencies
    matching_skills: list[str]    # skills the role wants AND the CV shows
    missing_skills: list[str]     # skills the role wants but the CV lacks
    improvements: list[str]       # top actions, most important first
    rewrites: list[Rewrite]       # example before/after lines
