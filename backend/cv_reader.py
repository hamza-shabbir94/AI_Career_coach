"""Turn an uploaded CV file (PDF, DOCX or TXT) into plain text."""
from io import BytesIO

from docx import Document
from pypdf import PdfReader

ALLOWED_TYPES = (".pdf", ".docx", ".txt", ".md")


def extract_text(filename: str, data: bytes) -> str:
    name = filename.lower()

    if name.endswith(".pdf"):
        reader = PdfReader(BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if name.endswith(".docx"):
        doc = Document(BytesIO(data))
        lines = [p.text for p in doc.paragraphs]
        # Many CVs use tables for layout, so read those too
        for table in doc.tables:
            for row in table.rows:
                lines.append(" | ".join(cell.text for cell in row.cells))
        return "\n".join(lines)

    if name.endswith((".txt", ".md")):
        return data.decode("utf-8", errors="ignore")

    raise ValueError("Unsupported file type. Please upload a PDF, DOCX or TXT file.")
