/**
 * Google Drive API Client for aiFiverr Extension
 * Handles knowledge base file uploads, folder management, and file operations
 */

class GoogleDriveClient {
  constructor() {
    this.baseUrl = "https://www.googleapis.com/drive/v3";
    this.uploadUrl = "https://www.googleapis.com/upload/drive/v3";
    this.aiFiverrFolderName = "aiFiverr Knowledge Base";
    this.aiFiverrFolderId = null;
    this.initialized = false;
    this.init();
  }

  async init() {
    try {
      this.initialized = true;
      console.log('aiFiverr Drive: Client initialized');
    } catch (error) {
      console.error('aiFiverr Drive: Initialization error:', error);
      this.initialized = true;
    }
  }

  /**
   * Get access token from auth service
   */
  async getAccessToken() {
    if (!window.googleAuthService) {
      throw new Error('Google Auth Service not available');
    }

    await window.googleAuthService.refreshTokenIfNeeded();
    return window.googleAuthService.getAccessToken();
  }

  /**
   * Make authenticated request to Google Drive API
   */
  async makeRequest(endpoint, options = {}) {
    const token = await this.getAccessToken();
    
    if (!token) {
      throw new Error('No access token available');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Drive API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create or get aiFiverr knowledge base folder
   */
  async ensureAiFiverrFolder() {
    try {
      if (this.aiFiverrFolderId) {
        return this.aiFiverrFolderId;
      }

      // Search for existing folder
      const searchResponse = await this.makeRequest(`/files?q=name='${this.aiFiverrFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
      
      if (searchResponse.files && searchResponse.files.length > 0) {
        this.aiFiverrFolderId = searchResponse.files[0].id;
        console.log('aiFiverr Drive: Found existing folder:', this.aiFiverrFolderId);
        return this.aiFiverrFolderId;
      }

      // Create new folder
      const createResponse = await this.makeRequest('/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: this.aiFiverrFolderName,
          mimeType: 'application/vnd.google-apps.folder'
        })
      });

      this.aiFiverrFolderId = createResponse.id;
      console.log('aiFiverr Drive: Created new folder:', this.aiFiverrFolderId);
      return this.aiFiverrFolderId;

    } catch (error) {
      console.error('aiFiverr Drive: Failed to ensure folder:', error);
      throw error;
    }
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(file, fileName, description = '') {
    try {
      console.log('aiFiverr Drive: Uploading file:', fileName);

      // Ensure aiFiverr folder exists
      const folderId = await this.ensureAiFiverrFolder();

      // Prepare metadata
      const metadata = {
        name: fileName,
        description: description || `aiFiverr Knowledge Base file uploaded on ${new Date().toISOString()}`,
        parents: [folderId]
      };

      // Create form data for multipart upload
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      const token = await this.getAccessToken();

      const response = await fetch(`${this.uploadUrl}/files?uploadType=multipart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Upload failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('aiFiverr Drive: File uploaded successfully:', result.id);

      return {
        success: true,
        fileId: result.id,
        fileName: result.name,
        webViewLink: result.webViewLink,
        size: file.size,
        mimeType: file.type
      };

    } catch (error) {
      console.error('aiFiverr Drive: Upload failed:', error);
      throw error;
    }
  }

  /**
   * List files in aiFiverr folder
   */
  async listKnowledgeBaseFiles() {
    try {
      const folderId = await this.ensureAiFiverrFolder();

      const response = await this.makeRequest(`/files?q=parents in '${folderId}' and trashed=false&fields=files(id,name,size,mimeType,createdTime,modifiedTime,webViewLink,description)`);

      const files = response.files || [];
      
      console.log('aiFiverr Drive: Found', files.length, 'knowledge base files');

      return files.map(file => ({
        id: file.id,
        name: file.name,
        size: parseInt(file.size) || 0,
        mimeType: file.mimeType,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        description: file.description || ''
      }));

    } catch (error) {
      console.error('aiFiverr Drive: Failed to list files:', error);
      return [];
    }
  }

  /**
   * Download file content
   */
  async downloadFile(fileId) {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      return await response.blob();

    } catch (error) {
      console.error('aiFiverr Drive: Download failed:', error);
      throw error;
    }
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId) {
    try {
      await this.makeRequest(`/files/${fileId}`, {
        method: 'DELETE'
      });

      console.log('aiFiverr Drive: File deleted:', fileId);
      return { success: true };

    } catch (error) {
      console.error('aiFiverr Drive: Delete failed:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId) {
    try {
      const response = await this.makeRequest(`/files/${fileId}?fields=id,name,size,mimeType,createdTime,modifiedTime,webViewLink,description,parents`);
      
      return {
        id: response.id,
        name: response.name,
        size: parseInt(response.size) || 0,
        mimeType: response.mimeType,
        createdTime: response.createdTime,
        modifiedTime: response.modifiedTime,
        webViewLink: response.webViewLink,
        description: response.description || '',
        parents: response.parents || []
      };

    } catch (error) {
      console.error('aiFiverr Drive: Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(fileId, updates) {
    try {
      const response = await this.makeRequest(`/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      console.log('aiFiverr Drive: File metadata updated:', fileId);
      return response;

    } catch (error) {
      console.error('aiFiverr Drive: Failed to update metadata:', error);
      throw error;
    }
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota() {
    try {
      const response = await this.makeRequest('/about?fields=storageQuota');
      
      const quota = response.storageQuota;
      
      return {
        limit: parseInt(quota.limit) || 0,
        usage: parseInt(quota.usage) || 0,
        usageInDrive: parseInt(quota.usageInDrive) || 0,
        usageInDriveTrash: parseInt(quota.usageInDriveTrash) || 0
      };

    } catch (error) {
      console.error('aiFiverr Drive: Failed to get storage quota:', error);
      return {
        limit: 0,
        usage: 0,
        usageInDrive: 0,
        usageInDriveTrash: 0,
        error: error.message
      };
    }
  }

  /**
   * Search files by name or content
   */
  async searchFiles(query) {
    try {
      const folderId = await this.ensureAiFiverrFolder();
      
      const searchQuery = `parents in '${folderId}' and trashed=false and (name contains '${query}' or fullText contains '${query}')`;
      
      const response = await this.makeRequest(`/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name,size,mimeType,createdTime,modifiedTime,webViewLink,description)`);

      return response.files || [];

    } catch (error) {
      console.error('aiFiverr Drive: Search failed:', error);
      return [];
    }
  }

  /**
   * Test connection to Google Drive
   */
  async testConnection() {
    try {
      const response = await this.makeRequest('/about?fields=user,storageQuota');
      
      return {
        success: true,
        user: response.user,
        storageQuota: response.storageQuota
      };

    } catch (error) {
      console.error('aiFiverr Drive: Connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create global instance
window.googleDriveClient = new GoogleDriveClient();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoogleDriveClient;
}
