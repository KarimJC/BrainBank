"""Tests for core/pdf_service.py — PDFService._clean_text and markdown_to_pdf."""
import pytest
from core.pdf_service import PDFService, pdf_service


class TestCleanText:
    def setup_method(self):
        self.svc = PDFService()

    def test_strips_bold_markdown(self):
        result = self.svc._clean_text("**hello world**")
        assert result == "hello world"

    def test_strips_italic_markdown(self):
        result = self.svc._clean_text("*hello*")
        assert result == "hello"

    def test_strips_backtick(self):
        result = self.svc._clean_text("`code`")
        assert result == "code"

    def test_latex_frac(self):
        result = self.svc._clean_text(r"\frac{a}{b}")
        assert "a/b" in result

    def test_latex_subscript_braces(self):
        result = self.svc._clean_text(r"x_{n}")
        assert "(n)" in result

    def test_latex_superscript(self):
        result = self.svc._clean_text(r"x^{2}")
        assert "^2" in result

    def test_greek_mu(self):
        result = self.svc._clean_text(r"\mu")
        assert "mu" in result

    def test_greek_sigma(self):
        result = self.svc._clean_text(r"\sigma")
        assert "sigma" in result

    def test_removes_dollar_sign(self):
        result = self.svc._clean_text("$x + y$")
        assert "$" not in result

    def test_unicode_ge_replacement(self):
        result = self.svc._clean_text("x ≥ 0")
        assert ">=" in result

    def test_unicode_le_replacement(self):
        result = self.svc._clean_text("x ≤ 0")
        assert "<=" in result

    def test_unicode_arrow(self):
        result = self.svc._clean_text("a → b")
        assert "->" in result

    def test_unicode_em_dash(self):
        result = self.svc._clean_text("x — y")
        assert "--" in result

    def test_plain_text_unchanged(self):
        result = self.svc._clean_text("Hello world")
        assert result == "Hello world"

    def test_empty_string(self):
        result = self.svc._clean_text("")
        assert result == ""


class TestMarkdownToPdf:
    def setup_method(self):
        self.svc = PDFService()

    def test_returns_bytes(self):
        result = self.svc.markdown_to_pdf("# Hello\n\nSome content", "study_guide")
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_pdf_header(self):
        """PDF files start with %PDF-"""
        result = self.svc.markdown_to_pdf("content", "study_guide")
        assert result[:4] == b"%PDF"

    def test_practice_exam_type(self):
        result = self.svc.markdown_to_pdf("Question 1: ...", "practice_exam")
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_summary_type(self):
        result = self.svc.markdown_to_pdf("Summary content", "summary")
        assert isinstance(result, bytes)

    def test_strips_ai_preamble(self):
        """Preamble 'Here is...' is stripped — result still valid PDF."""
        result = self.svc.markdown_to_pdf("Here is a study guide\n\n## Topic", "study_guide")
        assert result[:4] == b"%PDF"

    def test_singleton_instance(self):
        assert isinstance(pdf_service, PDFService)
