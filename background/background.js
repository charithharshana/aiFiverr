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
    // Load API keys and settings
    await this.loadApiKeys();

    // Load authentication state
    await this.loadAuthState();

    // Set up message listeners
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
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
          const authResult = await this.startGoogleAuth();
          sendResponse(authResult);
          break;

        case 'GOOGLE_AUTH_SIGNOUT':
          const signOutResult = await this.signOutGoogle();
          sendResponse(signOutResult);
          break;

        case 'GOOGLE_AUTH_STATUS':
          sendResponse({
            success: true,
            isAuthenticated: this.isAuthenticated,
            user: this.userInfo
          });
          break;

        case 'GOOGLE_AUTH_TOKEN':
          const token = await this.getValidToken();
          sendResponse({ success: true, token });
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
      const result = await chrome.storage.local.get([
        'google_access_token',
        'google_token_expiry',
        'google_user_info'
      ]);

      this.accessToken = result.google_access_token;
      this.tokenExpiry = result.google_token_expiry;
      this.userInfo = result.google_user_info;

      if (this.userInfo && this.accessToken && this.tokenExpiry) {
        if (Date.now() < this.tokenExpiry) {
          this.isAuthenticated = true;
          console.log('aiFiverr Background: Restored authentication state');
        } else {
          console.log('aiFiverr Background: Token expired, clearing auth');
          await this.clearAuthState();
        }
      }
    } catch (error) {
      console.error('aiFiverr Background: Failed to load auth state:', error);
    }
  }

  async saveAuthState() {
    try {
      await chrome.storage.local.set({
        google_access_token: this.accessToken,
        google_token_expiry: this.tokenExpiry,
        google_user_info: this.userInfo
      });
    } catch (error) {
      console.error('aiFiverr Background: Failed to save auth state:', error);
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
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`);
      }

      this.userInfo = await response.json();
      console.log('aiFiverr Background: User info fetched:', this.userInfo.email);

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
}

// Initialize background manager
new BackgroundManager();
