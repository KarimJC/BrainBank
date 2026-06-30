import { API_BASE_URL, getAuthHeaders } from './api';
import { apiFetch, TIMEOUTS } from './errors';

export async function getConversations(userId: number) {
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
}

export async function getConversation(conversationId: number) {
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
}

export async function updateConversation(conversationId: number, status: string) {
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
}

export async function sendMessage(conversationId: number, content: string) {
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
}

export async function getMessages(
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
}

export async function markConversationRead(conversationId: number) {
  const headers = await getAuthHeaders();
  await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}/read`, {
    method: 'POST',
    headers,
  });
}

export async function createConversation(initiatorId: number, recipientId: number) {
  const headers = await getAuthHeaders();
  const response = await apiFetch(
    `${API_BASE_URL}/api/v1/conversations/${initiatorId}`,
    { method: 'POST', headers, body: JSON.stringify({ recipient_id: recipientId }) },
    TIMEOUTS.DEFAULT
  );
  return response.json();
}
