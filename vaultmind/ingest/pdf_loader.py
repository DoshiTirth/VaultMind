import os
from pypdf import PdfReader


def load_pdf(file_path: str) -> list[dict]:
    """
    Reads a PDF and returns a list of pages.
    Each page is a dict with 'page_number' and 'text'.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF not found: {file_path}")

    reader = PdfReader(file_path)
    pages = []

    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():
            pages.append({
                "page_number": i + 1,
                "text": text.strip(),
                "source": os.path.basename(file_path)
            })

    if not pages:
        raise ValueError(f"No extractable text found in: {file_path}")

    return pages