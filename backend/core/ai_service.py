import os
from google import genai
from google.genai import types
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

# Configure Gemini API
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


class AIService:
    def __init__(self):
        self.client = client

    def build_context_prompt(self, context: Dict, chat_history: List[Dict]) -> str:
        """Build a comprehensive prompt with course context and chat history"""

        # Build context from notes and documents
        context_text = "You are a helpful AI tutor for students at Northeastern University. "
        context_text += "You have access to the following course materials:\n\n"

        # Add notes context
        if context.get("notes"):
            context_text += "=== COURSE NOTES ===\n"
            for note in context["notes"]:
                context_text += f"\nTitle: {note.get('title', 'Untitled')}\n"
                if note.get("description"):
                    context_text += f"Description: {note['description']}\n"
                if note.get("notes_content"):
                    context_text += f"Content: {note['notes_content']}\n"
                context_text += "---\n"

        # Add documents context
        if context.get("documents"):
            context_text += "\n=== COURSE DOCUMENTS ===\n"
            for doc in context["documents"]:
                context_text += f"\nType: {doc.get('doc_type', 'Unknown')}\n"
                if doc.get("doc_content"):
                    context_text += f"Content: {doc['doc_content']}\n"
                context_text += "---\n"

        # Add chat history
        if chat_history:
            context_text += "\n=== PREVIOUS CONVERSATION ===\n"
            for msg in chat_history[-10:]:  # Last 10 messages for context
                role = "Student" if msg["role"] == "user" else "AI Tutor"
                context_text += f"{role}: {msg['content']}\n"

        context_text += "\n=== INSTRUCTIONS ===\n"
        context_text += "Based on the course materials above, help the student with their question. "
        context_text += "You can:\n"
        context_text += "1. Generate study guides from the notes and documents\n"
        context_text += "2. Create practice exam questions based on the material\n"
        context_text += "3. Summarize course content and key concepts\n"
        context_text += "4. Answer questions about the material\n"
        context_text += "5. Explain concepts in different ways\n\n"
        context_text += "Always reference specific notes or documents when possible. "
        context_text += "Be concise but thorough.\n\n"

        return context_text

    def generate_response(self, user_message: str, context: Dict, chat_history: List[Dict]) -> tuple[str, int]:
        """
        Generate AI response using Gemini

        Returns:
            tuple: (response_text, tokens_used)
        """
        try:
            # Build the full prompt with context
            system_prompt = self.build_context_prompt(context, chat_history)
            full_prompt = system_prompt + f"\nStudent Question: {user_message}\n\nAI Tutor Response:"

            # Generate response using new API with correct model name
            response = self.client.models.generate_content(model="gemini-2.5-flash", contents=full_prompt)

            # Count tokens
            tokens_used = len(full_prompt + response.text) // 4

            logger.info(f"Generated AI response, approx {tokens_used} tokens used")
            return response.text, tokens_used

        except Exception as e:
            logger.error(f"Failed to generate AI response: {str(e)}")
            raise Exception(f"AI generation failed: {str(e)}")

    def generate_study_guide(self, context: Dict) -> tuple[str, int]:
        """Generate a study guide from course materials"""
        prompt = """Based on the course materials provided, create a comprehensive study guide that:
        1. Lists all major topics covered
        2. Provides key definitions and concepts
        3. Highlights important formulas, theorems, or principles
        4. Suggests connections between different topics
        5. Includes example questions for each topic
        
        Format the study guide with clear headings and bullet points."""

        return self.generate_response(prompt, context, [])

    def generate_practice_exam(self, context: Dict, num_questions: int = 10) -> tuple[str, int]:
        """Generate practice exam questions from course materials"""
        prompt = f"""Based on the course materials provided, create a practice exam with {num_questions} questions that:
        1. Cover different topics from the course
        2. Include a mix of question types (multiple choice, short answer, problem-solving)
        3. Range from easy to challenging
        4. Include an answer key at the end
        
        Format clearly with question numbers and point values."""

        return self.generate_response(prompt, context, [])

    def summarize_course(self, context: Dict) -> tuple[str, int]:
        """Generate a course summary from all materials"""
        prompt = """Based on all the course materials provided, create a concise summary that:
        1. Identifies the main themes and objectives of the course
        2. Lists the key topics in order
        3. Highlights the most important concepts to understand
        4. Suggests how different parts of the course connect
        
        Keep it concise but comprehensive."""

        return self.generate_response(prompt, context, [])


# Singleton instance
ai_service = AIService()
