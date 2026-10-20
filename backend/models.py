"""
Pydantic models = the SHAPE of the data.
- Request models:  what React sends to us
- Response models: what we send back (and what the AI must return)
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# ======================= Feature 1: Mock Interview =======================

class NextRequest(BaseModel):
    """What React sends to /interview/next"""
    job_role: str
    job_description: str = ""   # optional
    summary: str = ""           # the AI's memory (interview notes so far)
    last_question: str = ""     # empty on the very first call
    last_answer: str = ""       # empty on the very first call
    answers_given: int = 0      # how many answers the user has sent
    # Optional: practise for a specific company (filled in from Company prep)
    company: str = Field("", max_length=100)
    company_notes: str = Field("", max_length=6000)  # overview, culture, likely questions


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
    company: str = Field("", max_length=100)          # optional, see NextRequest
    company_notes: str = Field("", max_length=6000)   # lets feedback check company facts


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


# ---------- LLM-as-a-Judge: a second AI checks the CV review ----------

CriterionName = Literal["factual_accuracy", "relevance", "actionability", "completeness"]


class CriterionScore(BaseModel):
    criterion: CriterionName
    score: int                    # 1 to 5 (checked in judge.py)
    justification: str            # why this score, with quotes from the CV
    issues: list[str]             # specific problems found (empty if none)


class JudgeResult(BaseModel):
    """What the JUDGE AI must return"""
    criteria: list[CriterionScore]


class Evaluation(BaseModel):
    """What we return: the judge's scores + numbers calculated in Python"""
    criteria: list[CriterionScore]
    overall_score: float          # average of the 4 scores, one decimal
    passed: bool                  # True only if every criterion is 3 or more


class CVReviewResult(CVReview):
    """
    What /cv/review sends to React: all CVReview fields + the optional evaluation.
    (class B(A) = "inheritance": B gets every field of A and adds its own.)
    We do NOT give this model to the reviewer AI, otherwise it would have to
    invent an evaluation of itself.
    """
    evaluation: Evaluation | None = None


# ======================= Bonus: Job-fit score =======================
# (The request is a FORM, like the CV Reviewer, because it can carry a file.)

class Requirement(BaseModel):
    requirement: str                                  # e.g. "3+ years of Python"
    importance: Literal["must-have", "nice-to-have"]  # Literal = only these values allowed
    status: Literal["met", "partial", "missing"]
    evidence: str                                     # what in the CV shows it (or not)
    how_to_close: str                                 # one action to close the gap


class JobFitAnalysis(BaseModel):
    """What the AI must return. Note: NO percentage, Python calculates that."""
    summary: str
    requirements: list[Requirement]
    keywords_to_add: list[str]    # words from the job ad missing in the CV
    quick_wins: list[str]         # small CV changes to make today


class JobFitResult(BaseModel):
    """What the backend returns to React: the AI analysis + our own score."""
    analysis: JobFitAnalysis
    match_percent: int            # 0 to 100, calculated in Python
    verdict: str                  # "Strong match", "Partial match" or "Weak match"


# ======================= Bonus: Company prep =======================

class CompanyPrepRequest(BaseModel):
    """What React sends to /company/prep (JSON)"""
    # Remove spaces at the start/end before checking the lengths below
    model_config = ConfigDict(str_strip_whitespace=True)

    company: str = Field(min_length=1, max_length=100)
    job_role: str = Field(min_length=1, max_length=100)
    job_description: str = Field("", max_length=20_000)  # optional


class LikelyQuestion(BaseModel):
    question: str
    why_they_ask: str
    how_to_answer: str


class CompanyPrepAnalysis(BaseModel):
    """What the AI must return (call 2)"""
    overview: str
    recent_news: list[str]
    culture: list[str]
    likely_questions: list[LikelyQuestion]   # 6 items
    questions_to_ask: list[str]
    tips: list[str]


class Source(BaseModel):
    title: str
    url: str


class CompanyPrepResult(BaseModel):
    """What the backend returns to React: the prep sheet + the web pages it is based on"""
    analysis: CompanyPrepAnalysis
    sources: list[Source]


# ======================= Bonus: Learning roadmap =======================

class RoadmapRequest(BaseModel):
    """What React sends to /roadmap (JSON)"""
    model_config = ConfigDict(str_strip_whitespace=True)

    job_role: str = Field(min_length=1, max_length=100)
    level: Literal["beginner", "some experience", "experienced"]
    hours_per_week: int = Field(ge=2, le=40)     # ge = "greater or equal", le = "less or equal"
    weeks: Literal[4, 8, 12]
    gaps: list[str] = []                          # optional: skills to learn
    context: str = Field("", max_length=5000)     # optional: e.g. CV review summary


class RoadmapTask(BaseModel):
    title: str
    type: Literal["learn", "build", "practise"]
    hours: int


class RoadmapWeek(BaseModel):
    week_number: int
    focus: str                    # the theme of the week
    tasks: list[RoadmapTask]
    milestone: str                # what you can do/show at the end of the week


class PortfolioProject(BaseModel):
    title: str
    description: str


class Resource(BaseModel):
    name: str                     # e.g. "Official Python tutorial" (no URL on purpose)
    why: str


class Roadmap(BaseModel):
    """What the AI must return"""
    summary: str
    weeks: list[RoadmapWeek]
    portfolio_project: PortfolioProject
    resources: list[Resource]


class RoadmapResult(BaseModel):
    """What the backend returns to React: the plan + our own checks"""
    roadmap: Roadmap
    total_hours: int              # calculated in Python
    warnings: list[str]           # problems Python found in the AI's plan
