/**
 * Google Authentication Service for aiFiverr Extension
 * Handles Google OAuth 2.0 authentication, token management, and user session persistence
 */

class GoogleAuthService {
  constructor() {
    this.isAuthenticated = false;
    this.userInfo = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.authListeners = new Set();
    this.init();
  }

  async init() {
    try {
      // Load stored authentication data
      await this.loadStoredAuth();
      
      // Check if stored token is still valid
      if (this.accessToken && this.tokenExpiry) {
        if (Date.now() < this.tokenExpiry) {
          this.isAuthenticated = true;
          console.log('aiFiverr Auth: Using stored valid token');
        } else {
          console.log('aiFiverr Auth: Stored token expired, clearing');
          await this.clearAuth();
        }
      }

      this.initialized = true;
      this.notifyAuthListeners();
    } catch (error) {
      console.error('aiFiverr Auth: Initialization error:', error);
      this.initialized = true;
    }
  }

  /**
   * Load stored authentication data from Chrome storage
   */
  async loadStoredAuth() {
    try {
      const result = await chrome.storage.local.get([
        'google_access_token',
        'google_refresh_token', 
        'google_token_expiry',
        'google_user_info'
      ]);

      this.accessToken = result.google_access_token;
      this.refreshToken = result.google_refresh_token;
      this.tokenExpiry = result.google_token_expiry;
      this.userInfo = result.google_user_info;

      if (this.userInfo) {
        this.isAuthenticated = true;
      }
    } catch (error) {
      console.error('aiFiverr Auth: Failed to load stored auth:', error);
    }
  }

  /**
   * Save authentication data to Chrome storage
   */
  async saveAuth() {
    try {
      await chrome.storage.local.set({
        google_access_token: this.accessToken,
        google_refresh_token: this.refreshToken,
        google_token_expiry: this.tokenExpiry,
        google_user_info: this.userInfo
      });
    } catch (error) {
      console.error('aiFiverr Auth: Failed to save auth:', error);
    }
  }

  /**
   * Clear authentication data
   */
  async clearAuth() {
    this.isAuthenticated = false;
    this.userInfo = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;

    try {
      await chrome.storage.local.remove([
        'google_access_token',
        'google_refresh_token',
        'google_token_expiry', 
        'google_user_info'
      ]);
    } catch (error) {
      console.error('aiFiverr Auth: Failed to clear auth storage:', error);
    }

    this.notifyAuthListeners();
  }

  /**
   * Start Google OAuth 2.0 authentication flow
   */
  async authenticate() {
    try {
      console.log('aiFiverr Auth: Starting authentication flow...');

      // Send message to background script to handle authentication
      const response = await chrome.runtime.sendMessage({
        type: 'GOOGLE_AUTH_START'
      });

      if (response && response.success) {
        // Update local state with authentication data
        this.userInfo = response.user;
        this.isAuthenticated = true;

        // Load the full auth state from storage
        await this.loadStoredAuth();

        this.notifyAuthListeners();

        console.log('aiFiverr Auth: Authentication successful');
        return {
          success: true,
          user: this.userInfo
        };
      } else {
        throw new Error(response?.error || 'Authentication failed');
      }

    } catch (error) {
      console.error('aiFiverr Auth: Authentication failed:', error);
      await this.clearAuth();
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch user information from Google API
   */
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
      console.log('aiFiverr Auth: User info fetched:', this.userInfo.email);

    } catch (error) {
      console.error('aiFiverr Auth: Failed to fetch user info:', error);
      throw error;
    }
  }

  /**
   * Collect user data and store in Google Sheets
   */
  async collectUserData() {
    try {
      if (!this.userInfo) {
        throw new Error('No user info available');
      }

      console.log('aiFiverr Auth: Collecting user data for:', this.userInfo.email);

      // Store user data in Google Sheets using the Google client
      if (window.googleClient) {
        try {
          await window.googleClient.addUserData({
            email: this.userInfo.email,
            name: this.userInfo.name,
            picture: this.userInfo.picture,
            timestamp: new Date().toISOString()
          });
          console.log('aiFiverr Auth: User data stored in Google Sheets');
        } catch (sheetsError) {
          console.warn('aiFiverr Auth: Failed to store in Google Sheets:', sheetsError);
        }
      }

      // Also send to background script for local backup
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'COLLECT_USER_DATA',
          userData: {
            email: this.userInfo.email,
            name: this.userInfo.name,
            picture: this.userInfo.picture,
            timestamp: new Date().toISOString()
          }
        });

        if (!response?.success) {
          console.warn('aiFiverr Auth: Failed to store local backup:', response?.error);
        } else {
          console.log('aiFiverr Auth: User data backed up locally');
        }
      } catch (backupError) {
        console.warn('aiFiverr Auth: Failed to create local backup:', backupError);
      }

    } catch (error) {
      console.error('aiFiverr Auth: Failed to collect user data:', error);
      // Don't throw - this shouldn't block authentication
    }
  }

  /**
   * Sign out user
   */
  async signOut() {
    try {
      // Send message to background script to handle sign out
      const response = await chrome.runtime.sendMessage({
        type: 'GOOGLE_AUTH_SIGNOUT'
      });

      if (response && response.success) {
        // Clear local authentication data
        await this.clearAuth();

        console.log('aiFiverr Auth: Sign out successful');
        return { success: true };
      } else {
        throw new Error(response?.error || 'Sign out failed');
      }

    } catch (error) {
      console.error('aiFiverr Auth: Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    return this.isAuthenticated && this.userInfo && this.accessToken;
  }

  /**
   * Get current user information
   */
  getCurrentUser() {
    return this.userInfo;
  }

  /**
   * Get current access token
   */
  getAccessToken() {
    return this.accessToken;
  }

  /**
   * Add authentication state listener
   */
  addAuthListener(callback) {
    this.authListeners.add(callback);
  }

  /**
   * Remove authentication state listener
   */
  removeAuthListener(callback) {
    this.authListeners.delete(callback);
  }

  /**
   * Notify all authentication listeners
   */
  notifyAuthListeners() {
    this.authListeners.forEach(callback => {
      try {
        callback({
          isAuthenticated: this.isAuthenticated,
          user: this.userInfo
        });
      } catch (error) {
        console.error('aiFiverr Auth: Listener error:', error);
      }
    });
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokenIfNeeded() {
    if (!this.tokenExpiry || Date.now() < this.tokenExpiry - 300000) { // 5 minutes buffer
      return this.accessToken;
    }

    try {
      console.log('aiFiverr Auth: Refreshing token...');

      // Get fresh token from background script
      const response = await chrome.runtime.sendMessage({
        type: 'GOOGLE_AUTH_TOKEN'
      });

      if (response && response.success && response.token) {
        this.accessToken = response.token;
        this.tokenExpiry = Date.now() + (3600 * 1000);
        await this.saveAuth();
        console.log('aiFiverr Auth: Token refreshed successfully');
        return this.accessToken;
      } else {
        console.warn('aiFiverr Auth: Token refresh failed - no valid token from background');
        return this.accessToken;
      }

    } catch (error) {
      console.error('aiFiverr Auth: Token refresh failed:', error);
      // Don't clear auth on refresh failure - just return existing token
      return this.accessToken;
    }
  }
}

// Create global instance
window.googleAuthService = new GoogleAuthService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoogleAuthService;
}
