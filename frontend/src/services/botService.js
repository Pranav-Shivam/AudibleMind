import { API_URL } from './apiUrl';

class BotApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'BotApiError';
    this.status = status;
    this.data = data;
  }
}

const getAuthToken = () => {
  // Assumes token is stored in localStorage after login
  return localStorage.getItem('authToken');
};

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = 'An API error occurred';
    let errorData = null;
    try {
      errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || `API Error: ${response.status}`;
    } catch (e) {
      errorMessage = `API Error: ${response.status} ${response.statusText}`;
    }
    throw new BotApiError(errorMessage, response.status, errorData);
  }
  return response.json();
};

const botApi = {
  async getHeaders() {
    const token = getAuthToken();
    if (!token) {
      // Handle missing token case, maybe redirect to login or show an error
      console.error("Authentication token not found.");
      // For now, we'll proceed without it, but backend calls will fail.
      // A better implementation would use a global auth context.
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  },

  async listThreads(limit = 50, skip = 0) {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_URL}/api/v1/bot/threads?limit=${limit}&skip=${skip}`, {
      method: 'GET',
      headers,
    });
    return handleResponse(response);
  },

  async getThread(threadId) {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_URL}/api/v1/bot/threads/${threadId}`, {
      method: 'GET',
      headers,
    });
    return handleResponse(response);
  },

  async postMessage(threadId, query, provider = 'ollama', model) {
    const headers = await this.getHeaders();
    const body = {
      thread_id: threadId,
      query: query,
      provider: provider,
    };
    if (model) {
      body.model = model;
    }
    const response = await fetch(`${API_URL}/api/v1/bot/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  async markPreferredResponse(threadId, responseKey) {
    const headers = await this.getHeaders();
    const body = {
      thread_id: threadId,
      response_key: responseKey,
      preferred: true,
    };
    const response = await fetch(`${API_URL}/api/v1/bot/switch_response`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  async getBotConfig() {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_URL}/api/v1/bot/config`, {
      method: 'GET',
      headers,
    });
    return handleResponse(response);
  }
};

export { botApi, BotApiError };
