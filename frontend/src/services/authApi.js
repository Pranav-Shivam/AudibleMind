// Authentication API service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

class AuthApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.data = data;
  }
}

export const authApi = {
  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Login response with token
   */
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorMessage = 'Login failed';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Login failed: ${response.status} ${response.statusText}`;
        }
        
        throw new AuthApiError(errorMessage, response.status, null);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }
      throw new AuthApiError('Network error: Could not connect to server', 0, null);
    }
  },

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @param {string} userData.name - User's full name
   * @param {string} userData.email - User's email
   * @param {string} userData.password - User's password
   * @returns {Promise<Object>} - Registration response
   */
  async register({ name, email, password }) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        let errorMessage = 'Registration failed';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Registration failed: ${response.status} ${response.statusText}`;
        }
        
        throw new AuthApiError(errorMessage, response.status, null);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }
      throw new AuthApiError('Network error: Could not connect to server', 0, null);
    }
  },

  /**
   * Verify if token is valid
   * @param {string} token - JWT token
   * @returns {Promise<boolean>} - Whether token is valid
   */
  async verifyToken(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  },

  /**
   * Logout user (if server-side logout is required)
   * @param {string} token - JWT token
   * @returns {Promise<Object>} - Logout response
   */
  async logout(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new AuthApiError('Logout failed', response.status, null);
      }

      return await response.json();
    } catch (error) {
      // Even if logout fails on server, we'll still clear local storage
      console.warn('Server logout failed:', error);
      return { success: false, error: error.message };
    }
  }
};

export { AuthApiError };