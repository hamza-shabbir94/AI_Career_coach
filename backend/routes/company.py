"""
Bonus: Company prep (with WEB SEARCH)

Two AI calls:
  1. responses.create + the web_search tool -> free-text research notes + source links
  2. responses.parse -> turns those notes into a structured prep sheet
Why two calls? Searching and structuring are different jobs. Keeping them apart
makes each prompt simple, and the second call can only use what was found.
"""
from fastapi import APIRouter

from ai import MODEL, client
from models import CompanyPrepAnalysis, CompanyPrepRequest, CompanyPrepResult
from prompts import company_prep_prompt, company_research_prompt, job_ad_block
from web_search import collect_sources  # shared with routes/jobs.py

router = APIRouter(prefix="/company", tags=["Company Prep"])

MAX_SOURCES = 8


@router.post("/prep", response_model=CompanyPrepResult)
def company_prep(req: CompanyPrepRequest):
    # The optional job ad, inside <job_ad> tags (empty string if not given)
    job_ad = job_ad_block(req.job_description)

    # Call 1: research on the web (this is the slow part, 20-40 seconds)
    research = client.responses.create(
        model=MODEL,
        tools=[{"type": "web_search"}],
        instructions=company_research_prompt(req.company, req.job_role),
        input=f"Research the company: {req.company}{job_ad}",
    )
    notes = research.output_text
    sources = collect_sources(research, MAX_SOURCES)

    # Call 2: turn the notes into a structured prep sheet. Web text goes inside tags.
    response = client.responses.parse(
        model=MODEL,
        instructions=company_prep_prompt(req.company, req.job_role),
        input=f"<research_notes>\n{notes}\n</research_notes>\n{job_ad}",
        text_format=CompanyPrepAnalysis,
    )
    return CompanyPrepResult(analysis=response.output_parsed, sources=sources)
