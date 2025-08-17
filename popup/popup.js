/**
 * aiFiverr Popup Script
 * Handles popup interface interactions and communication with content scripts
 */

class PopupManager {
  constructor() {
    this.currentTab = 'dashboard';
    this.currentTabId = null;
    this.isLoading = false;
    this.init();
  }

  async init() {
    try {
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTabId = tabs[0]?.id;

      // Set up event listeners
      this.setupEventListeners();

      // Initialize UI
      await this.initializeUI();

      // Load initial data
      await this.loadDashboardData();
    } catch (error) {
      console.error('Popup initialization failed:', error);
      this.showToast('Failed to initialize popup', 'error');
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Dashboard actions
    document.getElementById('extractConversation')?.addEventListener('click', () => {
      this.extractConversation();
    });

    document.getElementById('generateReply')?.addEventListener('click', () => {
      this.generateReply();
    });

    document.getElementById('analyzeMessage')?.addEventListener('click', () => {
      this.analyzeMessage();
    });

    document.getElementById('openFloatingWidget')?.addEventListener('click', () => {
      this.openFloatingWidget();
    });

    // Settings actions
    document.getElementById('saveApiKeys')?.addEventListener('click', () => {
      this.saveApiKeys();
    });

    document.getElementById('testApiKeys')?.addEventListener('click', () => {
      this.testApiKeys();
    });

    document.getElementById('addKnowledgeItem')?.addEventListener('click', () => {
      this.addKnowledgeItem();
    });

    // Export/Import actions
    document.getElementById('exportAllData')?.addEventListener('click', () => {
      this.exportData('all');
    });

    document.getElementById('exportSessions')?.addEventListener('click', () => {
      this.exportData('sessions');
    });

    document.getElementById('fileDropZone')?.addEventListener('click', () => {
      document.getElementById('importFile').click();
    });

    document.getElementById('importFile')?.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files[0]);
    });

    document.getElementById('importData')?.addEventListener('click', () => {
      this.importData();
    });

    // Drag and drop
    const dropZone = document.getElementById('fileDropZone');
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
          this.handleFileSelect(file);
        }
      });
    }

    // Preferences
    document.querySelectorAll('#settings input[type="checkbox"], #settings input[type="number"]').forEach(input => {
      input.addEventListener('change', () => {
        this.savePreferences();
      });
    });
  }

  async initializeUI() {
    // Load settings
    await this.loadSettings();
    
    // Load sessions
    await this.loadSessions();
    
    // Update status
    this.updateStatus();
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    this.currentTab = tabName;

    // Load tab-specific data
    switch (tabName) {
      case 'dashboard':
        this.loadDashboardData();
        break;
      case 'sessions':
        this.loadSessions();
        break;
      case 'settings':
        this.loadSettings();
        break;
    }
  }

  async loadDashboardData() {
    try {
      // Get page info
      const pageInfo = await this.sendMessageToTab({ type: 'GET_PAGE_INFO' });
      
      // Update stats
      await this.updateStats();
      
      // Update activity
      this.updateActivity();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }

  async updateStats() {
    try {
      // Get session count
      const sessions = await this.getStorageData('sessions');
      const sessionCount = sessions ? Object.keys(sessions).length : 0;
      document.getElementById('totalSessions').textContent = sessionCount;

      // Get API key stats
      const apiKeyStats = await this.sendMessageToBackground({ type: 'GET_API_KEY_STATS' });
      if (apiKeyStats?.success) {
        document.getElementById('healthyKeys').textContent = apiKeyStats.data.healthyKeys || 0;
        document.getElementById('totalRequests').textContent = apiKeyStats.data.totalRequests || 0;
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  updateActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;

    // For now, show welcome message
    // In a real implementation, this would show recent AI interactions
    activityList.innerHTML = `
      <div class="activity-item">
        <div class="activity-icon">💬</div>
        <div class="activity-content">
          <div class="activity-title">Welcome to aiFiverr!</div>
          <div class="activity-time">Just now</div>
        </div>
      </div>
    `;
  }

  updateStatus() {
    const statusText = document.querySelector('.status-text');
    const statusDot = document.querySelector('.status-dot');
    
    if (statusText && statusDot) {
      statusText.textContent = 'Ready';
      statusDot.style.background = '#2ecc71';
    }
  }

  async loadSessions() {
    try {
      const sessions = await this.getStorageData('sessions');
      const sessionsList = document.getElementById('sessionsList');
      
      if (!sessions || Object.keys(sessions).length === 0) {
        sessionsList.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">💬</div>
            <div class="empty-title">No sessions yet</div>
            <div class="empty-description">Start a conversation on Fiverr to create your first session</div>
          </div>
        `;
        return;
      }

      // Display sessions
      const sessionEntries = Object.entries(sessions)
        .sort(([,a], [,b]) => (b.metadata?.lastUpdated || 0) - (a.metadata?.lastUpdated || 0));

      sessionsList.innerHTML = sessionEntries.map(([key, session]) => `
        <div class="session-item" data-session-id="${key}">
          <div class="session-info">
            <div class="session-title">${session.metadata?.title || 'Untitled Session'}</div>
            <div class="session-meta">
              ${session.metadata?.messageCount || 0} messages • 
              ${new Date(session.metadata?.lastUpdated || 0).toLocaleDateString()}
            </div>
          </div>
          <div class="session-actions">
            <button class="btn-icon" onclick="popupManager.exportSession('${key}')">📤</button>
            <button class="btn-icon" onclick="popupManager.deleteSession('${key}')">🗑️</button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  async loadSettings() {
    try {
      // Load API keys
      const settings = await this.getStorageData('settings');
      const apiKeysInput = document.getElementById('apiKeysInput');
      if (apiKeysInput && settings?.apiKeys) {
        apiKeysInput.value = settings.apiKeys.join('\n');
      }

      // Load knowledge base
      await this.loadKnowledgeBase();

      // Load preferences
      if (settings) {
        document.getElementById('autoSave').checked = settings.autoSave !== false;
        document.getElementById('notifications').checked = settings.notifications !== false;
        document.getElementById('keyRotation').checked = settings.keyRotation !== false;
        document.getElementById('maxContextLength').value = settings.maxContextLength || 10000;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async loadKnowledgeBase() {
    try {
      const knowledgeBase = await this.getStorageData('knowledgeBase');
      const container = document.getElementById('knowledgeBaseList');
      
      if (!container) return;

      if (!knowledgeBase || Object.keys(knowledgeBase).length === 0) {
        container.innerHTML = '<div class="empty-state">No knowledge base items yet</div>';
        return;
      }

      container.innerHTML = Object.entries(knowledgeBase).map(([key, value]) => `
        <div class="knowledge-item">
          <input type="text" class="kb-key" value="${key}" readonly>
          <textarea class="kb-value" readonly>${value}</textarea>
          <button class="btn-icon" onclick="popupManager.removeKnowledgeItem('${key}')">×</button>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load knowledge base:', error);
    }
  }

  async saveApiKeys() {
    try {
      this.showLoading(true);
      
      const apiKeysInput = document.getElementById('apiKeysInput');
      const keys = apiKeysInput.value
        .split('\n')
        .map(key => key.trim())
        .filter(key => key.length > 0);

      const result = await this.sendMessageToBackground({
        type: 'UPDATE_API_KEYS',
        keys
      });

      if (result.success) {
        this.showApiKeyStatus('API keys saved successfully!', 'success');
        await this.updateStats();
      } else {
        throw new Error(result.error || 'Failed to save API keys');
      }
    } catch (error) {
      console.error('Failed to save API keys:', error);
      this.showApiKeyStatus('Failed to save API keys: ' + error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async testApiKeys() {
    try {
      this.showLoading(true);
      
      const apiKeysInput = document.getElementById('apiKeysInput');
      const keys = apiKeysInput.value
        .split('\n')
        .map(key => key.trim())
        .filter(key => key.length > 0);

      if (keys.length === 0) {
        this.showApiKeyStatus('Please enter at least one API key', 'error');
        return;
      }

      // Test each key
      let validKeys = 0;
      for (const key of keys) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
          if (response.ok) {
            validKeys++;
          }
        } catch (error) {
          console.warn('Key test failed:', error);
        }
      }

      if (validKeys === keys.length) {
        this.showApiKeyStatus(`All ${keys.length} API keys are valid!`, 'success');
      } else if (validKeys > 0) {
        this.showApiKeyStatus(`${validKeys} out of ${keys.length} API keys are valid`, 'error');
      } else {
        this.showApiKeyStatus('No valid API keys found', 'error');
      }
    } catch (error) {
      console.error('Failed to test API keys:', error);
      this.showApiKeyStatus('Failed to test API keys: ' + error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  showApiKeyStatus(message, type) {
    const statusElement = document.getElementById('apiKeysStatus');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `api-keys-status ${type}`;
      
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 5000);
    }
  }

  async savePreferences() {
    try {
      const settings = await this.getStorageData('settings') || {};
      
      settings.autoSave = document.getElementById('autoSave').checked;
      settings.notifications = document.getElementById('notifications').checked;
      settings.keyRotation = document.getElementById('keyRotation').checked;
      settings.maxContextLength = parseInt(document.getElementById('maxContextLength').value);

      await this.setStorageData({ settings });
      this.showToast('Preferences saved');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      this.showToast('Failed to save preferences', 'error');
    }
  }

  async extractConversation() {
    try {
      this.showLoading(true);
      
      const result = await this.sendMessageToTab({ type: 'EXTRACT_CONVERSATION' });
      
      if (result.success && result.data) {
        this.showToast('Conversation extracted successfully!');
        await this.loadDashboardData();
      } else {
        throw new Error('No conversation data found');
      }
    } catch (error) {
      console.error('Failed to extract conversation:', error);
      this.showToast('Failed to extract conversation', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async generateReply() {
    try {
      this.showLoading(true);
      
      const result = await this.sendMessageToTab({ type: 'GENERATE_REPLY' });
      
      if (result.success) {
        this.showToast('Reply generated successfully!');
      } else {
        throw new Error(result.error || 'Failed to generate reply');
      }
    } catch (error) {
      console.error('Failed to generate reply:', error);
      this.showToast('Failed to generate reply', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async analyzeMessage() {
    try {
      this.showLoading(true);
      
      // For demo purposes, analyze the last message
      const result = await this.sendMessageToTab({ 
        type: 'ANALYZE_MESSAGE',
        data: { content: 'Sample message for analysis' }
      });
      
      if (result.success) {
        this.showToast('Message analyzed successfully!');
      } else {
        throw new Error(result.error || 'Failed to analyze message');
      }
    } catch (error) {
      console.error('Failed to analyze message:', error);
      this.showToast('Failed to analyze message', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async openFloatingWidget() {
    try {
      await this.sendMessageToTab({ type: 'OPEN_FLOATING_WIDGET' });
      window.close(); // Close popup after opening widget
    } catch (error) {
      console.error('Failed to open floating widget:', error);
      this.showToast('Failed to open AI assistant', 'error');
    }
  }

  async exportData(type) {
    try {
      this.showLoading(true);
      
      const format = document.getElementById('exportFormat').value;
      const result = await this.sendMessageToTab({
        type: 'EXPORT_DATA',
        format,
        dataType: type
      });

      if (result.success && result.data) {
        this.downloadFile(result.data);
        this.showToast('Data exported successfully!');
      } else {
        throw new Error('Failed to export data');
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      this.showToast('Failed to export data', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  handleFileSelect(file) {
    if (!file) return;

    const importButton = document.getElementById('importData');
    const dropZone = document.getElementById('fileDropZone');
    
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      dropZone.querySelector('.drop-text').textContent = `Selected: ${file.name}`;
      importButton.disabled = false;
      importButton.dataset.file = file.name;
      
      // Store file for import
      const reader = new FileReader();
      reader.onload = (e) => {
        this.importFileContent = e.target.result;
      };
      reader.readAsText(file);
    } else {
      this.showToast('Please select a valid JSON export file', 'error');
    }
  }

  async importData() {
    try {
      if (!this.importFileContent) {
        this.showToast('Please select a file first', 'error');
        return;
      }

      this.showLoading(true);

      const options = {
        importApiKeys: document.getElementById('importApiKeys').checked,
        forceImport: document.getElementById('forceImport').checked
      };

      const result = await this.sendMessageToTab({
        type: 'IMPORT_DATA',
        data: this.importFileContent,
        options
      });

      if (result.success) {
        this.showToast('Data imported successfully!');
        await this.initializeUI(); // Reload UI
      } else {
        throw new Error(result.error || 'Failed to import data');
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      this.showToast('Failed to import data: ' + error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  downloadFile(exportData) {
    const blob = new Blob([exportData.content], { type: exportData.mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = exportData.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
    this.isLoading = show;
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  async sendMessageToTab(message) {
    if (!this.currentTabId) {
      throw new Error('No active tab');
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(this.currentTabId, message, (response) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });
  }

  async sendMessageToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });
  }

  async getStorageData(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  async setStorageData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.popupManager = new PopupManager();
});
