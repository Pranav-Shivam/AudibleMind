const API_BASE_URL = 'http://localhost:8001';

// Request deduplication cache
const requestCache = new Map();
const pendingRequests = new Map();

class ApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.status = status;
    this.response = response;
  }
}

// Utility function to create cache key
const createCacheKey = (method, url, body = null) => {
  const key = `${method}:${url}`;
  if (body) {
    // For FormData, we'll use a simple hash based on the first few entries
    if (body instanceof FormData) {
      const entries = Array.from(body.entries()).slice(0, 3); // First 3 entries for hash
      return `${key}:${JSON.stringify(entries)}`;
    }
    return `${key}:${JSON.stringify(body)}`;
  }
  return key;
};

// Utility function to check if cache is still valid (5 minutes)
const isCacheValid = (timestamp) => {
  return Date.now() - timestamp < 5 * 60 * 1000; // 5 minutes
};

// API client for document operations
export const documentApi = {
  /**
   * Upload a PDF file with optional prompt
   * @param {File} file - PDF file to upload
   * @param {string} userPrompt - Optional user prompt for summarization
   * @returns {Promise<string>} - Document ID
   */
  async uploadDocument(file, userPrompt = '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_prompt', userPrompt.trim() || '');

    try {
      const response = await fetch(`${API_BASE_URL}/document/upload-file`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `Upload failed: ${response.status}`;
        
        try {
          const errorData = await response.json();
          
          // Handle FastAPI validation errors
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              // Multiple validation errors
              errorMessage = errorData.detail.map(err => 
                `${err.loc?.join(' → ') || 'Field'}: ${err.msg}`
              ).join(', ');
            } else {
              // Single error message
              errorMessage = errorData.detail;
            }
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If JSON parsing fails, use the status text
          errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
        }
        
        throw new ApiError(errorMessage, response.status, null);
      }

      const documentId = await response.text();
      return documentId.replace(/['"]/g, ''); // Remove quotes if present
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error: Could not connect to server', 0, null);
    }
  },

  /**
   * Get document details including summary and paragraphs
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} - Document details
   */
  async getDocument(documentId) {
    const cacheKey = createCacheKey('GET', `${API_BASE_URL}/document/${documentId}`);
    
    // Check cache first
    const cached = requestCache.get(cacheKey);
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    
    // Check if request is already pending
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }

    // Create new request
    const requestPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/document/${documentId}`);

        if (!response.ok) {
          let errorMessage = `Failed to fetch document: ${response.status}`;
          
          try {
            const errorData = await response.json();
            if (errorData.detail) {
              errorMessage = errorData.detail;
            }
          } catch (e) {
            errorMessage = `Failed to fetch document: ${response.status} ${response.statusText}`;
          }
          
          throw new ApiError(errorMessage, response.status, null);
        }

        const data = await response.json();
        
        // Cache the successful response
        requestCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        return data;
      } finally {
        // Clean up pending request
        pendingRequests.delete(cacheKey);
      }
    })();

    // Store pending request
    pendingRequests.set(cacheKey, requestPromise);
    
    return requestPromise;
  },

  /**
   * Get all chunks for a document with deduplication and caching
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} - Document chunks data
   */
  async getDocumentChunks(documentId) {
    const cacheKey = createCacheKey('GET', `${API_BASE_URL}/document/${documentId}/chunks`);
    
    // Check cache first
    const cached = requestCache.get(cacheKey);
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    
    // Check if request is already pending
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }

    // Create new request
    const requestPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/document/${documentId}/chunks`, {
          method: 'GET',
        });

        if (!response.ok) {
          let errorMessage = `Failed to fetch chunks: ${response.status}`;
          
          try {
            const errorData = await response.json();
            if (errorData.detail) {
              errorMessage = errorData.detail;
            }
          } catch (e) {
            errorMessage = `Failed to fetch chunks: ${response.status} ${response.statusText}`;
          }
          
          throw new ApiError(errorMessage, response.status, null);
        }

        const data = await response.json();
        
        // Cache the successful response
        requestCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        return data;
      } finally {
        // Clean up pending request
        pendingRequests.delete(cacheKey);
      }
    })();

    // Store pending request
    pendingRequests.set(cacheKey, requestPromise);
    
    return requestPromise;
  },

  /**
   * Summarize a specific chunk on-demand
   * @param {string} documentId - Document ID
   * @param {number} chunkIndex - Chunk index (0-7)
   * @param {string} userPrompt - Optional user prompt for summarization
   * @returns {Promise<Object>} - Chunk summary data
   */
  async summarizeChunk(documentId, chunkIndex, userPrompt = '') {
    const formData = new FormData();
    formData.append('user_prompt', userPrompt.trim());

    try {
      const response = await fetch(`${API_BASE_URL}/document/${documentId}/chunks/${chunkIndex}/summarize`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `Failed to summarize chunk: ${response.status}`;
        
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          errorMessage = `Failed to summarize chunk: ${response.status} ${response.statusText}`;
        }
        
        throw new ApiError(errorMessage, response.status, null);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error: Could not connect to server', 0, null);
    }
  },

  /**
   * Clear the request cache (useful for testing or manual cache invalidation)
   */
  clearCache() {
    requestCache.clear();
    pendingRequests.clear();
  },

  /**
   * Get cache statistics (useful for debugging)
   */
  getCacheStats() {
    return {
      cachedRequests: requestCache.size,
      pendingRequests: pendingRequests.size,
      cacheKeys: Array.from(requestCache.keys())
    };
  }
};

// Utility functions
export const utils = {
  /**
   * Validate if file is a PDF
   * @param {File} file - File to validate
   * @returns {boolean} - True if valid PDF
   */
  isValidPDF(file) {
    return file && file.type === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf');
  },

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} - Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Create a delay for demo purposes or throttling
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Audio API for text-to-speech functionality
export const audioApi = {
  /**
   * Convert text to speech
   * @param {string} text - Text to convert to speech
   * @param {string} filename - Optional filename for the audio file
   * @returns {Promise<Blob>} - Audio blob
   */
  async textToSpeech(text, filename = null) {
    const formData = new FormData();
    formData.append('text', text);
    if (filename) {
      formData.append('filename', filename);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/audio/text-to-speech/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `Text-to-speech failed: ${response.status}`;
        
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          errorMessage = `Text-to-speech failed: ${response.status} ${response.statusText}`;
        }
        
        throw new ApiError(errorMessage, response.status, null);
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error: Could not connect to audio server', 0, null);
    }
  },

  /**
   * Get available voices
   * @returns {Promise<Object>} - Available voices
   */
  async getVoices() {
    try {
      const response = await fetch(`${API_BASE_URL}/audio/voices/`);

      if (!response.ok) {
        let errorMessage = `Failed to get voices: ${response.status}`;
        
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          errorMessage = `Failed to get voices: ${response.status} ${response.statusText}`;
        }
        
        throw new ApiError(errorMessage, response.status, null);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error: Could not connect to audio server', 0, null);
    }
  }
};

export { ApiError }; 