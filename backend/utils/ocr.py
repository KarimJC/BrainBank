import io
from PIL import Image
import pytesseract
import fitz  # PyMuPDF


def extract_text_from_image(data: bytes) -> str:
    img = Image.open(io.BytesIO(data))
    return pytesseract.image_to_string(img)


def extract_text_from_pdf(data: bytes) -> str:
    text = ""
    doc = fitz.open(stream=data, filetype="pdf")
    for page in doc:
        page_text = page.get_text()
        if page_text.strip():
            text += page_text
        else:
            pix = page.get_pixmap(dpi=300)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            text += pytesseract.image_to_string(img)
    doc.close()
    return text


def extract_text(data: bytes, mime_type: str) -> str:
    if not data:
        return ""
    if mime_type == "application/pdf":
        return extract_text_from_pdf(data)
    if mime_type and mime_type.startswith("image/"):
        return extract_text_from_image(data)
    return ""