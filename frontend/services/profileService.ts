import { supabase } from './supabase';
import { API_BASE_URL } from './api';

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('No active session');
  return session.access_token;
}

export async function fetchUserProfile() {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to load profile');
  return response.json();
}

export async function updateUserName(firstName: string, lastName: string) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/me`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ first_name: firstName, last_name: lastName }),
  });
  if (!response.ok) throw new Error('Failed to update profile');
  return response.json();
}

export async function updateProfilePicture(url: string) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/me/profile-picture`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profile_picture_url: url }),
  });
  if (!response.ok) throw new Error('Failed to update profile picture');
}
