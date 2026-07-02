import Constants from 'expo-constants';
import { supabase } from './supabase';
import { AuthRequiredError, apiFetch, TIMEOUTS } from './errors';

/**
 * Resolve the dev machine's host (IP) from Expo's runtime config.
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

export async function getAuthHeaders(json = true): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new AuthRequiredError();
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
  };
  if (json) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

