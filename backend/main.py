import io
import re
from typing import List

import pdfplumber
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from langdetect import DetectorFactory, detect
from pydantic import BaseModel

DetectorFactory.seed = 0  # deterministic results

app = FastAPI(title="AudioBook Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


class Page(BaseModel):
    number: int
    text: str


class ExtractResponse(BaseModel):
    title: str
    language: str
    total_pages: int
    pages: List[Page]


def clean_text(raw: str) -> str:
    """Normalise whitespace and remove garbage characters from extracted PDF text."""
    text = re.sub(r"\s+", " ", raw)
    text = re.sub(r"[^\x20-\x7E\n]", "", text)
    return text.strip()


def infer_title(filename: str, first_page_text: str) -> str:
    """Use the filename (without extension) as the title, falling back to the first line."""
    name = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip()
    if name:
        return name
    first_line = first_page_text.split("\n")[0].strip()
    return first_line[:80] if first_line else "Untitled"


@app.post("/api/extract", response_model=ExtractResponse)
async def extract(file: UploadFile = File(...)) -> ExtractResponse:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    data = await file.read()
    if len(data) > 50 * 1024 * 1024:  # 50 MB limit
        raise HTTPException(status_code=400, detail="File too large (max 50 MB).")

    pages: List[Page] = []

    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for i, raw_page in enumerate(pdf.pages, start=1):
                raw_text = raw_page.extract_text() or ""
                text = clean_text(raw_text)
                if text:
                    pages.append(Page(number=i, text=text))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse PDF: {exc}") from exc

    if not pages:
        raise HTTPException(status_code=422, detail="No readable text found in the PDF.")

    sample = " ".join(p.text for p in pages[:5])[:3000]
    try:
        lang = detect(sample)
    except Exception:
        lang = "unknown"

    if lang != "en":
        raise HTTPException(
            status_code=422,
            detail=f"This application only supports English PDFs. Detected language: '{lang}'.",
        )

    title = infer_title(file.filename or "", pages[0].text)

    return ExtractResponse(
        title=title,
        language=lang,
        total_pages=len(pages),
        pages=pages,
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
