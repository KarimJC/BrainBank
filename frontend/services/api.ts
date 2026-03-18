import { supabase } from './supabase';


// IMPORTANT: Replace with YOUR computer's IP address
// Find it in your Expo terminal (where it says exp://YOUR_IP:8081)
const API_URL = 'http://10.110.18.79:8000'; // Example: http://192.168.1.5:8000
export const WS_URL = 'ws://10.110.18.79:8000';

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
  const response = await fetch(`${API_URL}/api/v1/me`, { headers }); // remove /user
  
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
    `${API_URL}/api/v1/conversations/user/${userId}`,
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
    `${API_URL}/api/v1/conversations/${conversationId}`,
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
    `${API_URL}/api/v1/conversations/${conversationId}`,
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
  const response = await fetch(`${API_URL}/api/v1/messages`, {
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

async getMessages(conversationId: number) {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${API_URL}/api/v1/messages?conversation_id=${conversationId}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch messages: ${error}`);
  }

  return response.json();
},

async createConversation(initiatorId: number, recipientId: number) {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_URL}/api/v1/conversations/${initiatorId}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ recipient_id: recipientId }),
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create conversation: ${error}`);
  }
  return response.json();
},
};