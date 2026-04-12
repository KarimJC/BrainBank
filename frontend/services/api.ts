import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { AuthRequiredError, apiFetch, TIMEOUTS } from './errors';


const API_URL = process.env.EXPO_PUBLIC_API_URL!;

const getApiUrl = (): string => {
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }

  if (__DEV__) {
    const port = process.env.EXPO_PUBLIC_API_PORT || '8000';

    const hostUri = Constants.expoConfig?.hostUri;
    console.log('hostUri:', hostUri);
    if (hostUri) {
      const host = hostUri.split(':')[0];
      return `http://${host}:${port}`;
    }

    const localIp = process.env.EXPO_PUBLIC_LOCAL_IP;
    if (localIp) {
      return `http://${localIp}:${port}`;
    }

    return 'http://localhost:8000';
  }

  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
};

export const API_BASE_URL = getApiUrl();
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

export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await apiFetch(API_ENDPOINTS.HEALTH, { method: 'GET' }, TIMEOUTS.FAST);
    return response.ok;
  } catch (error) {
    return false;
  }
};

console.log('API Base URL:', API_BASE_URL);

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
    const response = await apiFetch(`${API_BASE_URL}/api/v1/me`, { headers }, TIMEOUTS.FAST);
    return response.json();
  },

  async getConversations(userId: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/conversations/user/${userId}`,
      { headers },
      TIMEOUTS.FAST
    );
    return response.json();
  },

  async getConversation(conversationId: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/conversations/${conversationId}`,
      { headers },
      TIMEOUTS.FAST
    );
    return response.json();
  },

  async updateConversation(conversationId: number, status: string) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/conversations/${conversationId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      },
      TIMEOUTS.DEFAULT
    );
    return response.json();
  },

  async sendMessage(conversationId: number, content: string) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/messages`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ conversation_id: conversationId, content }),
      },
      TIMEOUTS.DEFAULT
    );
    return response.json();
  },

  async getMessages(conversationId: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/messages?conversation_id=${conversationId}`,
      { headers },
      TIMEOUTS.FAST
    );
    return response.json();
  },

  async createConversation(initiatorId: number, recipientId: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/conversations/${initiatorId}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ recipient_id: recipientId }),
      },
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

  async unenrollFromCourseSection(sectionId: number, userId: number) {
    const headers = await getAuthHeaders();
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/course-sections/${sectionId}/enroll?user_id=${userId}`,
      { method: 'DELETE', headers },
      TIMEOUTS.DEFAULT
    );
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