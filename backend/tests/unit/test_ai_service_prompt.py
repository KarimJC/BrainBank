"""Tests for core/ai_service.py — AIService.build_context_prompt (pure method)."""
import pytest
from core.ai_service import AIService


@pytest.fixture()
def ai():
    return AIService()


class TestBuildContextPrompt:
    def test_returns_string(self, ai):
        result = ai.build_context_prompt({}, [])
        assert isinstance(result, str)

    def test_includes_tutor_preamble(self, ai):
        result = ai.build_context_prompt({}, [])
        assert "tutor" in result.lower() or "northeastern" in result.lower()

    def test_includes_notes_section(self, ai):
        context = {"notes": [{"title": "Lecture 1", "description": "Basics", "notes_content": "content"}]}
        result = ai.build_context_prompt(context, [])
        assert "Lecture 1" in result
        assert "COURSE NOTES" in result

    def test_notes_description_included(self, ai):
        context = {"notes": [{"title": "L2", "description": "Advanced", "notes_content": ""}]}
        result = ai.build_context_prompt(context, [])
        assert "Advanced" in result

    def test_includes_documents_section(self, ai):
        context = {"documents": [{"doc_type": "study_guide", "doc_content": "Guide content"}]}
        result = ai.build_context_prompt(context, [])
        assert "COURSE DOCUMENTS" in result
        assert "study_guide" in result

    def test_empty_context_still_valid(self, ai):
        result = ai.build_context_prompt({}, [])
        assert len(result) > 0
        assert "INSTRUCTIONS" in result

    def test_chat_history_included(self, ai):
        history = [
            {"role": "user", "content": "What is a list?"},
            {"role": "assistant", "content": "A list is..."},
        ]
        result = ai.build_context_prompt({}, history)
        assert "What is a list?" in result
        assert "PREVIOUS CONVERSATION" in result

    def test_only_last_10_history_messages(self, ai):
        # Build 15 messages; only last 10 should appear
        history = [{"role": "user", "content": f"Message {i}"} for i in range(15)]
        result = ai.build_context_prompt({}, history)
        assert "Message 14" in result
        assert "Message 0" not in result

    def test_notes_without_content(self, ai):
        context = {"notes": [{"title": "Note", "description": None, "notes_content": None}]}
        result = ai.build_context_prompt(context, [])
        assert "Note" in result  # title included

    def test_documents_without_content(self, ai):
        context = {"documents": [{"doc_type": "summary", "doc_content": None}]}
        result = ai.build_context_prompt(context, [])
        assert "summary" in result

    def test_instructions_section_present(self, ai):
        result = ai.build_context_prompt({}, [])
        assert "INSTRUCTIONS" in result
