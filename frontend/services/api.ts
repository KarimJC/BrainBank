import { supabase } from './supabase';

class AuthRequiredError extends Error {
  override name = 'AuthRequiredError';
}

function getApiBaseUrl() {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const ip = process.env.EXPO_PUBLIC_LOCAL_IP?.trim();
  if (ip) return `http://${ip}:8000`;

  // Reasonable fallback for web / local dev.
  return 'http://localhost:8000';
}

const API_URL = getApiBaseUrl();

async function getAuthHeaders(requireAuth: boolean = true) {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  if (!session?.access_token && requireAuth) throw new AuthRequiredError('No active session');
  return headers;
}

export const api = {
  AuthRequiredError,
  async getCurrentUser() {
    const headers = await getAuthHeaders();
    console.log('Calling:', `${API_URL}/api/v1/user/me`);
    const response = await fetch(`${API_URL}/api/v1/user/me`, { headers });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', error);
      throw new Error(`Failed to fetch user: ${error}`);
    }
    
    return response.json();
  },
  
  async getUserCourseSections(userId: number) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/v1/course_sections/user/${userId}`, { headers });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch course sections: ${error}`);
    }

    return response.json();
  },
};