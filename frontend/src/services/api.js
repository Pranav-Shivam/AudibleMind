const API_BASE_URL = 'http://localhost:8001';

class ApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.status = status;
    this.response = response;
  }
}

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

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error: Could not connect to server', 0, null);
    }
  },

  /**
   * Get all 8 chunks for a document
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} - Document chunks data
   */
  async getDocumentChunks(documentId) {
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

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error: Could not connect to server', 0, null);
    }
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

export { ApiError }; 