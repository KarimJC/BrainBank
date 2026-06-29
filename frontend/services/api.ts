import Constants from 'expo-constants';
import { supabase } from './supabase';
import { AuthRequiredError, apiFetch, TIMEOUTS } from './errors';

/**
 * Resolve the dev machine's host (IP) from Expo's runtime config.
 *
 * A physical device running the app already knows this host — it's the same
 * address it used to reach the Metro bundler — so we can derive the backend
 * URL automatically and never need the IP hardcoded in a .env file.
 *
 * Expo exposes this host under different fields depending on the run mode
 * (Expo Go vs. dev build) and SDK version, so we check each in turn.
 */
const getDevHost = (): string | null => {
  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants as any).expoGoConfig?.debuggerHost,
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost,
    (Constants as any).manifest?.debuggerHost, // legacy fallback
  ];

  for (const candidate of candidates) {
    const host = candidate?.split(':')[0]?.trim();
    if (host) {
      return host;
    }
  }

  return null;
};

const getApiUrl = (): string => {
  
  // Explicit override (e.g. staging/prod) via app.json -> expo.extra.apiUrl
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }

  if (__DEV__) {
    const port = process.env.EXPO_PUBLIC_API_PORT || '8000';

    // Auto-detect the dev machine's IP from Expo — no .env entry needed.
    const host = getDevHost();
    if (host) {
      return `http://${host}:${port}`;
    }

    // Optional manual override, only used if auto-detection fails.
    const localIp = process.env.EXPO_PUBLIC_LOCAL_IP;
    if (localIp) {
      return `http://${localIp}:${port}`;
    }

    return 'http://localhost:8000';
  }

  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
};

export const API_BASE_URL = getApiUrl();
// WebSocket URL is derived from the (auto-detected) API host by default;
// EXPO_PUBLIC_WS_URL only needs to be set to point WS at a different host/port.
// Will be same ip as API_BASE_URL if not set in env.
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? API_BASE_URL.replace(/^http/, 'ws');

export const API_ENDPOINTS = {
  BASE: API_BASE_URL,
  NOTES: `${API_BASE_URL}/api/v1/notes`,
  NOTE_BY_ID: (id: string) => `${API_BASE_URL}/api/v1/notes/${id}`,
  NOTES_BY_COURSE: (course: string) => `${API_BASE_URL}/api/v1/notes/course/${course}`,
  NOTES_COUNT: `${API_BASE_URL}/api/v1/notes/count`,
  NOTES_COURSE_SECTIONS: `${API_BASE_URL}/api/v1/notes/course-sections`,
  COURSE_SECTIONS: `${API_BASE_URL}/api/v1/course-sections`,
  COURSE_SECTION_BY_ID: (id: number) => `${API_BASE_URL}/api/v1/course-sections/${id}`,
  PROFESSOR_BY_ID: (id: number) => `${API_BASE_URL}/api/v1/professors/${id}`,
  COURSE_SECTION_BY_CRN: (crn: number) => `${API_BASE_URL}/api/v1/course-sections/crn/${crn}`,
  HEALTH: `${API_BASE_URL}/health`,
};

console.log('API Base URL:', API_BASE_URL);

export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await apiFetch(API_ENDPOINTS.HEALTH, { method: 'GET' }, TIMEOUTS.FAST);
    return response.ok;
  } catch {
    return false;
  }
};

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }
  throw new AuthRequiredError();
}

export const api = {
async getCurrentUser() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/me`, { headers }); // remove /user

  if (!response.ok) {
    const error = await response.text();
    console.error('API Error:', error);
    throw new Error(`Failed to fetch user: ${error}`);
  }

  return response.json();
},

  async getConversations(userId: number) {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/conversations/user/${userId}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch conversations: ${error}`);
  }

  return response.json();
},

async getConversation(conversationId: number) {
  const headers = await getAuthHeaders();

  const response = await fetch(
`${API_BASE_URL}/api/v1/conversations/${conversationId}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch conversation: ${error}`);
  }

  return response.json();
},

async updateConversation(conversationId: number, status: string) {
  const headers = await getAuthHeaders();

  const response = await fetch(
`${API_BASE_URL}/api/v1/conversations/${conversationId}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update conversation: ${error}`);
  }

  return response.json();
},

async sendMessage(conversationId: number, content: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ conversation_id: conversationId, content }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${error}`);
  }
  return response.json();
},

async getMessages(
  conversationId: number,
  options?: { before?: string; limit?: number }
): Promise<{ messages: any[]; next_cursor: string | null; has_more: boolean }> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ conversation_id: String(conversationId) });
  if (options?.before) params.set('before', options.before);
  if (options?.limit) params.set('limit', String(options.limit));

  const response = await fetch(
    `${API_BASE_URL}/api/v1/messages?${params}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch messages: ${error}`);
  }

  return response.json();
},

async markConversationRead(conversationId: number) {
  const headers = await getAuthHeaders();
  await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}/read`, {
    method: 'POST',
    headers,
  });
},

  async createConversation(initiatorId: number, recipientId: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/conversations/${initiatorId}`,
      { method: 'POST', headers, body: JSON.stringify({ recipient_id: recipientId }) },
      TIMEOUTS.DEFAULT
    );
    return response.json();
  },

  async getCourseSectionByCRN(crn: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/course-sections/crn/${crn}`,
      { headers },
      TIMEOUTS.FAST
    );
    if (response.status === 404) return null;
    return response.json();
  },

  async enrollInCourseSection(sectionId: number, userId: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/course-sections/${sectionId}/enroll?user_id=${userId}`,
      { method: 'POST', headers },
      TIMEOUTS.DEFAULT
    );
    return response.json();
  },

  async unenrollFromCourseSection(sectionId: number, userId: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/course-sections/${sectionId}/enroll?user_id=${userId}`,
      { method: 'DELETE', headers },
      TIMEOUTS.DEFAULT
    );
    return response.json();
  },

  async getUserCourseSections(userId: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/course-sections/user/${userId}`,
      { headers },
      TIMEOUTS.FAST
    );
    return response.json();
  },

  async getProfessor(professorId: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      API_ENDPOINTS.PROFESSOR_BY_ID(professorId),
      { headers },
      TIMEOUTS.FAST
    );
    return response.json();
  },

  async getCourseSectionStudents(sectionId: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/course-sections/${sectionId}/students`,
      { headers },
      TIMEOUTS.FAST
    );
    return response.json();
  },

  async getUserById(userId: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/user/${userId}`,
      { headers },
      TIMEOUTS.FAST
    );
    return response.json();
  },
};

