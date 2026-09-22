import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { API_BASE_URL, getAuthHeaders } from './api';

const BASE_URL = API_BASE_URL;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isDocument?: boolean;
  docType?: string;
  docId?: string;
}

export type DocumentType = 'study-guide' | 'practice-exam' | 'summary';

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
  useAllSections: boolean = false,
): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/v1/ai-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, section_id: sectionId, message, use_all_sections: useAllSections }),
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

export const DOC_LABEL: Record<DocumentType, string> = {
  'study-guide': 'Study Guide',
  'practice-exam': 'Practice Exam',
  'summary': 'Course Summary',
};

export interface GeneratedDocument {
  docId: string;
  docContent: string;
  docType: DocumentType;
}

/**
 * Ask the AI to generate a document (study guide, practice exam, or summary)
 * from the course notes and save it to the DB.
 * Returns the doc_id and content so the PDF can be fetched later.
 */
export async function generateDocument(
  userId: number,
  sectionId: number,
  type: DocumentType,
  useAllSections: boolean = false,
): Promise<GeneratedDocument> {
  const endpoint = DOC_ENDPOINT[type];
  const url =
    `${BASE_URL}/api/v1/documents/generate/${endpoint}` +
    `?user_id=${userId}&section_id=${sectionId}` +
    (type === 'practice-exam' ? '&num_questions=10' : '') +
    (useAllSections ? '&use_all_sections=true' : '');

  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Document generation failed: ${text}`);
  }
  const data = await response.json();
  return {
    docId: data.doc_id as string,
    docContent: data.doc_content as string,
    docType: type,
  };
}

// ─── PDF export ──────────────────────────────────────────────────────────────

/**
 * Opens the backend-generated PDF in an in-app browser for immediate viewing.
 */
export async function openPdfInBrowser(docId: string): Promise<void> {
  const pdfUrl = `${BASE_URL}/api/v1/documents/${docId}/pdf`;
  await WebBrowser.openBrowserAsync(pdfUrl, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  });
}

/**
 * Fetches the backend-generated PDF for a saved document and opens
 * the native share sheet so the user can save to Files, email it, etc.
 * The backend uses fpdf to properly render markdown formatting.
 */
export async function shareAsPdf(
  docId: string,
  docType: DocumentType,
  courseName: string,
): Promise<void> {
  const pdfUrl = `${BASE_URL}/api/v1/documents/${docId}/pdf`;
  const filename = `${courseName.replace(/\s+/g, '_')}_${DOC_LABEL[docType].replace(/\s+/g, '_')}.pdf`;
  const localUri = `${FileSystem.cacheDirectory}${filename}`;

  // Download PDF from backend to a local temp file
  const { uri } = await FileSystem.downloadAsync(pdfUrl, localUri);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${courseName} — ${DOC_LABEL[docType]}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
