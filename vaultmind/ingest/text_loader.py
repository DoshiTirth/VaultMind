import os


def load_txt(file_path: str) -> list[dict]:
    """
    Reads a .txt file and returns a list of page-like chunks.
    Since txt has no pages, we split by double newlines into sections.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read().strip()

    if not content:
        raise ValueError(f"No text found in: {file_path}")

    # Split into sections by double newlines, treat each as a "page"
    sections = [s.strip() for s in content.split("\n\n") if s.strip()]

    pages = []
    for i, section in enumerate(sections):
        pages.append({
            "page_number": i + 1,
            "text": section,
            "source": os.path.basename(file_path)
        })

    return pages


def load_docx(file_path: str) -> list[dict]:
    """
    Reads a .docx file and returns a list of pages.
    Each paragraph is grouped into page-like chunks of 3 paragraphs.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    from docx import Document

    doc = Document(file_path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

    if not paragraphs:
        raise ValueError(f"No text found in: {file_path}")

    # Group every 3 paragraphs into a "page"
    pages = []
    group_size = 3
    for i in range(0, len(paragraphs), group_size):
        group = paragraphs[i:i + group_size]
        pages.append({
            "page_number": (i // group_size) + 1,
            "text": "\n\n".join(group),
            "source": os.path.basename(file_path)
        })

    return pages