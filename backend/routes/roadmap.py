"""
Bonus: Learning roadmap

The AI writes a week-by-week learning plan. Then Python CHECKS the plan:
an AI can promise "8 hours a week" and still give you 12 hours of tasks,
so we add up the hours ourselves and warn the user if something does not fit.
"""
from fastapi import APIRouter

from ai import MODEL, client
from models import Roadmap, RoadmapRequest, RoadmapResult
from prompts import roadmap_prompt

router = APIRouter(tags=["Learning Roadmap"])

MAX_GAPS = 12  # keeps the prompt focused (CV review can return many long items)


def clean_gaps(gaps: list[str]) -> list[str]:
    """Remove empty items and duplicates (ignoring upper/lower case), keep at most MAX_GAPS."""
    result = []
    seen = set()
    for gap in gaps:
        gap = gap.strip()
        if gap and gap.lower() not in seen:
            seen.add(gap.lower())
            result.append(gap)
    return result[:MAX_GAPS]


def check_plan(roadmap: Roadmap, hours_per_week: int, weeks: int) -> tuple[int, list[str]]:
    """Add up the hours and collect warnings. Returns (total_hours, warnings)."""
    warnings = []

    # Did the AI make the number of weeks we asked for?
    if len(roadmap.weeks) != weeks:
        warnings.append(f"You asked for {weeks} weeks, but the plan has {len(roadmap.weeks)}.")

    # Does every week fit in the hours the user has?
    total_hours = 0
    for week in roadmap.weeks:
        week_hours = sum(task.hours for task in week.tasks)
        total_hours += week_hours
        if week_hours > hours_per_week:
            warnings.append(
                f"Week {week.week_number} has {week_hours} hours of tasks, "
                f"but you planned {hours_per_week} hours per week."
            )

    return total_hours, warnings


@router.post("/roadmap", response_model=RoadmapResult)
def build_roadmap(req: RoadmapRequest):
    # 1. Put the user text inside tags (see DATA_RULE in prompts.py)
    gaps = clean_gaps(req.gaps)
    gaps_text = "\n".join(gaps) if gaps else "(no gaps given)"
    input_text = f"<gaps>\n{gaps_text}\n</gaps>"
    if req.context:
        input_text += f"\n\n<context>\n{req.context}\n</context>"

    # 2. The AI writes the plan in the shape of the Roadmap model
    response = client.responses.parse(
        model=MODEL,
        instructions=roadmap_prompt(req.job_role, req.level, req.hours_per_week, req.weeks),
        input=input_text,
        text_format=Roadmap,
    )
    roadmap = response.output_parsed

    # 3. Python checks the plan
    total_hours, warnings = check_plan(roadmap, req.hours_per_week, req.weeks)
    return RoadmapResult(roadmap=roadmap, total_hours=total_hours, warnings=warnings)
