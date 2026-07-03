import { API_BASE_URL, apiFetch, getAuthHeaders, TIMEOUTS } from './api';

export async function getCurrentUser() {
  const headers = await getAuthHeaders();
  const response = await apiFetch(`${API_BASE_URL}/api/v1/me`, { headers });
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
  const response = await apiFetch(`${API_BASE_URL}/api/v1/me`, { headers });
  return response.json();
}

export async function updateUserName(firstName: string, lastName: string) {
  const headers = await getAuthHeaders();
  const response = await apiFetch(`${API_BASE_URL}/api/v1/me`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ first_name: firstName, last_name: lastName }),
  });
  return response.json();
}

export async function updateProfilePicture(url: string) {
  const headers = await getAuthHeaders();
  const response = await apiFetch(`${API_BASE_URL}/api/v1/me/profile-picture`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ profile_picture_url: url }),
  });
  return response.json();
}
