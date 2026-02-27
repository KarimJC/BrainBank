from fpdf import FPDF
import re
import logging

logger = logging.getLogger(__name__)

DOC_TYPE_TITLES = {
    "study_guide": "Study Guide",
    "practice_exam": "Practice Exam",
    "summary": "Course Summary"
}


class PDFService:
    def markdown_to_pdf(self, markdown_text: str, doc_type: str) -> bytes:
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        pdf.set_margins(20, 20, 20)

        # Title
        title = DOC_TYPE_TITLES.get(doc_type, "Document")
        pdf.set_font("Helvetica", style="B", size=20)
        pdf.cell(0, 12, title, new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(4)

        # Divider line
        pdf.set_draw_color(180, 180, 180)
        pdf.line(20, pdf.get_y(), 190, pdf.get_y())
        pdf.ln(6)

        # Strip AI preamble (first line if it starts with "Here is" or "Based on")
        lines = markdown_text.split("\n")
        while lines and re.match(r"^(Here is|Based on|The following|Below is)", lines[0].strip(), re.IGNORECASE):
            lines.pop(0)

        for line in lines:
            stripped = line.strip()

            if not stripped:
                pdf.ln(3)
                continue

            # Horizontal rule (--- or ***)
            if re.match(r"^[-\*]{3,}$", stripped):
                pdf.set_draw_color(200, 200, 200)
                pdf.ln(2)
                pdf.line(20, pdf.get_y(), 190, pdf.get_y())
                pdf.ln(4)
                continue

            # H1
            if stripped.startswith("# ") and not stripped.startswith("##"):
                text = self._clean_text(stripped[2:].strip())
                pdf.set_font("Helvetica", style="B", size=16)
                pdf.ln(2)
                pdf.multi_cell(0, 9, text)
                pdf.ln(1)

            # H2
            elif stripped.startswith("## ") and not stripped.startswith("###"):
                text = self._clean_text(stripped[3:].strip())
                pdf.set_font("Helvetica", style="B", size=13)
                pdf.ln(1)
                pdf.multi_cell(0, 8, text)

            # H3
            elif stripped.startswith("### ") and not stripped.startswith("####"):
                text = self._clean_text(stripped[4:].strip())
                pdf.set_font("Helvetica", style="BI", size=11)
                pdf.multi_cell(0, 7, text)

            # H4 (#### or more)
            elif re.match(r"^#{4,}\s", stripped):
                text = re.sub(r"^#{4,}\s", "", stripped)
                text = self._clean_text(text)
                pdf.set_font("Helvetica", style="B", size=10)
                pdf.ln(1)
                pdf.multi_cell(0, 6, text)

            # Nested bullet (starts with spaces/tabs then - or *)
            elif re.match(r"^\s{2,}[-\*]\s", line):
                text = re.sub(r"^\s+[-\*]\s", "", line)
                text = self._clean_text(text)
                pdf.set_font("Helvetica", size=10)
                pdf.set_x(35)
                pdf.multi_cell(0, 6, f"  -  {text}")

            # Bullet point
            elif stripped.startswith("- ") or stripped.startswith("* "):
                text = stripped[2:].strip()
                text = self._clean_text(text)
                pdf.set_font("Helvetica", size=10)
                pdf.set_x(25)
                pdf.multi_cell(0, 6, f"-  {text}")

            # Numbered list
            elif re.match(r"^\d+\.\s", stripped):
                text = re.sub(r"^\d+\.\s", "", stripped)
                text = self._clean_text(text)
                pdf.set_font("Helvetica", size=10)
                pdf.set_x(25)
                pdf.multi_cell(0, 6, text)

            # Bold-only line
            elif stripped.startswith("**") and stripped.endswith("**") and stripped.count("**") == 2:
                text = stripped[2:-2].strip()
                text = self._clean_text(text)
                pdf.set_font("Helvetica", style="B", size=10)
                pdf.multi_cell(0, 6, text)

            # Roman numeral section heading 
            elif re.match(r"^[IVX]+\.\s", stripped):
                text = self._clean_text(stripped)
                pdf.set_font("Helvetica", style="B", size=14)
                pdf.ln(3)
                pdf.multi_cell(0, 8, text)
                pdf.ln(1)

            # Letter section heading
            elif re.match(r"^[A-Z]\.\s", stripped):
                text = self._clean_text(stripped)
                pdf.set_font("Helvetica", style="B", size=11)
                pdf.ln(2)
                pdf.multi_cell(0, 7, text)

            # Regular paragraph
            else:
                text = self._clean_text(stripped)
                pdf.set_font("Helvetica", size=10)
                pdf.multi_cell(0, 6, text)

        return bytes(pdf.output())

    def _clean_text(self, text: str) -> str:
        """Remove markdown and LaTeX that fpdf can't render"""
        # Strip bold/italic
        text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
        text = re.sub(r"\*(.+?)\*", r"\1", text)
        text = re.sub(r"`(.+?)`", r"\1", text)

        # Convert LaTeX math to readable text
        # Fractions:
        text = re.sub(r"\\frac\{(.+?)\}\{(.+?)\}", r"\1/\2", text)
        # Subscripts: 
        text = re.sub(r"_\{(.+?)\}", r"(\1)", text)
        text = re.sub(r"_(\w)", r"\1", text)
        # Superscripts: 
        text = re.sub(r"\^\{(.+?)\}", r"^\1", text)
        # Greek letters
        text = text.replace(r"\mu", "mu").replace(r"\sigma", "sigma")
        text = text.replace(r"\alpha", "alpha").replace(r"\beta", "beta")
        text = text.replace(r"\lambda", "lambda").replace(r"\theta", "theta")
        text = text.replace(r"\hat", "").replace(r"\bar", "")
        text = text.replace(r"\pm", "+/-").replace(r"\times", "x")
        text = text.replace(r"\dots", "...").replace(r"\cdot", "*")
        text = text.replace(r"\sqrt", "sqrt").replace(r"\le", "<=").replace(r"\ge", ">=")
        # Remove any other weird LaTeX commands
        text = text.replace("$", "")
        text = re.sub(r"\\[a-zA-Z]+", "", text)  
        text = text.replace("\\", "")

        return text.strip()


pdf_service = PDFService()