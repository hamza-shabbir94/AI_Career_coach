"""
Bonus: Job search & discovery (with WEB SEARCH)

Same idea as Company prep, two AI calls:
  1. responses.create + the web_search tool -> notes about real, current job ads + cited pages
  2. responses.parse -> turns the notes into structured job cards
Then Python checks every job link: is it one of the pages the web search really cited?
An AI can write links that look real but do not exist, so we never trust them blindly.
"""
from fastapi import APIRouter

from ai import MODEL, client
from models import JobListing, JobSearchAnalysis, JobSearchRequest, JobSearchResult
from prompts import job_list_prompt, job_search_prompt
from web_search import collect_sources, same_page

router = APIRouter(prefix="/jobs", tags=["Job Search"])

MAX_JOBS = 10
MAX_SOURCES = 20  # job searches cite many pages, so keep more than Company prep


def about_me_block(about_me: str) -> str:
    """The optional candidate info, inside <about_me> tags (empty string if none)."""
    if not about_me:
        return ""
    return f"\n\nAbout the candidate:\n<about_me>\n{about_me}\n</about_me>"


@router.post("/search", response_model=JobSearchResult)
def search_jobs(req: JobSearchRequest):
    about_me = about_me_block(req.about_me)

    # Call 1: search the web (this is the slow part, 20-40 seconds)
    research = client.responses.create(
        model=MODEL,
        tools=[{"type": "web_search"}],
        instructions=job_search_prompt(req.job_role, req.location, req.work_type, req.level),
        input=f"Find current job ads for: {req.job_role}{about_me}",
    )
    sources = collect_sources(research, MAX_SOURCES)

    # Call 2: notes -> structured job cards. Web text goes inside tags.
    response = client.responses.parse(
        model=MODEL,
        instructions=job_list_prompt(req.job_role),
        input=f"<research_notes>\n{research.output_text}\n</research_notes>{about_me}",
        text_format=JobSearchAnalysis,
    )
    analysis = response.output_parsed

    # Python checks the links: a job is "verified" only if its link is a page
    # the web search really cited (ignoring small differences like "?utm_source=...")
    cited_pages = {same_page(s.url) for s in sources}
    jobs = [
        JobListing(**job.model_dump(), verified=bool(job.url) and same_page(job.url) in cited_pages)
        for job in analysis.jobs[:MAX_JOBS]
    ]

    # Verified jobs first (sorted() keeps the AI's "best fit first" order inside each group)
    jobs = sorted(jobs, key=lambda job: not job.verified)

    return JobSearchResult(jobs=jobs, search_tips=analysis.search_tips, sources=sources)
