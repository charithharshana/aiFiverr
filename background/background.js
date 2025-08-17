/**
 * aiFiverr Background Script
 * Handles API key rotation, session management, and cross-tab communication
 */

class BackgroundManager {
  constructor() {
    this.apiKeys = [];
    this.currentKeyIndex = 0;
    this.keyHealthStatus = new Map();
    this.activeSessions = new Map();
    this.init();
  }

  async init() {
    // Load API keys and settings
    await this.loadApiKeys();
    
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

  handleInstallation(details) {
    if (details.reason === 'install') {
      // First time installation
      chrome.tabs.create({
        url: chrome.runtime.getURL('popup/welcome.html')
      });
    }
  }
}

// Initialize background manager
new BackgroundManager();
