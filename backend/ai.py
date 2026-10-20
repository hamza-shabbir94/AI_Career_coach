"""One shared OpenAI client for the whole app."""
import os

from openai import OpenAI

client = OpenAI()  # reads OPENAI_API_KEY from the environment
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
