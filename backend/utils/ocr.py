import pytesseract
from PIL import Image
import PyPDF2
from pdf2image import convert_from_path
import io
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

def extract_text_from_image(image_path: Path) -> str:
    """Extract text from an image using OCR"""
    try:
        logger.info(f"Extracting text from image: {image_path}")
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        logger.info(f"Extracted {len(text)} characters from image")
        return text.strip()
    except Exception as e:
        logger.error(f"Failed to extract text from image: {str(e)}")
        return ""

def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract text from a PDF file"""
    try:
        logger.info(f"Extracting text from PDF: {pdf_path}")
        text = ""
        
        # First, try to extract text directly (for text-based PDFs)
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            
            if text.strip():
                logger.info(f"Extracted {len(text)} characters directly from PDF")
                return text.strip()
        except Exception as e:
            logger.warning(f"Direct PDF text extraction failed: {str(e)}")
        
        # If direct extraction failed or returned empty, use OCR
        logger.info("Using OCR for PDF...")
        try:
            images = convert_from_path(pdf_path)
            for i, image in enumerate(images):
                logger.info(f"Processing page {i+1}/{len(images)}")
                page_text = pytesseract.image_to_string(image)
                text += page_text + "\n"
            
            logger.info(f"Extracted {len(text)} characters from PDF using OCR")
            return text.strip()
        except Exception as e:
            logger.error(f"OCR extraction from PDF failed: {str(e)}")
            return ""
            
    except Exception as e:
        logger.error(f"Failed to extract text from PDF: {str(e)}")
        return ""

def extract_text_from_file(file_path: Path, mime_type: Optional[str] = None) -> str:
    """Extract text from a file based on its type"""
    try:
        file_extension = file_path.suffix.lower()
        
        # Image files
        if file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'] or \
           (mime_type and mime_type.startswith('image/')):
            return extract_text_from_image(file_path)
        
        # PDF files
        elif file_extension == '.pdf' or mime_type == 'application/pdf':
            return extract_text_from_pdf(file_path)
        
        # Plain text files
        elif file_extension == '.txt' or mime_type == 'text/plain':
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        
        # Unsupported file type
        else:
            logger.warning(f"Unsupported file type for OCR: {file_extension} / {mime_type}")
            return ""
            
    except Exception as e:
        logger.error(f"Failed to extract text from file: {str(e)}")
        return ""