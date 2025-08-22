/**
 * aiFiverr Background Script
 * Handles API key rotation, session management, cross-tab communication, and Google authentication
 */

class BackgroundManager {
  constructor() {
    this.apiKeys = [];
    this.currentKeyIndex = 0;
    this.keyHealthStatus = new Map();
    this.activeSessions = new Map();

    // Google Authentication properties
    this.isAuthenticated = false;
    this.userInfo = null;
    this.accessToken = null;
    this.tokenExpiry = null;

    this.init();
  }

  async init() {
    console.log('aiFiverr Background: Initializing BackgroundManager...');

    try {
      // Load API keys and settings
      await this.loadApiKeys();
      console.log('aiFiverr Background: API keys loaded');

      // Load authentication state
      await this.loadAuthState();
      console.log('aiFiverr Background: Authentication state loaded, authenticated:', this.isAuthenticated);

      console.log('aiFiverr Background: BackgroundManager initialized successfully');
    } catch (error) {
      console.error('aiFiverr Background: Failed to initialize BackgroundManager:', error);
      // Continue with initialization even if some parts fail
    }

    // Set up message listeners
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('aiFiverr Background: Received message:', request.type, 'from:', sender.tab?.url || 'popup');

      // Handle PING immediately for testing
      if (request.type === 'PING') {
        console.log('aiFiverr Background: Received PING, responding with PONG');
        sendResponse({ success: true, message: 'PONG', timestamp: Date.now() });
        return true;
      }

      // Handle async messages properly
      this.handleMessage(request, sender, sendResponse).catch(error => {
        console.error('aiFiverr Background: Error handling message:', request.type, error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep message channel open for async responses
    });

    // Handle extension installation/update
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Monitor tab updates for Fiverr pages
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url?.includes('fiverr.com')) {
        this.initializeFiverrTab(tabId);
      }
    });
  }

  async loadApiKeys() {
    try {
      const result = await chrome.storage.local.get(['apiKeys', 'keyHealthStatus']);
      this.apiKeys = result.apiKeys || [];
      this.keyHealthStatus = new Map(result.keyHealthStatus || []);
      
      // Initialize health status for new keys
      this.apiKeys.forEach((key, index) => {
        if (!this.keyHealthStatus.has(index)) {
          this.keyHealthStatus.set(index, {
            isHealthy: true,
            lastUsed: null,
            errorCount: 0,
            quotaExhausted: false
          });
        }
      });
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  }

  async saveKeyHealthStatus() {
    try {
      await chrome.storage.local.set({
        keyHealthStatus: Array.from(this.keyHealthStatus.entries())
      });
    } catch (error) {
      console.error('Failed to save key health status:', error);
    }
  }

  getNextHealthyApiKey() {
    if (this.apiKeys.length === 0) {
      return null;
    }

    // Find next healthy key
    let attempts = 0;
    while (attempts < this.apiKeys.length) {
      const keyStatus = this.keyHealthStatus.get(this.currentKeyIndex);
      
      if (keyStatus?.isHealthy && !keyStatus?.quotaExhausted) {
        const key = this.apiKeys[this.currentKeyIndex];
        keyStatus.lastUsed = Date.now();
        this.saveKeyHealthStatus();
        return {
          key,
          index: this.currentKeyIndex
        };
      }

      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      attempts++;
    }

    // If no healthy keys, return the first one anyway
    return {
      key: this.apiKeys[0],
      index: 0
    };
  }

  markKeyUnhealthy(keyIndex, error) {
    const keyStatus = this.keyHealthStatus.get(keyIndex);
    if (keyStatus) {
      keyStatus.errorCount++;

      if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
        keyStatus.quotaExhausted = true;
      }

      if (keyStatus.errorCount >= 3) {
        keyStatus.isHealthy = false;
      }

      this.saveKeyHealthStatus();
    }
  }

  markKeySuccess(keyIndex) {
    const keyStatus = this.keyHealthStatus.get(keyIndex);
    if (keyStatus) {
      keyStatus.lastUsed = Date.now();

      // Reset error count on success
      if (keyStatus.errorCount > 0) {
        keyStatus.errorCount = Math.max(0, keyStatus.errorCount - 1);
      }

      // Mark as healthy if it was unhealthy
      if (!keyStatus.isHealthy && keyStatus.errorCount === 0) {
        keyStatus.isHealthy = true;
      }

      this.saveKeyHealthStatus();
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      console.log('aiFiverr Background: Handling message:', request.type);

      switch (request.type) {
        case 'GET_API_KEY':
          const keyData = this.getNextHealthyApiKey();
          sendResponse({ success: true, data: keyData });
          break;

        case 'MARK_KEY_UNHEALTHY':
          this.markKeyUnhealthy(request.keyIndex, request.error);
          sendResponse({ success: true });
          break;

        case 'MARK_KEY_SUCCESS':
          this.markKeySuccess(request.keyIndex);
          sendResponse({ success: true });
          break;

        case 'UPDATE_API_KEYS':
          await this.updateApiKeys(request.keys);
          sendResponse({ success: true });
          break;

        case 'GET_SESSION':
          const session = await this.getSession(request.sessionId);
          sendResponse({ success: true, data: session });
          break;

        case 'SAVE_SESSION':
          await this.saveSession(request.sessionId, request.sessionData);
          sendResponse({ success: true });
          break;

        case 'EXPORT_DATA':
          const exportData = await this.exportAllData();
          sendResponse({ success: true, data: exportData });
          break;

        case 'IMPORT_DATA':
          await this.importAllData(request.data);
          sendResponse({ success: true });
          break;

        case 'COLLECT_USER_DATA':
          await this.collectUserData(request.userData);
          sendResponse({ success: true });
          break;

        case 'GOOGLE_AUTH_START':
          console.log('aiFiverr Background: Starting Google auth...');
          try {
            const authResult = await this.startGoogleAuth();
            console.log('aiFiverr Background: Auth result:', authResult);
            sendResponse(authResult);
          } catch (error) {
            console.error('aiFiverr Background: Auth start error:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GOOGLE_AUTH_SIGNOUT':
          console.log('aiFiverr Background: Starting Google sign out...');
          try {
            const signOutResult = await this.signOutGoogle();
            console.log('aiFiverr Background: Sign out result:', signOutResult);
            sendResponse(signOutResult);
          } catch (error) {
            console.error('aiFiverr Background: Sign out error:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GOOGLE_AUTH_STATUS':
          console.log('aiFiverr Background: Auth status requested');
          console.log('aiFiverr Background: Current auth state - authenticated:', this.isAuthenticated, 'user:', this.userInfo);

          try {
            // Ensure we have a proper response structure
            const authResponse = {
              success: true,
              isAuthenticated: Boolean(this.isAuthenticated),
              user: this.userInfo || null
            };

            console.log('aiFiverr Background: Sending auth response:', authResponse);
            sendResponse(authResponse);
          } catch (error) {
            console.error('aiFiverr Background: Auth status error:', error);
            sendResponse({ success: false, error: error.message, isAuthenticated: false, user: null });
          }
          break;

        case 'GOOGLE_AUTH_TOKEN':
          console.log('aiFiverr Background: Token requested');
          try {
            const token = await this.getValidToken();
            console.log('aiFiverr Background: Token result:', token ? 'Token available' : 'No token');
            sendResponse({ success: true, token });
          } catch (error) {
            console.error('aiFiverr Background: Token error:', error);
            sendResponse({ success: false, error: error.message, token: null });
          }
          break;

        // Knowledge Base Files handlers
        case 'GET_KNOWLEDGE_BASE_FILES':
          const kbFiles = await this.getKnowledgeBaseFiles();
          sendResponse(kbFiles);
          break;

        case 'UPLOAD_FILE_TO_DRIVE':
          const driveUploadResult = await this.uploadFileToDrive(request);
          sendResponse(driveUploadResult);
          break;

        case 'UPLOAD_FILE_TO_GEMINI':
          const geminiUploadResult = await this.uploadFileToGemini(request);
          sendResponse(geminiUploadResult);
          break;

        case 'UPDATE_FILE_REFERENCE_GEMINI_URI':
          const updateResult = await this.updateFileReferenceWithGeminiUri(request);
          sendResponse(updateResult);
          break;

        case 'GET_DRIVE_FILES':
          console.log('aiFiverr Background: Getting Drive files...');
          const driveFiles = await this.getDriveFiles();
          console.log('aiFiverr Background: Drive files result:', driveFiles);
          sendResponse(driveFiles);
          break;

        case 'GET_GEMINI_FILES':
          console.log('aiFiverr Background: Getting Gemini files...');
          const geminiFiles = await this.getGeminiFiles();
          console.log('aiFiverr Background: Gemini files result:', geminiFiles);
          sendResponse(geminiFiles);
          break;

        case 'GET_FILE_DETAILS':
          const fileDetails = await this.getFileDetails(request.fileId);
          sendResponse(fileDetails);
          break;

        case 'DELETE_DRIVE_FILE':
          const deleteResult = await this.deleteDriveFile(request.fileId);
          sendResponse(deleteResult);
          break;

        case 'SEARCH_DRIVE_FILES':
          const searchResults = await this.searchDriveFiles(request.query);
          sendResponse(searchResults);
          break;

        case 'UPDATE_FILE_METADATA':
          const metadataUpdateResult = await this.updateFileMetadata(request.fileId, request.metadata);
          sendResponse(metadataUpdateResult);
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async updateApiKeys(newKeys) {
    this.apiKeys = newKeys;
    this.currentKeyIndex = 0;
    this.keyHealthStatus.clear();
    
    // Initialize health status for all keys
    newKeys.forEach((key, index) => {
      this.keyHealthStatus.set(index, {
        isHealthy: true,
        lastUsed: null,
        errorCount: 0,
        quotaExhausted: false
      });
    });

    await chrome.storage.local.set({ apiKeys: newKeys });
    await this.saveKeyHealthStatus();
  }

  async getSession(sessionId) {
    const result = await chrome.storage.local.get([`session_${sessionId}`]);
    return result[`session_${sessionId}`] || null;
  }

  async saveSession(sessionId, sessionData) {
    await chrome.storage.local.set({
      [`session_${sessionId}`]: sessionData
    });
  }

  async exportAllData() {
    const allData = await chrome.storage.local.get(null);
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      data: allData
    };
  }

  async importAllData(importData) {
    if (importData.version && importData.data) {
      await chrome.storage.local.clear();
      await chrome.storage.local.set(importData.data);
      await this.loadApiKeys();
    }
  }

  async initializeFiverrTab(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Signal that the extension is ready
          window.postMessage({ type: 'AIFIVERR_READY' }, '*');
        }
      });
    } catch (error) {
      console.error('Failed to initialize Fiverr tab:', error);
    }
  }

  async collectUserData(userData) {
    try {
      console.log('aiFiverr Background: Collecting user data for:', userData.email);

      // Store user data locally for backup
      const userDataKey = `user_data_${userData.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await chrome.storage.local.set({
        [userDataKey]: {
          ...userData,
          collectedAt: Date.now()
        }
      });

      // Note: Google Sheets integration will be handled by content script
      // This is just for local storage backup
      console.log('aiFiverr Background: User data stored locally');

    } catch (error) {
      console.error('aiFiverr Background: Failed to collect user data:', error);
      throw error;
    }
  }

  handleInstallation(details) {
    if (details.reason === 'install') {
      // First time installation
      chrome.tabs.create({
        url: chrome.runtime.getURL('popup/welcome.html')
      });
    }
  }

  // Google Authentication Methods
  async loadAuthState() {
    try {
      console.log('aiFiverr Background: Loading authentication state from storage...');

      const result = await chrome.storage.local.get([
        'google_access_token',
        'google_token_expiry',
        'google_user_info'
      ]);

      console.log('aiFiverr Background: Storage result:', {
        hasToken: !!result.google_access_token,
        hasExpiry: !!result.google_token_expiry,
        hasUserInfo: !!result.google_user_info,
        userEmail: result.google_user_info?.email
      });

      this.accessToken = result.google_access_token || null;
      this.tokenExpiry = result.google_token_expiry || null;
      this.userInfo = result.google_user_info || null;

      if (this.userInfo && this.accessToken && this.tokenExpiry) {
        if (Date.now() < this.tokenExpiry) {
          this.isAuthenticated = true;
          console.log('aiFiverr Background: Restored authentication state for user:', this.userInfo.email);
        } else {
          console.log('aiFiverr Background: Token expired, clearing auth state');
          await this.clearAuthState();
        }
      } else {
        console.log('aiFiverr Background: No valid authentication state found');
        this.isAuthenticated = false;
      }
    } catch (error) {
      console.error('aiFiverr Background: Failed to load auth state:', error);
      this.isAuthenticated = false;
    }
  }

  async saveAuthState() {
    try {
      console.log('aiFiverr Background: Saving authentication state to storage...');

      const authData = {
        google_access_token: this.accessToken,
        google_token_expiry: this.tokenExpiry,
        google_user_info: this.userInfo
      };

      console.log('aiFiverr Background: Saving auth data:', {
        hasToken: !!authData.google_access_token,
        hasExpiry: !!authData.google_token_expiry,
        hasUserInfo: !!authData.google_user_info,
        userEmail: authData.google_user_info?.email
      });

      await chrome.storage.local.set(authData);
      console.log('aiFiverr Background: Authentication state saved successfully');
    } catch (error) {
      console.error('aiFiverr Background: Failed to save auth state:', error);
      throw error;
    }
  }

  async clearAuthState() {
    this.isAuthenticated = false;
    this.userInfo = null;
    this.accessToken = null;
    this.tokenExpiry = null;

    try {
      await chrome.storage.local.remove([
        'google_access_token',
        'google_token_expiry',
        'google_user_info'
      ]);
    } catch (error) {
      console.error('aiFiverr Background: Failed to clear auth state:', error);
    }
  }

  async startGoogleAuth() {
    try {
      console.log('aiFiverr Background: Starting Google authentication...');

      // Check if chrome.identity is available
      if (!chrome.identity) {
        throw new Error('Chrome identity API not available');
      }

      // Check if we're on Microsoft Edge and handle differently
      if (this.isEdgeBrowser()) {
        return await this.startEdgeAuth();
      }

      // Get OAuth token using Chrome identity API
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({
          interactive: true,
          scopes: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file'
          ]
        }, (token) => {
          if (chrome.runtime.lastError) {
            console.error('aiFiverr Background: Chrome runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!token) {
            reject(new Error('No authentication token received'));
          } else {
            resolve(token);
          }
        });
      });

      console.log('aiFiverr Background: Token received successfully');
      this.accessToken = token;
      this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour from now

      // Get user info from Google API
      await this.fetchUserInfo();

      // Save authentication state
      await this.saveAuthState();

      // Collect user data in Google Sheets
      await this.collectUserDataInSheets();

      this.isAuthenticated = true;

      console.log('aiFiverr Background: Authentication successful');
      return {
        success: true,
        user: this.userInfo
      };

    } catch (error) {
      console.error('aiFiverr Background: Authentication failed:', error);
      await this.clearAuthState();
      return {
        success: false,
        error: error.message
      };
    }
  }

  async fetchUserInfo() {
    try {
      console.log('aiFiverr Background: Fetching user info with token:', this.accessToken ? 'Token available' : 'No token');

      if (!this.accessToken) {
        throw new Error('No access token available for user info fetch');
      }

      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      console.log('aiFiverr Background: User info response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('aiFiverr Background: User info fetch error response:', errorText);
        throw new Error(`Failed to fetch user info: ${response.status} - ${errorText}`);
      }

      this.userInfo = await response.json();
      console.log('aiFiverr Background: User info fetched successfully:', this.userInfo.email);

    } catch (error) {
      console.error('aiFiverr Background: Failed to fetch user info:', error);
      throw error;
    }
  }

  async collectUserDataInSheets() {
    try {
      if (!this.userInfo) {
        throw new Error('No user info available');
      }

      console.log('aiFiverr Background: Collecting user data for:', this.userInfo.email);

      // Store user data in Google Sheets
      const spreadsheetId = '15qpoZbgOQnKQr52X-oXF6_euBGHflKuxHaW6xAmROAY';
      const range = 'Sheet1!A:E';

      const values = [[
        this.userInfo.email,
        this.userInfo.name,
        this.userInfo.picture || '',
        new Date().toISOString(),
        'Active' // Status column
      ]];

      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: values
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to store user data in Google Sheets: ${response.status} - ${errorText}`);
      }

      console.log('aiFiverr Background: User data stored in Google Sheets successfully');

    } catch (error) {
      console.error('aiFiverr Background: Failed to collect user data in sheets:', error);
      // Don't throw - this shouldn't block authentication
    }
  }

  async signOutGoogle() {
    try {
      // Revoke token with Google
      if (this.accessToken) {
        chrome.identity.removeCachedAuthToken({ token: this.accessToken }, () => {
          console.log('aiFiverr Background: Token revoked');
        });
      }

      // Clear authentication state
      await this.clearAuthState();

      console.log('aiFiverr Background: Sign out successful');
      return { success: true };

    } catch (error) {
      console.error('aiFiverr Background: Sign out failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getValidToken() {
    if (!this.accessToken || !this.tokenExpiry) {
      return null;
    }

    // Check if token is still valid (with 5 minute buffer)
    if (Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    // Try to refresh token
    try {
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({
          interactive: false,
          scopes: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file'
          ]
        }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token);
          }
        });
      });

      if (token) {
        this.accessToken = token;
        this.tokenExpiry = Date.now() + (3600 * 1000);
        await this.saveAuthState();
        console.log('aiFiverr Background: Token refreshed successfully');
      }

      return this.accessToken;

    } catch (error) {
      console.error('aiFiverr Background: Token refresh failed:', error);
      return this.accessToken; // Return existing token even if refresh failed
    }
  }

  // Microsoft Edge Compatibility Methods
  isEdgeBrowser() {
    const userAgent = navigator.userAgent;
    return userAgent.includes('Edg/') || userAgent.includes('Edge/');
  }

  async startEdgeAuth() {
    try {
      console.log('aiFiverr Background: Microsoft Edge detected - using alternative authentication...');

      // For Edge, we'll provide a helpful error message and instructions
      const errorMessage = `Microsoft Edge Compatibility Notice:

aiFiverr extension works best with Google Chrome due to API limitations in Microsoft Edge.

For the best experience, please:
1. Install Google Chrome (if not already installed)
2. Add the aiFiverr extension to Chrome
3. Use the extension in Chrome for full functionality

Alternative: You can still use basic features without Google authentication, but some advanced features (like Google Drive integration and data sync) will not be available.

Would you like to continue without authentication or switch to Chrome?`;

      return {
        success: false,
        error: errorMessage,
        isEdgeCompatibilityIssue: true
      };

    } catch (error) {
      console.error('aiFiverr Background: Edge authentication failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  buildOAuthUrl() {
    const clientId = '739505516931-1n14m09895iii7n0q6fk9p4sadm5viln.apps.googleusercontent.com';
    const redirectUri = chrome.identity.getRedirectURL();
    const scope = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    try {
      const clientId = '739505516931-1n14m09895iii7n0q6fk9p4sadm5viln.apps.googleusercontent.com';
      const redirectUri = chrome.identity.getRedirectURL();

      // Note: In a real implementation, you'd need a backend server to handle this
      // because the client secret should not be exposed in the extension
      // For now, we'll show an error message directing users to use Chrome
      throw new Error('Edge authentication requires additional setup. Please use Google Chrome for now, or contact support for Edge compatibility.');

    } catch (error) {
      console.error('aiFiverr Background: Token exchange failed:', error);
      throw error;
    }
  }

  // Knowledge Base Files Methods
  async getKnowledgeBaseFiles() {
    try {
      // Get files from both Google Drive and Gemini
      const driveFiles = await this.getDriveFiles();
      const geminiFiles = await this.getGeminiFiles();

      if (driveFiles.success && geminiFiles.success) {
        // Merge file data
        const mergedFiles = this.mergeFileData(driveFiles.data, geminiFiles.data);
        return { success: true, data: mergedFiles };
      } else {
        return driveFiles.success ? driveFiles : geminiFiles;
      }
    } catch (error) {
      console.error('aiFiverr Background: Failed to get knowledge base files:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadFileToDrive(request) {
    try {
      if (!this.isAuthenticated) {
        return { success: false, error: 'Not authenticated with Google' };
      }

      const token = await this.getValidToken();
      if (!token) {
        return { success: false, error: 'Failed to get valid access token' };
      }

      // Get file data (already base64 from popup)
      const fileData = request.file.data;

      // Enhanced metadata with knowledge base specific properties
      const metadata = {
        name: request.fileName,
        description: `aiFiverr Knowledge Base file uploaded on ${new Date().toISOString()}`,
        mimeType: request.file.type,
        properties: {
          'aiFiverr_type': 'knowledge_base',
          'aiFiverr_upload_date': new Date().toISOString(),
          'aiFiverr_file_size': request.file.size.toString(),
          'aiFiverr_mime_type': request.file.type
        }
      };

      // Use resumable upload for better reliability
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Metadata upload failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const fileMetadata = await response.json();

      // Convert base64 to binary for upload
      const binaryData = atob(fileData);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }

      // Upload file content
      const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileMetadata.id}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': request.file.type
        },
        body: bytes
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(`File upload failed: ${uploadResponse.status} - ${errorData.error?.message || uploadResponse.statusText}`);
      }

      const result = await uploadResponse.json();
      console.log('aiFiverr Background: File uploaded to Drive successfully:', result.id);

      return {
        success: true,
        data: {
          id: result.id,
          name: result.name,
          mimeType: result.mimeType,
          size: result.size,
          webViewLink: result.webViewLink,
          createdTime: result.createdTime,
          modifiedTime: result.modifiedTime
        }
      };
    } catch (error) {
      console.error('aiFiverr Background: Drive upload failed:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadFileToGemini(request) {
    try {
      const apiKey = await this.getGeminiApiKey();
      if (!apiKey) {
        return { success: false, error: 'No Gemini API key available' };
      }

      // Validate file type
      const mimeType = request.file.type || this.getMimeTypeFromExtension(request.file.name);
      if (!this.isSupportedGeminiFileType(mimeType)) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Check file size (2GB limit)
      if (request.file.size > 2 * 1024 * 1024 * 1024) {
        throw new Error('File size exceeds 2GB limit');
      }

      // Get file data (already base64 from popup)
      const fileData = request.file.data;

      // Prepare metadata
      const metadata = {
        file: {
          displayName: request.displayName || request.file.name
        }
      };

      // Use simple upload for Gemini - create proper multipart body
      const boundary = '----formdata-boundary-' + Math.random().toString(36);

      // Convert base64 to binary
      const binaryData = atob(fileData);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }

      // Create multipart body manually
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const parts = [
        encoder.encode(`--${boundary}\r\n`),
        encoder.encode('Content-Type: application/json; charset=UTF-8\r\n\r\n'),
        encoder.encode(JSON.stringify(metadata) + '\r\n'),
        encoder.encode(`--${boundary}\r\n`),
        encoder.encode(`Content-Type: ${mimeType}\r\n\r\n`),
        bytes,
        encoder.encode(`\r\n--${boundary}--\r\n`)
      ];

      // Combine all parts
      const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
      const body = new Uint8Array(totalLength);
      let offset = 0;
      for (const part of parts) {
        body.set(part, offset);
        offset += part.length;
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: body
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Upload failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('aiFiverr Background: File uploaded to Gemini successfully:', result.file.name);

      return {
        success: true,
        data: {
          name: result.file.name,
          displayName: result.file.displayName,
          mimeType: result.file.mimeType,
          sizeBytes: result.file.sizeBytes,
          uri: result.file.uri,
          state: result.file.state,
          createTime: result.file.createTime
        }
      };
    } catch (error) {
      console.error('aiFiverr Background: Gemini upload failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getDriveFiles() {
    try {
      if (!this.isAuthenticated) {
        return { success: false, error: 'Not authenticated with Google' };
      }

      const token = await this.getValidToken();
      if (!token) {
        return { success: false, error: 'Failed to get valid access token' };
      }

      // Query for aiFiverr knowledge base files
      const query = "properties has {key='aiFiverr_type' and value='knowledge_base'} and trashed=false";
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,properties)&orderBy=modifiedTime desc`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to get files: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('aiFiverr Background: Retrieved', result.files?.length || 0, 'files from Drive');

      return {
        success: true,
        data: result.files || []
      };
    } catch (error) {
      console.error('aiFiverr Background: Failed to get Drive files:', error);
      return { success: false, error: error.message };
    }
  }

  async getGeminiFiles() {
    try {
      const apiKey = await this.getGeminiApiKey();
      if (!apiKey) {
        return { success: false, error: 'No Gemini API key available' };
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/files?key=${apiKey}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to get files: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('aiFiverr Background: Retrieved', result.files?.length || 0, 'files from Gemini');

      return {
        success: true,
        data: result.files || []
      };
    } catch (error) {
      console.error('aiFiverr Background: Failed to get Gemini files:', error);
      return { success: false, error: error.message };
    }
  }

  async getFileDetails(fileId) {
    try {
      if (!this.isAuthenticated) {
        return { success: false, error: 'Not authenticated with Google' };
      }

      const token = await this.getValidToken();
      if (!token) {
        return { success: false, error: 'Failed to get valid access token' };
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,properties`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to get file details: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('aiFiverr Background: Failed to get file details:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteDriveFile(fileId) {
    try {
      if (!this.isAuthenticated) {
        return { success: false, error: 'Not authenticated with Google' };
      }

      const token = await this.getValidToken();
      if (!token) {
        return { success: false, error: 'Failed to get valid access token' };
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to delete file: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      console.log('aiFiverr Background: File deleted successfully:', fileId);
      return { success: true, data: { deleted: fileId } };
    } catch (error) {
      console.error('aiFiverr Background: Failed to delete file:', error);
      return { success: false, error: error.message };
    }
  }

  async searchDriveFiles(query) {
    try {
      if (!this.isAuthenticated) {
        return { success: false, error: 'Not authenticated with Google' };
      }

      const token = await this.getValidToken();
      if (!token) {
        return { success: false, error: 'Failed to get valid access token' };
      }

      // Build search query for aiFiverr knowledge base files
      const searchQuery = `properties has {key='aiFiverr_type' and value='knowledge_base'} and trashed=false and (name contains '${query}' or fullText contains '${query}')`;

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,properties)&orderBy=modifiedTime desc`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to search files: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('aiFiverr Background: Found', result.files?.length || 0, 'files matching query:', query);

      return { success: true, data: result.files || [] };
    } catch (error) {
      console.error('aiFiverr Background: Failed to search files:', error);
      return { success: false, error: error.message };
    }
  }

  async updateFileMetadata(fileId, metadata) {
    try {
      if (!this.isAuthenticated) {
        return { success: false, error: 'Not authenticated with Google' };
      }

      const token = await this.getValidToken();
      if (!token) {
        return { success: false, error: 'Failed to get valid access token' };
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to update file metadata: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('aiFiverr Background: Failed to update file metadata:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods for file operations
  async getGeminiApiKey() {
    try {
      const keyData = this.getNextHealthyApiKey();
      return keyData?.key || null;
    } catch (error) {
      console.error('aiFiverr Background: Failed to get Gemini API key:', error);
      return null;
    }
  }

  async updateFileReferenceWithGeminiUri(request) {
    try {
      console.log('aiFiverr Background: Updating file reference with Gemini URI:', request.fileId);

      // Get current knowledge base files
      const result = await chrome.storage.local.get('knowledgeBaseFiles');
      const knowledgeBaseFiles = result.knowledgeBaseFiles || {};

      // Find and update the file reference
      if (knowledgeBaseFiles[request.fileId]) {
        knowledgeBaseFiles[request.fileId] = {
          ...knowledgeBaseFiles[request.fileId],
          ...request.geminiData
        };

        // Save back to storage
        await chrome.storage.local.set({ knowledgeBaseFiles });

        console.log('aiFiverr Background: File reference updated successfully:', request.fileId);
        return { success: true };
      } else {
        console.warn('aiFiverr Background: File reference not found:', request.fileId);
        return { success: false, error: 'File reference not found' };
      }
    } catch (error) {
      console.error('aiFiverr Background: Failed to update file reference:', error);
      return { success: false, error: error.message };
    }
  }

  getMimeTypeFromExtension(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypeMap = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'js': 'application/javascript',
      'py': 'text/x-python',
      'html': 'text/html',
      'css': 'text/css',
      'json': 'application/json',
      'xml': 'application/xml'
    };

    return mimeTypeMap[ext] || 'application/octet-stream';
  }

  isSupportedGeminiFileType(mimeType) {
    const supportedTypes = [
      // Text
      'text/plain', 'text/html', 'text/css', 'text/javascript', 'text/x-typescript',
      'text/csv', 'text/markdown', 'text/x-python', 'text/x-java-source',
      // Documents
      'application/pdf', 'application/rtf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Images
      'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
      // Audio
      'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
      // Video
      'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg',
      'video/webm', 'video/wmv', 'video/3gpp'
    ];

    return supportedTypes.includes(mimeType);
  }

  mergeFileData(driveFiles, geminiFiles) {
    const merged = [];
    const geminiFileMap = new Map();

    // Create map of Gemini files by display name
    if (geminiFiles && Array.isArray(geminiFiles)) {
      geminiFiles.forEach(file => {
        geminiFileMap.set(file.displayName, file);
      });
    }

    // Merge Drive files with Gemini data
    if (driveFiles && Array.isArray(driveFiles)) {
      driveFiles.forEach(driveFile => {
        const geminiFile = geminiFileMap.get(driveFile.name);
        merged.push({
          ...driveFile,
          geminiFile: geminiFile,
          geminiStatus: geminiFile ? geminiFile.state : 'not_uploaded'
        });
      });
    }

    return merged;
  }

  // Helper method to convert file to base64
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove the data URL prefix (data:mime/type;base64,)
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Initialize background manager
console.log('aiFiverr Background: Creating BackgroundManager instance...');
const backgroundManager = new BackgroundManager();
console.log('aiFiverr Background: BackgroundManager instance created');
