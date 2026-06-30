import { API_BASE_URL, getAuthHeaders } from './api';
import { apiFetch, TIMEOUTS } from './errors';

export async function getCurrentUser() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/me`, { headers });

  if (!response.ok) {
    const error = await response.text();
    console.error('API Error:', error);
    throw new Error(`Failed to fetch user: ${error}`);
  }

  return response.json();
}

export async function getUserById(userId: number) {
  const headers = await getAuthHeaders();
  const response = await apiFetch(
    `${API_BASE_URL}/api/v1/user/${userId}`,
    { headers },
    TIMEOUTS.FAST
  );
  return response.json();
}

export async function fetchUserProfile() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/me`, { headers });
  if (!response.ok) throw new Error('Failed to load profile');
  return response.json();
}

export async function updateUserName(firstName: string, lastName: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/me`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ first_name: firstName, last_name: lastName }),
  });
  if (!response.ok) throw new Error('Failed to update profile');
  return response.json();
}

export async function updateProfilePicture(url: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/me/profile-picture`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ profile_picture_url: url }),
  });
  if (!response.ok) throw new Error('Failed to update profile picture');
}
