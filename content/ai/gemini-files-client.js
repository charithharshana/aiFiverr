/**
 * Gemini Files API Client
 * Handles file uploads, management, and operations with Google's Gemini Files API
 * Supports all Gemini-compatible file types for knowledge base integration
 */

class GeminiFilesClient {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.uploadUrl = 'https://generativelanguage.googleapis.com/upload/v1beta';
    this.initialized = false;
    this.supportedMimeTypes = new Set([
      // Documents & Text
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'application/rtf',
      'application/vnd.google-apps.document',
      
      // Spreadsheets & Data
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/tab-separated-values',
      'application/vnd.google-apps.spreadsheet',
      
      // Code files
      'text/x-c',
      'text/x-c++src',
      'text/x-java-source',
      'text/x-python',
      'application/x-php',
      'text/html',
      'text/javascript',
      'application/json',
      'text/xml',
      'text/css',
      
      // Images
      'image/jpeg',
      'image/png',
      'image/bmp',
      'image/gif',
      'image/svg+xml',
      'image/tiff',
      'image/webp',
      
      // Video
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/3gpp',
      'video/x-flv',
      'video/x-ms-wmv',
      'video/ogg',
      
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/opus',
      'audio/flac',
      'audio/aac'
    ]);
    
    this.init();
  }

  async init() {
    try {
      this.initialized = true;
      console.log('aiFiverr Gemini Files: Client initialized');
    } catch (error) {
      console.error('aiFiverr Gemini Files: Initialization error:', error);
      this.initialized = true;
    }
  }

  /**
   * Get API key for Gemini Files API
   */
  async getApiKey() {
    try {
      if (window.apiKeyManager && window.apiKeyManager.initialized) {
        const keyData = window.apiKeyManager.getKeyForSession('gemini-files');
        if (keyData) {
          return keyData.key;
        }
      }

      // Fallback to background script
      const response = await chrome.runtime.sendMessage({ type: 'GET_API_KEY' });
      if (response?.success && response?.data) {
        return response.data.key;
      }
      
      throw new Error('No API key available');
    } catch (error) {
      console.error('aiFiverr Gemini Files: Failed to get API key:', error);
      throw error;
    }
  }

  /**
   * Check if file type is supported by Gemini
   */
  isSupportedFileType(mimeType) {
    return this.supportedMimeTypes.has(mimeType);
  }

  /**
   * Get MIME type from file extension
   */
  getMimeTypeFromExtension(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypeMap = {
      // Documents & Text
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'pdf': 'application/pdf',
      'rtf': 'application/rtf',
      
      // Spreadsheets & Data
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv',
      'tsv': 'text/tab-separated-values',
      
      // Code files
      'c': 'text/x-c',
      'cpp': 'text/x-c++src',
      'java': 'text/x-java-source',
      'py': 'text/x-python',
      'php': 'application/x-php',
      'html': 'text/html',
      'js': 'text/javascript',
      'json': 'application/json',
      'xml': 'text/xml',
      'css': 'text/css',
      
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'bmp': 'image/bmp',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'tiff': 'image/tiff',
      'webp': 'image/webp',
      
      // Video
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'webm': 'video/webm',
      '3gp': 'video/3gpp',
      'flv': 'video/x-flv',
      'wmv': 'video/x-ms-wmv',
      'ogv': 'video/ogg',
      
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'opus': 'audio/opus',
      'flac': 'audio/flac',
      'aac': 'audio/aac'
    };
    
    return mimeTypeMap[ext] || 'application/octet-stream';
  }

  /**
   * Upload file to Gemini Files API
   */
  async uploadFile(file, displayName = null) {
    try {
      console.log('aiFiverr Gemini Files: Uploading file:', file.name);

      const apiKey = await this.getApiKey();
      
      // Validate file type
      const mimeType = file.type || this.getMimeTypeFromExtension(file.name);
      if (!this.isSupportedFileType(mimeType)) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Check file size (2GB limit)
      if (file.size > 2 * 1024 * 1024 * 1024) {
        throw new Error('File size exceeds 2GB limit');
      }

      // Prepare metadata
      const metadata = {
        file: {
          displayName: displayName || file.name
        }
      };

      // Create form data for multipart upload
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      const response = await fetch(`${this.uploadUrl}/files?uploadType=multipart&key=${apiKey}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Upload failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('aiFiverr Gemini Files: File uploaded successfully:', result.file.name);

      return {
        name: result.file.name,
        displayName: result.file.displayName,
        mimeType: result.file.mimeType,
        sizeBytes: result.file.sizeBytes,
        uri: result.file.uri,
        state: result.file.state,
        createTime: result.file.createTime
      };

    } catch (error) {
      console.error('aiFiverr Gemini Files: Upload failed:', error);
      throw error;
    }
  }

  /**
   * Get file metadata from Gemini Files API
   */
  async getFile(fileName) {
    try {
      const apiKey = await this.getApiKey();
      
      const response = await fetch(`${this.baseUrl}/${fileName}?key=${apiKey}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Get file failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('aiFiverr Gemini Files: Get file failed:', error);
      throw error;
    }
  }

  /**
   * List all uploaded files
   */
  async listFiles(pageSize = 50, pageToken = null) {
    try {
      const apiKey = await this.getApiKey();
      
      let url = `${this.baseUrl}/files?key=${apiKey}&pageSize=${pageSize}`;
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }

      const response = await fetch(url, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`List files failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      return {
        files: result.files || [],
        nextPageToken: result.nextPageToken
      };

    } catch (error) {
      console.error('aiFiverr Gemini Files: List files failed:', error);
      throw error;
    }
  }

  /**
   * Delete file from Gemini Files API
   */
  async deleteFile(fileName) {
    try {
      const apiKey = await this.getApiKey();
      
      const response = await fetch(`${this.baseUrl}/${fileName}?key=${apiKey}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Delete file failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      console.log('aiFiverr Gemini Files: File deleted successfully:', fileName);
      return true;

    } catch (error) {
      console.error('aiFiverr Gemini Files: Delete file failed:', error);
      throw error;
    }
  }

  /**
   * Wait for file to be processed (state becomes ACTIVE)
   */
  async waitForFileProcessing(fileName, maxWaitTime = 300000) { // 5 minutes max
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const fileData = await this.getFile(fileName);
        
        if (fileData.state === 'ACTIVE') {
          return fileData;
        } else if (fileData.state === 'FAILED') {
          throw new Error(`File processing failed: ${fileData.error?.message || 'Unknown error'}`);
        }
        
        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error('aiFiverr Gemini Files: Error checking file status:', error);
        throw error;
      }
    }
    
    throw new Error('File processing timeout');
  }
}

// Initialize global instance
if (typeof window !== 'undefined') {
  window.geminiFilesClient = new GeminiFilesClient();
}
