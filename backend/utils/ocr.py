import io
import re
import unicodedata
from PIL import Image
import pytesseract
import fitz  # PyMuPDF


def _clean_ocr_text(text: str) -> str:
    """Basic OCR post-processing filter to drop nonsense and normalize text.

    Heuristics used:
    - Normalize whitespace and unicode
    - Drop empty or very short lines with no letters
    - Drop lines where letters are a small fraction of characters (likely noise)
    - Drop lines with a very high repetition of a single character
    - Strip common OCR artifacts like long punctuation runs
    """
    if not text:
        return ""

    # Normalize unicode and remove control chars
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"[\r\x0b\x0c\x0e-\x1f]", "", text)

    # Replace multiple spaces/tabs with single space
    text = re.sub(r"\t", " ", text)

    lines = [ln.strip() for ln in text.splitlines()]

    def is_garbage_line(ln: str) -> bool:
        if not ln:
            return True
        # If extremely short and no letters, drop
        if len(ln) < 3 and not any(c.isalpha() for c in ln):
            return True

        total = len(ln)
        letters = sum(1 for c in ln if c.isalpha())
        # If few letters compared to length, likely noise (but allow math lines)
        if total > 0 and letters / total < 0.35:
            # allow lines that look like formulas/numbers (contain = or / or digits)
            if re.search(r"[=\d\/\+\-\*]", ln):
                pass
            else:
                return True

        # If a single char repeats for most of the line, drop (e.g., "-----" or "#####")
        most_common = max((ln.count(ch) for ch in set(ln)), default=0)
        if most_common / total > 0.6:
            return True

        # If line has many non-ascii characters relative to length, drop
        non_ascii = sum(1 for c in ln if ord(c) > 127)
        if total > 0 and non_ascii / total > 0.6:
            return True

        # Otherwise keep
        return False

    kept = [ln for ln in lines if not is_garbage_line(ln)]

    # Post-process kept lines: remove long runs of punctuation and collapse multi-space
    cleaned_lines = []
    for ln in kept:
        # remove long punctuation runs
        ln = re.sub(r"[\-_=\*]{3,}", "", ln)
        # collapse multiple punctuation (e.g., "......")
        ln = re.sub(r"([.?!]){2,}", r"\1", ln)
        ln = re.sub(r"\s+", " ", ln).strip()
        if ln:
            cleaned_lines.append(ln)

    # Join into paragraphs: keep original line breaks but remove runs of blank lines
    out = "\n".join(cleaned_lines)
    return out.strip()


def extract_text_from_image(data: bytes) -> str:
    img = Image.open(io.BytesIO(data))
    raw = pytesseract.image_to_string(img)
    return _clean_ocr_text(raw)


def extract_text_from_pdf(data: bytes) -> str:
    text = ""
    doc = fitz.open(stream=data, filetype="pdf")
    for page in doc:
        page_text = page.get_text()
        if page_text and page_text.strip():
            text += page_text + "\n"
        else:
            # fallback to image-based OCR for scanned pages
            pix = page.get_pixmap(dpi=300)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            text += pytesseract.image_to_string(img) + "\n"
    doc.close()

    return _clean_ocr_text(text)


def extract_text(data: bytes, mime_type: str) -> str:
    if not data:
        return ""
    if mime_type == "application/pdf":
        return extract_text_from_pdf(data)
    if mime_type and mime_type.startswith("image/"):
        return extract_text_from_image(data)
    return ""
