"""Tests for db/crud/notes.py — build_attachments and parse_attachments."""

import pytest
from db.crud.notes import build_attachments, parse_attachments


class TestBuildAttachments:
    def test_no_attachments_returns_empty(self):
        result = build_attachments(None, None, None, None)
        assert result == []

    def test_media_url_only(self):
        result = build_attachments("http://example.com/img.png", None, None, None)
        assert len(result) == 1
        assert result[0]["type"] == "image"
        assert result[0]["url"] == "http://example.com/img.png"

    def test_file_url_only(self):
        result = build_attachments(None, "http://example.com/file.pdf", "file.pdf", 1024)
        assert len(result) == 1
        assert result[0]["type"] == "document"
        assert result[0]["filename"] == "file.pdf"
        assert result[0]["size"] == 1024

    def test_both_media_and_file(self):
        result = build_attachments(
            "http://example.com/img.jpg",
            "http://example.com/doc.pdf",
            "doc.pdf",
            2048,
        )
        assert len(result) == 2
        types = {a["type"] for a in result}
        assert "image" in types
        assert "document" in types

    def test_attachment_has_id_field(self):
        result = build_attachments("http://x.com/abc.png", None, None, None)
        assert "id" in result[0]
        assert "uploadedAt" in result[0]


class TestParseAttachments:
    def test_no_attachments(self):
        row = {"attachments": [], "other": "data"}
        result = parse_attachments(row)
        assert result["media_url"] is None
        assert result["file_url"] is None
        assert result["file_name"] is None
        assert result["file_size"] is None

    def test_none_attachments(self):
        row = {"attachments": None}
        result = parse_attachments(row)
        assert result["media_url"] is None

    def test_image_attachment(self):
        row = {"attachments": [{"type": "image", "url": "http://img.com/x.png"}]}
        result = parse_attachments(row)
        assert result["media_url"] == "http://img.com/x.png"
        assert result["file_url"] is None

    def test_document_attachment(self):
        row = {"attachments": [{"type": "document", "url": "http://file.com/a.pdf", "filename": "a.pdf", "size": 500}]}
        result = parse_attachments(row)
        assert result["file_url"] == "http://file.com/a.pdf"
        assert result["file_name"] == "a.pdf"
        assert result["file_size"] == 500

    def test_both_image_and_document(self):
        row = {
            "attachments": [
                {"type": "image", "url": "http://img.com/x.png"},
                {"type": "document", "url": "http://file.com/a.pdf", "filename": "a.pdf", "size": 200},
            ]
        }
        result = parse_attachments(row)
        assert result["media_url"] == "http://img.com/x.png"
        assert result["file_url"] == "http://file.com/a.pdf"
