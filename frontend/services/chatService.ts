import { supabase } from './supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

// ─── IMPORTANT ─────────────────────────────────────────────────────────────
// Set this to your machine's local IP address (the same IP shown in the Expo
// terminal as  exp://YOUR_IP:8081 ).  The backend runs on port 8000.
// Example: 'http://192.168.1.5:8000'
// ───────────────────────────────────────────────────────────────────────────
const LOCAL_IP = process.env.EXPO_PUBLIC_LOCAL_IP ?? '10.0.0.112';

const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return `http://${LOCAL_IP}:8000`;
};

const BASE_URL = getBaseUrl();

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isDocument?: boolean;
  docType?: string;
}

export type DocumentType = 'study-guide' | 'practice-exam' | 'summary';

// ─── Auth helpers ────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }
  throw new Error('No active session. Please log in again.');
}

// ─── User ────────────────────────────────────────────────────────────────────

/**
 * Returns the integer user_id from the backend DB (not the Supabase UUID).
 * Required for all AI chat and document endpoints.
 */
export async function getUserDbId(): Promise<number> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/v1/me`, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get user: ${text}`);
  }
  const user = await response.json();
  return user.user_id;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

/**
 * Send a message to the AI and get a response.
 * The AI uses all uploaded notes for the given section as context.
 */
export async function sendChatMessage(
  userId: number,
  sectionId: number,
  message: string,
): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/v1/ai-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, section_id: sectionId, message }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Chat request failed: ${text}`);
  }
  const data = await response.json();
  return data.ai_response as string;
}

/**
 * Load the full chat history for a user + section.
 * Returns an empty array if no session exists yet.
 */
export async function loadChatHistory(
  userId: number,
  sectionId: number,
): Promise<ChatMessage[]> {
  const response = await fetch(
    `${BASE_URL}/api/v1/ai-chat/history?user_id=${userId}&section_id=${sectionId}`,
  );
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  const messages: { message_id: number; role: string; content: string }[] =
    data.messages ?? [];
  return messages.map((m) => ({
    id: String(m.message_id),
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));
}

// ─── Document generation ─────────────────────────────────────────────────────

const DOC_ENDPOINT: Record<DocumentType, string> = {
  'study-guide': 'study-guide',
  'practice-exam': 'practice-exam',
  'summary': 'summary',
};

/**
 * Ask the AI to generate a document (study guide, practice exam, or summary)
 * from the course notes and save it to the DB.
 * Returns the generated text content.
 */
export async function generateDocument(
  userId: number,
  sectionId: number,
  type: DocumentType,
): Promise<string> {
  const endpoint = DOC_ENDPOINT[type];
  const url =
    `${BASE_URL}/api/v1/documents/generate/${endpoint}` +
    `?user_id=${userId}&section_id=${sectionId}` +
    (type === 'practice-exam' ? '&num_questions=10' : '');

  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Document generation failed: ${text}`);
  }
  const data = await response.json();
  return data.doc_content as string;
}

// ─── PDF export ──────────────────────────────────────────────────────────────

const DOC_LABEL: Record<DocumentType, string> = {
  'study-guide': 'Study Guide',
  'practice-exam': 'Practice Exam',
  'summary': 'Course Summary',
};

/**
 * Converts the AI text blob into a styled PDF and opens the native share sheet
 * so the user can save to Files, email it, etc.
 */
export async function shareAsPdf(
  courseName: string,
  docType: DocumentType,
  content: string,
): Promise<void> {
  const title = `${courseName} — ${DOC_LABEL[docType]}`;

  // Convert plain text / markdown-ish output to readable HTML
  const bodyHtml = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^#{1,3} (.+)$/gm, '<h3>$1</h3>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body {
            font-family: Georgia, serif;
            padding: 48px;
            font-size: 14px;
            line-height: 1.7;
            color: #1C1C1E;
          }
          h1 { color: #6B4CE6; font-size: 22px; margin-bottom: 4px; }
          h2 { color: #6B4CE6; font-size: 16px; }
          h3 { color: #333; font-size: 15px; margin-top: 20px; }
          .subtitle { color: #636366; font-size: 13px; margin-bottom: 32px; }
          p { margin: 10px 0; }
          li { margin: 4px 0 4px 20px; }
          strong { color: #1C1C1E; }
          hr { border: none; border-top: 1px solid #E5E5EA; margin: 24px 0; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="subtitle">Generated by BrainBot · BrainBank</p>
        <hr/>
        <p>${bodyHtml}</p>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: title,
      UTI: 'com.adobe.pdf',
    });
  } else {
    // Fallback: open print dialog (works well on iOS simulator)
    await Print.printAsync({ uri });
  }
}
