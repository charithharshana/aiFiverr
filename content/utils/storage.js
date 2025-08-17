/**
 * Storage utilities for aiFiverr extension
 * Handles persistent storage of chat sessions, settings, and user data
 */

class StorageManager {
  constructor() {
    this.cache = new Map();
    this.syncInProgress = false;
  }

  /**
   * Get data from storage with caching
   */
  async get(keys) {
    try {
      // Check cache first
      if (typeof keys === 'string') {
        if (this.cache.has(keys)) {
          return { [keys]: this.cache.get(keys) };
        }
      }

      const result = await chrome.storage.local.get(keys);
      
      // Update cache
      if (typeof keys === 'string') {
        this.cache.set(keys, result[keys]);
      } else if (Array.isArray(keys)) {
        keys.forEach(key => {
          this.cache.set(key, result[key]);
        });
      } else {
        Object.entries(result).forEach(([key, value]) => {
          this.cache.set(key, value);
        });
      }

      return result;
    } catch (error) {
      console.error('Storage get error:', error);
      return {};
    }
  }

  /**
   * Set data in storage and update cache
   */
  async set(data) {
    try {
      await chrome.storage.local.set(data);
      
      // Update cache
      Object.entries(data).forEach(([key, value]) => {
        this.cache.set(key, value);
      });

      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  /**
   * Remove data from storage and cache
   */
  async remove(keys) {
    try {
      await chrome.storage.local.remove(keys);
      
      // Update cache
      const keyArray = Array.isArray(keys) ? keys : [keys];
      keyArray.forEach(key => {
        this.cache.delete(key);
      });

      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  /**
   * Clear all storage and cache
   */
  async clear() {
    try {
      await chrome.storage.local.clear();
      this.cache.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  /**
   * Get all storage data
   */
  async getAll() {
    try {
      return await chrome.storage.local.get(null);
    } catch (error) {
      console.error('Storage getAll error:', error);
      return {};
    }
  }

  /**
   * Get storage usage information
   */
  async getUsage() {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB default
      return {
        used: usage,
        quota: quota,
        percentage: (usage / quota) * 100
      };
    } catch (error) {
      console.error('Storage usage error:', error);
      return { used: 0, quota: 0, percentage: 0 };
    }
  }

  /**
   * Session-specific storage methods
   */
  async getSession(sessionId) {
    const result = await this.get(`session_${sessionId}`);
    return result[`session_${sessionId}`] || null;
  }

  async saveSession(sessionId, sessionData) {
    return await this.set({
      [`session_${sessionId}`]: {
        ...sessionData,
        lastUpdated: Date.now()
      }
    });
  }

  async getAllSessions() {
    const allData = await this.getAll();
    const sessions = {};
    
    Object.keys(allData).forEach(key => {
      if (key.startsWith('session_')) {
        sessions[key] = allData[key];
      }
    });
    
    return sessions;
  }

  async deleteSession(sessionId) {
    return await this.remove(`session_${sessionId}`);
  }

  /**
   * Settings storage methods
   */
  async getSettings() {
    const result = await this.get('settings');
    return result.settings || this.getDefaultSettings();
  }

  async saveSettings(settings) {
    return await this.set({ settings });
  }

  getDefaultSettings() {
    return {
      apiKeys: [],
      defaultModel: 'gemini-1.5-flash',
      autoSave: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      maxSessions: 50,
      exportFormat: 'json',
      theme: 'auto',
      notifications: true,
      keyRotation: true,
      conversationContext: true,
      maxContextLength: 10000
    };
  }

  /**
   * Knowledge base storage methods
   */
  async getKnowledgeBase() {
    const result = await this.get('knowledgeBase');
    return result.knowledgeBase || {};
  }

  async saveKnowledgeBase(knowledgeBase) {
    return await this.set({ knowledgeBase });
  }

  async addKnowledgeItem(key, value) {
    const kb = await this.getKnowledgeBase();
    kb[key] = value;
    return await this.saveKnowledgeBase(kb);
  }

  async removeKnowledgeItem(key) {
    const kb = await this.getKnowledgeBase();
    delete kb[key];
    return await this.saveKnowledgeBase(kb);
  }

  /**
   * Export/Import functionality
   */
  async exportData() {
    const allData = await this.getAll();
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      data: allData
    };
  }

  async importData(importData) {
    try {
      if (!importData.version || !importData.data) {
        throw new Error('Invalid import data format');
      }

      // Clear existing data
      await this.clear();
      
      // Import new data
      await chrome.storage.local.set(importData.data);
      
      // Clear cache to force reload
      this.cache.clear();
      
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }

  /**
   * Cleanup old sessions
   */
  async cleanupOldSessions() {
    const settings = await this.getSettings();
    const sessions = await this.getAllSessions();
    const now = Date.now();
    const timeout = settings.sessionTimeout;
    
    const sessionsToDelete = [];
    
    Object.entries(sessions).forEach(([key, session]) => {
      if (session.lastUpdated && (now - session.lastUpdated) > timeout) {
        sessionsToDelete.push(key);
      }
    });

    // Keep only the most recent sessions if we exceed the limit
    const sessionEntries = Object.entries(sessions)
      .sort(([,a], [,b]) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
    
    if (sessionEntries.length > settings.maxSessions) {
      const excessSessions = sessionEntries.slice(settings.maxSessions);
      excessSessions.forEach(([key]) => {
        if (!sessionsToDelete.includes(key)) {
          sessionsToDelete.push(key);
        }
      });
    }

    if (sessionsToDelete.length > 0) {
      await this.remove(sessionsToDelete);
    }

    return sessionsToDelete.length;
  }

  /**
   * Sync data across tabs
   */
  async syncAcrossTabs() {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    
    try {
      // Clear cache to force fresh data
      this.cache.clear();
      
      // Broadcast sync event to other tabs
      chrome.runtime.sendMessage({
        type: 'STORAGE_SYNC',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }
}

// Create global storage manager instance
window.storageManager = new StorageManager();
