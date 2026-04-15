-- ============================================================
-- Add last-read timestamps to conversation for unread counts
-- initiator_last_read_at: when the initiator last opened the chat
-- recipient_last_read_at: when the recipient last opened the chat
-- NULL means they have never opened it (treat as unread from the start)
-- ============================================================
ALTER TABLE conversation
    ADD COLUMN IF NOT EXISTS initiator_last_read_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS recipient_last_read_at TIMESTAMPTZ;
