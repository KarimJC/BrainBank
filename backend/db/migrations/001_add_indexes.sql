-- ============================================================
-- user table
-- auth_id is looked up on every authenticated request
-- neu_email is checked during registration
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_auth_id
    ON public.user(auth_id);

CREATE INDEX IF NOT EXISTS idx_user_neu_email
    ON public.user(neu_email);

-- ============================================================
-- conversation table
-- get_user_conversations: WHERE initiator_id = %s OR recipient_id = %s
-- PostgreSQL uses both indexes via a Bitmap OR scan
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_conversation_initiator_id
    ON conversation(initiator_id);

CREATE INDEX IF NOT EXISTS idx_conversation_recipient_id
    ON conversation(recipient_id);

-- ============================================================
-- message table
-- get_messages_between_users: WHERE conversation_id = %s ORDER BY created_at ASC
-- Composite index covers the filter + sort in one scan (no separate sort step)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_message_conversation_created
    ON message(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_message_sender_id
    ON message(sender_id);

-- ============================================================
-- ai_chat_session table
-- get_or_create_session: WHERE user_id = %s AND section_id = %s
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ai_chat_session_user_section
    ON ai_chat_session(user_id, section_id);

-- ============================================================
-- ai_chat_message table
-- get_chat_history: WHERE session_id = %s ORDER BY timestamp ASC
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ai_chat_message_session_ts
    ON ai_chat_message(session_id, timestamp ASC);

-- ============================================================
-- notes table
-- get_all_notes filters on user_id and/or course_id, orders by date_uploaded
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notes_user_date
    ON notes(user_id, date_uploaded DESC);

CREATE INDEX IF NOT EXISTS idx_notes_course_date
    ON notes(course_id, date_uploaded DESC);
