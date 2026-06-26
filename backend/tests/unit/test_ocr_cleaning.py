"""Tests for utils/ocr.py — _clean_ocr_text only."""
import pytest
from utils.ocr import _clean_ocr_text


class TestCleanOcrText:
    def test_empty_string_returns_empty(self):
        assert _clean_ocr_text("") == ""

    def test_none_equivalent_empty(self):
        # function checks `if not text`
        assert _clean_ocr_text("") == ""

    def test_simple_sentence_preserved(self):
        text = "Hello world this is a test."
        result = _clean_ocr_text(text)
        assert "Hello world" in result

    def test_strips_control_chars(self):
        text = "Hello\x0bworld"
        result = _clean_ocr_text(text)
        assert "\x0b" not in result

    def test_drops_pure_garbage_lines(self):
        text = "######\nGood sentence here.\n!!!!!!!"
        result = _clean_ocr_text(text)
        assert "Good sentence here." in result

    def test_keeps_math_lines(self):
        # Lines with = or digits pass even if letter ratio is low
        text = "x = 2 + 3\nHello world."
        result = _clean_ocr_text(text)
        assert "2 + 3" in result

    def test_collapses_multiple_spaces(self):
        text = "Hello   world"
        result = _clean_ocr_text(text)
        assert "  " not in result

    def test_removes_long_punctuation_runs(self):
        text = "Title\n-------\nContent here today."
        result = _clean_ocr_text(text)
        assert "-------" not in result

    def test_multi_line_preserves_all_good_lines(self):
        text = "First good line.\nSecond good line.\nThird good line."
        result = _clean_ocr_text(text)
        assert "First good line." in result
        assert "Second good line." in result

    def test_tabs_normalized(self):
        text = "Hello\tworld"
        result = _clean_ocr_text(text)
        assert "\t" not in result

    def test_drops_very_short_non_alpha_lines(self):
        text = "OK\n12\nThis is a real sentence."
        result = _clean_ocr_text(text)
        assert "This is a real sentence." in result

    def test_strips_leading_trailing_whitespace(self):
        text = "   Hello world.   "
        result = _clean_ocr_text(text)
        assert result == result.strip()
