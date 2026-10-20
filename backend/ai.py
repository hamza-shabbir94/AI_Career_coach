"""One shared OpenAI client for the whole app."""
import os

from openai import OpenAI

client = OpenAI()  # reads OPENAI_API_KEY from the environment
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# The model that JUDGES the CV reviews (LLM-as-a-judge). Falls back to MODEL.
# A different, stronger model is better: models tend to rate their own writing too high.
JUDGE_MODEL = os.getenv("JUDGE_MODEL", MODEL)
