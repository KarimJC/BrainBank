import { supabase } from './supabase';

// IMPORTANT: Replace with YOUR computer's IP address
// Find it in your Expo terminal (where it says exp://YOUR_IP:8081)
const API_URL = 'http://10.0.0.110:8000'; // Backend runs on port 8000

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }
  
  throw new Error('No active session');
}

export const api = {
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