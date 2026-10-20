"""Helpers for AI calls that use the web_search tool (Company prep, Job search)."""
from urllib.parse import urlsplit

from models import Source


def collect_sources(response, max_sources: int = 8) -> list[Source]:
    """Find the web pages the AI cited (url_citation annotations), without duplicates."""
    sources: list[Source] = []
    seen_urls = set()
    for item in response.output:            # the response is a list of items
        if item.type != "message":          # skip the web_search_call items
            continue
        for part in item.content:           # each message has text parts
            for note in getattr(part, "annotations", None) or []:
                if note.type == "url_citation" and note.url not in seen_urls:
                    seen_urls.add(note.url)
                    sources.append(Source(title=note.title or note.url, url=note.url))
                    if len(sources) >= max_sources:
                        return sources
    return sources


def same_page(url: str) -> str:
    """
    A simple version of a URL to compare links: no "https://", no "www.",
    no "?utm_source=..." part and no "/" at the end.
    "https://www.jobs.com/123/?utm_source=openai" -> "jobs.com/123"
    """
    parts = urlsplit(url.strip())
    host = parts.netloc.lower().removeprefix("www.")
    return f"{host}{parts.path.rstrip('/')}"
