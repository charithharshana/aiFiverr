/**
 * aiFiverr Popup Script
 * Handles popup interface interactions and communication with content scripts
 */

class PopupManager {
  constructor() {
    this.currentTab = 'dashboard';
    this.currentTabId = null;
    this.isLoading = false;
    this.currentApiKeys = [];
    this.apiKeyStatuses = [];
    this.currentPromptTab = 'custom';
    this.favoritePrompts = new Set();
    this.originalPromptData = null; // For tracking changes in prompt editing
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
      // Remove popup error message - just log to console
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
    document.getElementById('openFloatingWidget')?.addEventListener('click', () => {
      this.openFloatingWidget();
    });

    // Settings actions
    document.getElementById('testApiKeys')?.addEventListener('click', () => {
      this.testApiKeys();
    });

    document.getElementById('addKnowledgeItem')?.addEventListener('click', () => {
      this.showKnowledgeForm();
    });

    document.getElementById('populateFromPrompts')?.addEventListener('click', () => {
      this.populateKnowledgeBaseFromPrompts();
    });

    document.getElementById('saveKnowledgeItem')?.addEventListener('click', () => {
      this.saveKnowledgeItem();
    });

    document.getElementById('cancelKnowledgeItem')?.addEventListener('click', () => {
      this.hideKnowledgeForm();
    });

    document.getElementById('closeKnowledgeForm')?.addEventListener('click', () => {
      this.hideKnowledgeForm();
    });

    // Close modal when clicking overlay
    document.getElementById('knowledgeFormOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'knowledgeFormOverlay') {
        this.hideKnowledgeForm();
      }
    });

    // Event delegation for Knowledge Base buttons
    document.getElementById('knowledgeBaseList')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('kb-edit-btn')) {
        const key = e.target.getAttribute('data-key');
        this.editKnowledgeItem(key);
      } else if (e.target.classList.contains('kb-delete-btn')) {
        const key = e.target.getAttribute('data-key');
        this.removeKnowledgeItem(key);
      }
    });

    document.getElementById('toggleApiKeysVisibility')?.addEventListener('click', () => {
      this.toggleApiKeysVisibility();
    });

    document.getElementById('clearApiKeys')?.addEventListener('click', () => {
      this.clearApiKeys();
    });

    // Auto-save API keys on paste and input
    const apiKeysInput = document.getElementById('apiKeysInput');
    if (apiKeysInput) {
      // Auto-save on paste
      apiKeysInput.addEventListener('paste', (e) => {
        setTimeout(() => {
          this.autoSaveApiKeys();
        }, 100); // Small delay to ensure paste content is processed
      });

      // Auto-save on input with debouncing
      let saveTimeout;
      apiKeysInput.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          this.autoSaveApiKeys();
        }, 1000); // 1 second delay to avoid excessive saves
      });
    }



    // Prompt management
    document.getElementById('addPromptBtn')?.addEventListener('click', () => {
      this.showPromptForm();
    });

    document.getElementById('savePromptBtn')?.addEventListener('click', () => {
      this.savePrompt();
    });

    document.getElementById('cancelPromptBtn')?.addEventListener('click', () => {
      this.hidePromptForm();
    });

    // Prompt tabs
    document.querySelectorAll('.prompt-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchPromptTab(e.target.dataset.tab);
      });
    });

    // Event delegation for prompt buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('prompt-favorite-btn')) {
        const key = e.target.getAttribute('data-key');
        this.toggleFavoritePrompt(key);
      } else if (e.target.classList.contains('prompt-edit-btn')) {
        const key = e.target.getAttribute('data-key');
        this.editPrompt(key);
      } else if (e.target.classList.contains('prompt-delete-btn')) {
        const key = e.target.getAttribute('data-key');
        this.deletePrompt(key);
      }
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

    // Global save button
    document.getElementById('globalSaveBtn')?.addEventListener('click', () => {
      this.saveAllSettings();
    });

    // API save button
    document.getElementById('apiSaveBtn')?.addEventListener('click', () => {
      this.saveApiConfiguration();
    });

    // Conversations tab event listeners
    document.getElementById('refreshConversations')?.addEventListener('click', () => {
      this.loadConversations();
    });

    document.getElementById('clearAllConversations')?.addEventListener('click', () => {
      this.clearAllConversations();
    });

    document.getElementById('exportConversation')?.addEventListener('click', () => {
      this.exportCurrentConversation();
    });

    document.getElementById('deleteConversation')?.addEventListener('click', () => {
      this.deleteCurrentConversation();
    });

    // Modal close buttons
    document.getElementById('closeConversationModal')?.addEventListener('click', () => {
      this.closeConversationModal();
    });

    document.getElementById('closeConversationModalBtn')?.addEventListener('click', () => {
      this.closeConversationModal();
    });

    document.getElementById('refreshSingleConversation')?.addEventListener('click', () => {
      this.refreshCurrentConversation();
    });

    document.getElementById('refreshSingleConversation')?.addEventListener('click', () => {
      this.refreshCurrentConversation();
    });

    document.getElementById('closeConversationModal')?.addEventListener('click', () => {
      this.closeConversationModal();
    });

    document.getElementById('closeConversationModalBtn')?.addEventListener('click', () => {
      this.closeConversationModal();
    });

    // Close conversation modal when clicking overlay
    document.getElementById('conversationModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'conversationModalOverlay') {
        this.closeConversationModal();
      }
    });

    // Event delegation for conversation items
    document.getElementById('conversationsList')?.addEventListener('click', (e) => {
      const conversationItem = e.target.closest('.conversation-item');
      if (conversationItem) {
        const username = conversationItem.getAttribute('data-username');
        this.showConversationModal(username);
      }
    });
  }

  async initializeUI() {
    try {
      // Load settings (this includes knowledge base and prompts)
      await this.loadSettings();

      // Update status
      this.updateStatus();
    } catch (error) {
      console.error('aiFiverr: Failed to initialize UI:', error);
      this.showToast('Failed to initialize extension UI', 'error');
    }
  }

  async switchTab(tabName) {
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
      case 'conversations':
        await this.loadConversations();
        break;
      case 'api':
        await this.loadApiConfig();
        break;
      case 'settings':
        await this.loadSettings();
        // Ensure knowledge base and prompts are always loaded when switching to settings
        await this.loadKnowledgeBase();
        await this.loadPrompts();
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

      // Load Fiverr data
      await this.loadStoredConversations();
      await this.loadStoredContacts();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }

  async updateStats() {
    try {
      // Get conversation count
      const conversations = await this.getStorageData('fiverrConversations');
      const conversationCount = conversations ? Object.keys(conversations).length : 0;
      document.getElementById('totalConversations').textContent = conversationCount;

      // Get API key count
      const settings = await this.getStorageData('settings');
      const apiKeyCount = settings?.apiKeys ? settings.apiKeys.length : 0;
      document.getElementById('healthyKeys').textContent = apiKeyCount;

      // Get custom prompts count
      const customPrompts = await this.getStorageData('customPrompts');
      const promptCount = customPrompts ? Object.keys(customPrompts).length : 0;
      document.getElementById('totalPrompts').textContent = promptCount;
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  async updateActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;

    try {
      // Get recent conversations
      const conversations = await this.getStorageData('fiverrConversations');

      if (conversations && Object.keys(conversations).length > 0) {
        // Show recent conversations
        const recentConversations = Object.entries(conversations)
          .sort(([,a], [,b]) => (b.lastExtracted || 0) - (a.lastExtracted || 0))
          .slice(0, 3);

        activityList.innerHTML = recentConversations.map(([username, conv]) => `
          <div class="activity-item">
            <div class="activity-icon">💬</div>
            <div class="activity-content">
              <div class="activity-title">Conversation with ${username}</div>
              <div class="activity-time">${new Date(conv.lastExtracted || 0).toLocaleDateString()}</div>
            </div>
          </div>
        `).join('');
      } else {
        // Show welcome message if no conversations
        activityList.innerHTML = `
          <div class="activity-item">
            <div class="activity-icon">🎯</div>
            <div class="activity-content">
              <div class="activity-title">Ready to assist with Fiverr conversations!</div>
              <div class="activity-time">Go to a Fiverr conversation page to get started</div>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Failed to update activity:', error);
      // Fallback to welcome message
      activityList.innerHTML = `
        <div class="activity-item">
          <div class="activity-icon">⚠️</div>
          <div class="activity-content">
            <div class="activity-title">aiFiverr Extension Ready</div>
            <div class="activity-time">Visit Fiverr to start using AI assistance</div>
          </div>
        </div>
      `;
    }
  }

  updateStatus() {
    const statusText = document.querySelector('.status-text');
    const statusDot = document.querySelector('.status-dot');
    
    if (statusText && statusDot) {
      statusText.textContent = 'Ready';
      statusDot.style.background = '#2ecc71';
    }
  }



  async loadApiConfig() {
    try {
      const settings = await this.getStorageData('settings');
      this.currentApiKeys = settings?.apiKeys || [];

      // Display API keys in the list
      this.displayApiKeys();

      // Initialize API keys visibility (default to hidden)
      const apiKeysInput = document.getElementById('apiKeysInput');
      const eyeIcon = document.getElementById('eyeIcon');
      if (apiKeysInput && eyeIcon) {
        // Use CSS to hide content instead of type property (textarea doesn't have type)
        apiKeysInput.style.webkitTextSecurity = 'disc';
        apiKeysInput.style.textSecurity = 'disc';
        apiKeysInput.dataset.hidden = 'true';
        eyeIcon.textContent = '👁️';
        eyeIcon.parentElement.title = 'Show API keys';
      }

      // Load API configuration
      if (settings) {
        document.getElementById('defaultModel').value = settings.defaultModel || 'gemini-2.5-flash';
        document.getElementById('keyRotation').checked = settings.keyRotation !== false;
        document.getElementById('apiTimeout').value = settings.apiTimeout || 30;
        document.getElementById('maxRetries').value = settings.maxRetries || 3;
      }
    } catch (error) {
      console.error('Failed to load API config:', error);
    }
  }

  async loadSettings() {
    try {
      const settings = await this.getStorageData('settings');

      // Load knowledge base
      await this.loadKnowledgeBase();

      // Load prompt management
      await this.loadPrompts();

      // Load preferences (removed API keys and model selection)
      if (settings) {
        document.getElementById('restrictToFiverr').checked = settings.restrictToFiverr !== false;
        document.getElementById('autoSave').checked = settings.autoSave !== false;
        document.getElementById('notifications').checked = settings.notifications !== false;
        document.getElementById('maxContextLength').value = settings.maxContextLength || 10000;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async loadKnowledgeBase() {
    try {
      // Force reload from storage to get the latest data
      let knowledgeBase = await this.forceReloadFromStorage('knowledgeBase') || {};

      // Auto-populate variables from default prompts if Knowledge Base is empty
      if (Object.keys(knowledgeBase).length === 0) {
        await this.autoPopulateKnowledgeBase();
        // Reload the knowledge base after auto-population
        knowledgeBase = await this.forceReloadFromStorage('knowledgeBase') || {};
      }

      const container = document.getElementById('knowledgeBaseList');

      if (!container) return;

      const count = Object.keys(knowledgeBase).length;

      if (count === 0) {
        container.innerHTML = '<div class="empty-state">No variables created yet. Click "Add" to get started.</div>';
        return;
      }

      container.innerHTML = Object.entries(knowledgeBase).map(([key, value]) => `
        <div class="kb-variable-card" data-key="${key}">
          <div class="kb-variable-header">
            <h5 class="kb-variable-name">{{${key}}}</h5>
            <div class="kb-variable-actions">
              <button class="kb-action-btn kb-edit-btn" data-key="${key}" title="Edit variable">
                ✎
              </button>
              <button class="kb-action-btn delete kb-delete-btn" data-key="${key}" title="Delete variable">
                ×
              </button>
            </div>
          </div>
          <div class="kb-variable-value">${this.escapeHtml(value)}</div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load knowledge base:', error);
    }
  }

  async autoPopulateKnowledgeBase(autoSave = true) {
    try {
      // Extract variables from default prompts
      const defaultPrompts = this.getDefaultPrompts();
      console.log('Default prompts:', defaultPrompts);

      const variables = new Set();

      // Regular expression to find {{variable}} patterns
      const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

      // Extract variables from all default prompts
      Object.values(defaultPrompts).forEach(prompt => {
        console.log('Processing prompt:', prompt.name, prompt.prompt);
        let match;
        while ((match = variableRegex.exec(prompt.prompt)) !== null) {
          console.log('Found variable:', match[1]);
          variables.add(match[1]);
        }
      });

      console.log('All variables found:', Array.from(variables));

      // Create default values for detected variables
      const knowledgeBase = {};
      const defaultValues = {
        'bio': 'Your professional bio and background information - include your expertise, experience, and what makes you unique',
        'services': 'List of services you offer - be specific about what you can deliver for clients',
        'portfolio': 'Links to your portfolio or previous work - include your best examples and case studies',
        'custom1': 'Custom field 1 - Add any specific information like project goals, communication style, or special requirements',
        'custom2': 'Custom field 2 - Add availability, timeline preferences, or any other relevant details',
        'language': 'Target language for translation (e.g., Spanish, French, German, Italian, Portuguese, etc.)'
      };

      variables.forEach(variable => {
        knowledgeBase[variable] = defaultValues[variable] || `Please update this ${variable} variable with your information`;
      });

      console.log('Generated knowledge base:', knowledgeBase);

      // Save to storage if any variables were found and autoSave is true
      if (autoSave && Object.keys(knowledgeBase).length > 0) {
        const saveSuccess = await this.setStorageData({ knowledgeBase });
        if (saveSuccess) {
          // Verify the data was saved
          const verifyData = await this.getStorageData('knowledgeBase');
          if (verifyData && Object.keys(verifyData).length === Object.keys(knowledgeBase).length) {
            // Auto-population successful - no toast message needed
          } else {
            throw new Error('Data verification failed after auto-population save');
          }
        } else {
          throw new Error('Failed to save auto-populated knowledge base');
        }
      }

      return knowledgeBase;
    } catch (error) {
      console.error('Failed to auto-populate knowledge base:', error);
      if (autoSave) {
        this.showToast(`Failed to auto-populate knowledge base: ${error.message}`, 'error');
      }
      return {};
    }
  }

  async populateKnowledgeBaseFromPrompts() {
    try {
      this.showLoading(true);

      const existingKnowledgeBase = await this.getStorageData('knowledgeBase') || {};
      const newVariables = await this.autoPopulateKnowledgeBase(false);

      console.log('Existing KB:', existingKnowledgeBase);
      console.log('New variables from prompts:', newVariables);

      // Only add variables that don't already exist
      const variablesToAdd = {};
      Object.entries(newVariables).forEach(([key, value]) => {
        if (!existingKnowledgeBase.hasOwnProperty(key)) {
          variablesToAdd[key] = value;
        }
      });

      console.log('Variables to add:', variablesToAdd);

      if (Object.keys(variablesToAdd).length > 0) {
        // Merge with existing variables
        const mergedKnowledgeBase = { ...existingKnowledgeBase, ...variablesToAdd };

        // Save with explicit error handling
        const saveSuccess = await this.setStorageData({ knowledgeBase: mergedKnowledgeBase });

        if (saveSuccess) {
          // Wait a moment for storage to complete
          await new Promise(resolve => setTimeout(resolve, 100));

          // Force reload data from storage to verify
          const verifyData = await this.forceReloadFromStorage('knowledgeBase');
          console.log('Verified saved data:', verifyData);

          await this.loadKnowledgeBase();
          this.showToast(`Added ${Object.keys(variablesToAdd).length} new variables from default prompts`, 'success');
        } else {
          throw new Error('Failed to save knowledge base data');
        }
      } else if (Object.keys(newVariables).length > 0) {
        // Variables exist but user clicked the button - refresh the display
        await this.loadKnowledgeBase();
        this.showToast('All variables from default prompts are already in your Knowledge Base', 'info');
      } else {
        // No variables found in default prompts
        this.showToast('No variables found in default prompts to populate', 'warning');
      }
    } catch (error) {
      console.error('Failed to populate knowledge base from prompts:', error);
      this.showToast(`Failed to populate variables from prompts: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showKnowledgeForm(editKey = null) {
    const overlay = document.getElementById('knowledgeFormOverlay');
    const title = document.getElementById('kbFormTitle');
    const keyInput = document.getElementById('newKbKey');
    const valueInput = document.getElementById('newKbValue');

    if (editKey) {
      title.textContent = 'Edit Variable';
      keyInput.readOnly = true;
    } else {
      title.textContent = 'Add New Variable';
      keyInput.readOnly = false;
      // Clear any previous values
      keyInput.value = '';
      valueInput.value = '';
    }

    overlay.classList.add('active');
    setTimeout(() => keyInput.focus(), 100);
  }

  hideKnowledgeForm() {
    const overlay = document.getElementById('knowledgeFormOverlay');
    overlay.classList.remove('active');

    // Clear form
    document.getElementById('newKbKey').value = '';
    document.getElementById('newKbValue').value = '';
    document.getElementById('newKbKey').readOnly = false;
  }

  applySuggestion(key, value) {
    const keyInput = document.getElementById('newKbKey');
    const valueInput = document.getElementById('newKbValue');

    keyInput.value = key;
    valueInput.value = value;

    this.showKnowledgeForm();
    valueInput.focus();
  }

  async saveKnowledgeItem() {
    try {
      const keyInput = document.getElementById('newKbKey');
      const valueInput = document.getElementById('newKbValue');

      const key = keyInput.value.trim();
      const value = valueInput.value.trim();

      if (!key) {
        this.showToast('Please enter a variable name', 'error');
        keyInput.focus();
        return;
      }

      if (!value) {
        this.showToast('Please enter a variable value', 'error');
        valueInput.focus();
        return;
      }

      // Validate key format (alphanumeric and underscores only)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        this.showToast('Variable name can only contain letters, numbers, and underscores, and must start with a letter or underscore', 'error');
        keyInput.focus();
        return;
      }

      this.showLoading(true);

      const knowledgeBase = await this.getStorageData('knowledgeBase') || {};
      knowledgeBase[key] = value;

      // Save with explicit error handling
      const saveSuccess = await this.setStorageData({ knowledgeBase });

      if (saveSuccess) {
        // Wait a moment for storage to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Force reload data from storage to verify
        const verifyData = await this.forceReloadFromStorage('knowledgeBase');
        console.log('Verified saved knowledge base:', verifyData);

        if (verifyData && verifyData[key] === value) {
          await this.loadKnowledgeBase();
          this.hideKnowledgeForm();
          this.showToast(`Variable "${key}" saved successfully`, 'success');
        } else {
          throw new Error('Data verification failed after save');
        }
      } else {
        throw new Error('Failed to save knowledge base data');
      }
    } catch (error) {
      console.error('Failed to save knowledge item:', error);
      this.showToast(`Failed to save variable: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async editKnowledgeItem(key) {
    try {
      const knowledgeBase = await this.getStorageData('knowledgeBase') || {};
      const value = knowledgeBase[key];

      if (!value) {
        this.showToast('Variable not found', 'error');
        return;
      }

      const keyInput = document.getElementById('newKbKey');
      const valueInput = document.getElementById('newKbValue');

      keyInput.value = key;
      valueInput.value = value;

      this.showKnowledgeForm(key);
      setTimeout(() => valueInput.focus(), 150);

      // Store the editing key
      this.editingKey = key;
    } catch (error) {
      console.error('Failed to edit knowledge item:', error);
      this.showToast('Failed to edit variable', 'error');
    }
  }

  async removeKnowledgeItem(key) {
    if (confirm(`Are you sure you want to remove the variable "${key}"?`)) {
      try {
        const knowledgeBase = await this.getStorageData('knowledgeBase') || {};
        delete knowledgeBase[key];

        await this.setStorageData({ knowledgeBase });
        await this.loadKnowledgeBase();

        this.showToast(`Variable "${key}" removed successfully`, 'success');
      } catch (error) {
        console.error('Failed to remove knowledge item:', error);
        this.showToast('Failed to remove variable', 'error');
      }
    }
  }

  // Prompt Management Methods
  async loadPrompts() {
    try {
      // Force reload custom prompts from storage
      const customPrompts = await this.forceReloadFromStorage('customPrompts') || {};

      // Force reload favorite prompts from storage
      const favorites = await this.forceReloadFromStorage('favoritePrompts') || [];
      this.favoritePrompts = new Set(favorites);

      // Load default prompts from knowledge base
      const defaultPrompts = this.getDefaultPrompts();

      this.displayPrompts('custom', customPrompts);
      this.displayPrompts('default', defaultPrompts);
      this.displayFavoritePrompts();
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  }

  getDefaultPrompts() {
    return {
      'professional_initial_reply': {
        name: 'Professional Initial Reply',
        description: 'Generate a professional, friendly, and concise reply to a potential client\'s initial message',
        prompt: `Write a professional reply to {username} based on their message: {conversation}

Use my background: {{bio}}
My services: {{services}}
Portfolio: {{portfolio}}
Additional info: {{custom1}}

Requirements:
- Greet the client personally
- Show you understand their request
- Mention relevant experience or service
- Suggest next steps
- Keep it friendly and professional
- No markdown formatting in response`
      },
      'project_summary': {
        name: 'Project Summary',
        description: 'Analyze conversation and extract key details into a structured, concise summary',
        prompt: `Analyze this conversation and create a clear project summary: {conversation}

Format your response as:

Project Overview: [One sentence summary]

Key Deliverables:
- [List specific items expected]

Requirements:
- [List client preferences and instructions]

Budget: [Amount mentioned or "Not discussed"]

Timeline: [Dates mentioned or "Not discussed"]

Next Steps: [What needs to be done next]

Use plain text only, no markdown formatting.`
      },
      'follow_up_message': {
        name: 'Follow-up Message',
        description: 'Draft a concise and effective follow-up message to a client based on conversation history',
        prompt: `Write a follow-up message based on this conversation: {conversation}

Purpose: {{custom1}}
My availability: {{custom2}}

Make it:
- Friendly and professional
- Reference something specific from our conversation
- Include clear next steps
- Mention availability if provided
- No markdown formatting`
      },
      'project_proposal': {
        name: 'Project Proposal',
        description: 'Transform raw notes into a clear, professional, and persuasive project proposal message',
        prompt: `Create a project proposal for {username} based on:

Conversation: {conversation}
Proposal details: {proposal}
My background: {{bio}}
Portfolio: {{portfolio}}

Structure:
1. Personal greeting
2. Project understanding summary
3. Proposal details (scope, timeline, price)
4. Why I'm the right fit
5. Relevant portfolio example
6. Clear next steps

Use plain text, no markdown formatting.`
      },
      'translate_and_explain': {
        name: 'Translate and Explain Message',
        description: 'Translate text and provide a simple explanation of its content',
        prompt: `Translate this message to {{language}} and explain it: {conversation}

Format your response as:

EXPLANATION:
Main goal: [What they want]
Key points: [Important details]
Tone: [Formal/informal/urgent/etc]

TRANSLATION:
[Full translation in {{language}}]

Use plain text only.`
      },
      'refine_and_translate': {
        name: 'Refine and Translate My Message',
        description: 'Refine draft message for clarity and professionalism, then translate to requested language',
        prompt: `Improve this message and translate it to {{language}}: {conversation}

Steps:
1. Fix grammar and make it more professional
2. Translate the improved version to {{language}}

Provide only the final translated text, no explanations.`
      },
      'refine_message': {
        name: 'Refine My Message (No Translation)',
        description: 'Refine draft message to improve quality, clarity, and impact without translation',
        prompt: `Improve this message to be {{custom1}}: {conversation}

Make it:
- Grammatically correct
- Clear and concise
- More {{custom1}} in tone
- Keep the same meaning

Provide only the improved message, no explanations.`
      }
    };
  }

  switchPromptTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.prompt-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    // Update tab panels
    document.querySelectorAll('.prompt-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    // Map tab names to panel IDs
    const panelMap = {
      'custom': 'customPromptsPanel',
      'default': 'defaultPromptsPanel',
      'favorites': 'favoritesPanel'
    };

    const panelId = panelMap[tab];
    if (panelId) {
      document.getElementById(panelId).classList.add('active');
    }

    this.currentPromptTab = tab;

    // Reload prompts to ensure they are displayed correctly
    this.loadPrompts();
  }

  displayPrompts(type, prompts) {
    const container = document.getElementById(`${type}PromptsList`);
    if (!container) {
      console.warn(`Container not found: ${type}PromptsList`);
      return;
    }

    if (!prompts || Object.keys(prompts).length === 0) {
      const emptyMessage = type === 'custom'
        ? 'No custom prompts yet. Click "Add Custom Prompt" to create your first prompt, or favorite default prompts to customize them.'
        : `No ${type} prompts yet`;
      container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
      return;
    }

    container.innerHTML = Object.entries(prompts).map(([key, prompt]) => {
      const isFavorite = this.favoritePrompts.has(key);
      const isDefault = type === 'default';

      return `
        <div class="prompt-item ${isFavorite ? 'favorite' : ''}" data-key="${key}" data-type="${type}">
          <div class="prompt-item-header">
            <div class="prompt-item-title">
              <h4 class="prompt-item-name">${this.escapeHtml(prompt.name)}</h4>
              <span class="prompt-item-key">${key}</span>
            </div>
            <div class="prompt-item-actions">
              <button class="prompt-action-btn favorite ${isFavorite ? 'favorite' : ''} prompt-favorite-btn"
                      data-key="${key}"
                      title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                ${isFavorite ? '★' : '☆'}
              </button>
              ${!isDefault ? `
                <button class="prompt-action-btn edit prompt-edit-btn"
                        data-key="${key}"
                        title="Edit prompt">✎</button>
                <button class="prompt-action-btn delete prompt-delete-btn"
                        data-key="${key}"
                        title="Delete prompt">×</button>
              ` : `
                <button class="prompt-action-btn edit prompt-edit-btn"
                        data-key="${key}"
                        data-type="default"
                        title="Copy to custom prompts for editing">✎</button>
              `}
            </div>
          </div>
          <div class="prompt-item-description">${this.escapeHtml(prompt.description || '')}</div>
          <div class="prompt-item-content">${this.escapeHtml(prompt.prompt)}</div>
        </div>
      `;
    }).join('');
  }

  displayFavoritePrompts() {
    const container = document.getElementById('favoritePromptsList');
    if (!container) return;

    if (this.favoritePrompts.size === 0) {
      container.innerHTML = '<div class="empty-state">No favorite prompts yet. Click the star icon on any prompt to add it to favorites.</div>';
      return;
    }

    // Get all prompts (custom and default) and filter favorites
    Promise.all([
      this.getStorageData('customPrompts'),
      Promise.resolve(this.getDefaultPrompts())
    ]).then(([customPrompts, defaultPrompts]) => {
      const allPrompts = { ...defaultPrompts, ...customPrompts };
      const favoritePrompts = {};

      this.favoritePrompts.forEach(key => {
        if (allPrompts[key]) {
          favoritePrompts[key] = allPrompts[key];
        }
      });

      // Use 'favorite' (singular) to match the HTML ID 'favoritePromptsList'
      this.displayPrompts('favorite', favoritePrompts);
    });
  }

  showPromptForm(isEdit = false) {
    const form = document.getElementById('promptAddForm');
    form.classList.add('active');

    if (!isEdit) {
      // Clear form only for new prompts
      document.getElementById('newPromptKey').value = '';
      document.getElementById('newPromptName').value = '';
      document.getElementById('newPromptDescription').value = '';
      document.getElementById('newPromptContent').value = '';

      // Make sure key field is enabled for new prompts
      document.getElementById('newPromptKey').readOnly = false;
      document.getElementById('newPromptKey').focus();
    } else {
      // For editing, focus on the name field since key is readonly
      document.getElementById('newPromptName').focus();
    }
  }

  hidePromptForm() {
    const form = document.getElementById('promptAddForm');
    form.classList.remove('active');

    // Clear form when hiding
    document.getElementById('newPromptKey').value = '';
    document.getElementById('newPromptName').value = '';
    document.getElementById('newPromptDescription').value = '';
    document.getElementById('newPromptContent').value = '';
    document.getElementById('newPromptKey').readOnly = false;

    // Clear original prompt data
    this.originalPromptData = null;
  }

  async savePrompt() {
    try {
      const key = document.getElementById('newPromptKey').value.trim();
      const name = document.getElementById('newPromptName').value.trim();
      const description = document.getElementById('newPromptDescription').value.trim();
      const content = document.getElementById('newPromptContent').value.trim();

      if (!key) {
        this.showToast('Please enter a prompt key', 'error');
        document.getElementById('newPromptKey').focus();
        return;
      }

      if (!name) {
        this.showToast('Please enter a prompt name', 'error');
        document.getElementById('newPromptName').focus();
        return;
      }

      if (!content) {
        this.showToast('Please enter prompt content', 'error');
        document.getElementById('newPromptContent').focus();
        return;
      }

      // Validate key format
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        this.showToast('Prompt key can only contain letters, numbers, and underscores', 'error');
        document.getElementById('newPromptKey').focus();
        return;
      }

      // Check if this is editing a default prompt and if changes were made
      if (this.originalPromptData && this.originalPromptData.isDefaultPrompt) {
        const originalName = this.originalPromptData.name + ' (Custom)';
        const hasChanges =
          name !== originalName ||
          description !== this.originalPromptData.description ||
          content !== this.originalPromptData.content;

        if (!hasChanges) {
          this.hidePromptForm();
          this.showToast('No changes made to the prompt', 'info');
          this.originalPromptData = null;
          return;
        }
      }

      this.showLoading(true);

      const customPrompts = await this.getStorageData('customPrompts') || {};
      const promptData = {
        name,
        description,
        prompt: content,
        created: customPrompts[key]?.created || Date.now(),
        modified: Date.now()
      };

      customPrompts[key] = promptData;

      // Save with explicit error handling
      const saveSuccess = await this.setStorageData({ customPrompts });

      if (saveSuccess) {
        // Wait a moment for storage to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Force reload data from storage to verify
        const verifyData = await this.forceReloadFromStorage('customPrompts');
        console.log('Verified saved custom prompts:', verifyData);

        if (verifyData && verifyData[key] && verifyData[key].name === name) {
          await this.loadPrompts();
          this.hidePromptForm();
          this.showToast(`Prompt "${name}" saved successfully`, 'success');
          this.originalPromptData = null; // Clear original data
        } else {
          throw new Error('Data verification failed after save');
        }
      } else {
        throw new Error('Failed to save custom prompts data');
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
      this.showToast(`Failed to save prompt: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async editPrompt(key) {
    try {
      // Check if it's a default prompt first
      const defaultPrompts = this.getDefaultPrompts();
      const customPrompts = await this.getStorageData('customPrompts') || {};

      let prompt = customPrompts[key];
      let isDefaultPrompt = false;

      // If not found in custom prompts, check default prompts
      if (!prompt && defaultPrompts[key]) {
        prompt = defaultPrompts[key];
        isDefaultPrompt = true;
      }

      if (!prompt) {
        this.showToast('Prompt not found', 'error');
        return;
      }

      // Store original values for change detection
      this.originalPromptData = {
        key: key,
        name: prompt.name,
        description: prompt.description || '',
        content: prompt.prompt,
        isDefaultPrompt: isDefaultPrompt
      };

      // If it's a default prompt, create a new key for the custom version
      let editKey = key;
      if (isDefaultPrompt) {
        editKey = `custom_${key}`;
        // Make sure the custom key doesn't already exist
        let counter = 1;
        while (customPrompts[editKey]) {
          editKey = `custom_${key}_${counter}`;
          counter++;
        }
      }

      document.getElementById('newPromptKey').value = editKey;
      document.getElementById('newPromptName').value = prompt.name + (isDefaultPrompt ? ' (Custom)' : '');
      document.getElementById('newPromptDescription').value = prompt.description || '';
      document.getElementById('newPromptContent').value = prompt.prompt;

      // Make key field readonly when editing existing custom prompt
      document.getElementById('newPromptKey').readOnly = !isDefaultPrompt;

      this.showPromptForm(true); // Pass true to indicate this is an edit

      if (isDefaultPrompt) {
        this.showToast('Default prompt copied for editing. You can modify it as needed.', 'info');
      }
    } catch (error) {
      console.error('Failed to edit prompt:', error);
      this.showToast('Failed to edit prompt', 'error');
    }
  }

  async deletePrompt(key) {
    if (confirm('Are you sure you want to delete this prompt?')) {
      try {
        const customPrompts = await this.getStorageData('customPrompts') || {};
        delete customPrompts[key];

        // Remove from favorites if it exists
        this.favoritePrompts.delete(key);
        await this.setStorageData({
          customPrompts,
          favoritePrompts: Array.from(this.favoritePrompts)
        });

        await this.loadPrompts();
        this.showToast('Prompt deleted successfully', 'success');
      } catch (error) {
        console.error('Failed to delete prompt:', error);
        this.showToast('Failed to delete prompt', 'error');
      }
    }
  }

  async toggleFavoritePrompt(key) {
    try {
      console.log('Toggling favorite for key:', key);
      console.log('Current favorites:', Array.from(this.favoritePrompts));

      // Check if prompt exists in either default or custom prompts
      const defaultPrompts = this.getDefaultPrompts();
      const customPrompts = await this.getStorageData('customPrompts') || {};
      const allPrompts = { ...defaultPrompts, ...customPrompts };

      if (!allPrompts[key]) {
        this.showToast('Prompt not found', 'error');
        return;
      }

      const wasInFavorites = this.favoritePrompts.has(key);

      if (wasInFavorites) {
        this.favoritePrompts.delete(key);
        console.log('Removed from favorites');
      } else {
        this.favoritePrompts.add(key);
        console.log('Added to favorites');
      }

      console.log('New favorites:', Array.from(this.favoritePrompts));

      await this.setStorageData({
        favoritePrompts: Array.from(this.favoritePrompts)
      });

      await this.loadPrompts();
      this.showToast(`Prompt ${!wasInFavorites ? 'added to' : 'removed from'} favorites`, 'success');
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      this.showToast('Failed to update favorites', 'error');
    }
  }

  displayApiKeys() {
    this.updateApiKeysSummary();
  }

  updateApiKeysSummary() {
    const container = document.getElementById('apiKeysSummary');
    if (!container) return;

    if (!this.currentApiKeys || this.currentApiKeys.length === 0) {
      container.innerHTML = 'No API keys configured. Add your Gemini API keys above to get started.';
      container.className = 'api-keys-summary';
      return;
    }

    const validKeys = this.apiKeyStatuses ? this.apiKeyStatuses.filter(status => status === 'valid').length : 0;
    const invalidKeys = this.apiKeyStatuses ? this.apiKeyStatuses.filter(status => status === 'invalid').length : 0;
    const testingKeys = this.apiKeyStatuses ? this.apiKeyStatuses.filter(status => status === 'testing').length : 0;
    const totalKeys = this.currentApiKeys.length;

    let statusText = `${totalKeys} API key${totalKeys > 1 ? 's' : ''} configured`;
    let statusClass = 'api-keys-summary';

    if (testingKeys > 0) {
      statusText += ` (${testingKeys} testing...)`;
      statusClass += ' has-keys';
    } else if (validKeys > 0) {
      statusText += ` (${validKeys} valid`;
      if (invalidKeys > 0) {
        statusText += `, ${invalidKeys} invalid`;
        statusClass += ' has-errors';
      } else {
        statusClass += ' has-keys';
      }
      statusText += ')';
    } else if (invalidKeys > 0) {
      statusText += ` (${invalidKeys} invalid)`;
      statusClass += ' has-errors';
    }

    container.innerHTML = statusText;
    container.className = statusClass;
  }



  toggleApiKeysVisibility() {
    const apiKeysInput = document.getElementById('apiKeysInput');
    const eyeIcon = document.getElementById('eyeIcon');

    // Toggle between hidden and visible using CSS properties
    const isCurrentlyHidden = apiKeysInput.dataset.hidden === 'true';

    if (isCurrentlyHidden) {
      // Show actual keys
      apiKeysInput.style.webkitTextSecurity = 'none';
      apiKeysInput.style.textSecurity = 'none';
      apiKeysInput.dataset.hidden = 'false';
      eyeIcon.textContent = '🙈'; // Hide icon when keys are visible
      eyeIcon.parentElement.title = 'Hide API keys';
    } else {
      // Hide keys
      apiKeysInput.style.webkitTextSecurity = 'disc';
      apiKeysInput.style.textSecurity = 'disc';
      apiKeysInput.dataset.hidden = 'true';
      eyeIcon.textContent = '👁️'; // Show icon when keys are hidden
      eyeIcon.parentElement.title = 'Show API keys';
    }

    // Maintain font family
    apiKeysInput.style.fontFamily = "'Monaco', 'Menlo', 'Ubuntu Mono', monospace";

    // Also update the displayed list
    this.displayApiKeys();
  }



  async clearApiKeys() {
    try {
      // Clear the input field
      const apiKeysInput = document.getElementById('apiKeysInput');
      if (apiKeysInput) {
        apiKeysInput.value = '';
      }

      // Clear saved API keys
      this.currentApiKeys = [];
      this.apiKeyStatuses = [];

      // Update storage
      const result = await this.sendMessageToBackground({
        type: 'UPDATE_API_KEYS',
        keys: []
      });

      if (result.success) {
        // Update display
        this.displayApiKeys();

        // Reset status indicators
        const statusElement = document.getElementById('apiKeysStatus');
        if (statusElement) {
          statusElement.textContent = '';
          statusElement.className = 'api-keys-status';
          statusElement.style.display = 'none';
        }

        this.showApiKeyStatus('All API keys cleared', 'success');
        await this.updateStats();
      } else {
        throw new Error(result.error || 'Failed to clear API keys');
      }
    } catch (error) {
      console.error('Failed to clear API keys:', error);
      this.showApiKeyStatus('Failed to clear API keys: ' + error.message, 'error');
    }
  }

  async autoSaveApiKeys() {
    try {
      const apiKeysInput = document.getElementById('apiKeysInput');
      const inputValue = apiKeysInput.value.trim();

      // Only save if there's actual content
      if (!inputValue) {
        return;
      }

      const newKeys = inputValue
        .split('\n')
        .map(key => key.trim())
        .filter(key => key.length > 0);

      // Only save if there are valid keys
      if (newKeys.length === 0) {
        return;
      }

      // Combine existing keys with new ones (avoid duplicates)
      const allKeys = [...new Set([...this.currentApiKeys, ...newKeys])];

      const result = await this.sendMessageToBackground({
        type: 'UPDATE_API_KEYS',
        keys: allKeys
      });

      if (result.success) {
        this.currentApiKeys = allKeys;
        this.displayApiKeys();
        apiKeysInput.value = ''; // Clear input after saving
        this.showApiKeyStatus('API keys saved automatically', 'success');

        // Also save to settings for persistence
        const settings = await this.getStorageData('settings') || {};
        settings.apiKeys = allKeys;
        await this.setStorageData({ settings });

        await this.updateStats();
      } else {
        throw new Error(result.error || 'Failed to save API keys');
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      this.showApiKeyStatus('Auto-save failed: ' + error.message, 'error');
    }
  }



  async testApiKeys() {
    try {
      this.showLoading(true);

      if (!this.currentApiKeys || this.currentApiKeys.length === 0) {
        this.showApiKeyStatus('No API keys to test', 'error');
        return;
      }

      // Initialize status tracking
      this.apiKeyStatuses = new Array(this.currentApiKeys.length).fill('testing');
      this.displayApiKeys();

      // Test each key individually
      let validKeys = 0;
      const testPromises = this.currentApiKeys.map(async (key, index) => {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            this.apiKeyStatuses[index] = 'valid';
            validKeys++;
          } else {
            this.apiKeyStatuses[index] = 'invalid';
            console.warn(`API key ${index + 1} test failed:`, response.status, response.statusText);
          }
        } catch (error) {
          this.apiKeyStatuses[index] = 'invalid';
          console.warn(`API key ${index + 1} test error:`, error);
        }

        // Update display after each test
        this.displayApiKeys();
      });

      await Promise.all(testPromises);

      // Show final status
      if (validKeys === this.currentApiKeys.length) {
        this.showApiKeyStatus(`All ${this.currentApiKeys.length} API keys are valid!`, 'success');
      } else if (validKeys > 0) {
        this.showApiKeyStatus(`${validKeys} out of ${this.currentApiKeys.length} API keys are valid`, 'error');
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

      // Preserve API keys in settings
      settings.apiKeys = this.currentApiKeys || [];
      settings.defaultModel = document.getElementById('defaultModel').value;
      settings.restrictToFiverr = document.getElementById('restrictToFiverr').checked;
      settings.autoSave = document.getElementById('autoSave').checked;
      settings.notifications = document.getElementById('notifications').checked;
      settings.keyRotation = document.getElementById('keyRotation').checked;
      settings.maxContextLength = parseInt(document.getElementById('maxContextLength').value);
      settings.dateFormat = document.getElementById('dateFormat').value;

      await this.setStorageData({ settings });
      this.showToast('Preferences saved');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      this.showToast('Failed to save preferences', 'error');
    }
  }

  async saveApiConfiguration() {
    try {
      // Get current settings
      const settings = await this.getStorageData('settings') || {};

      // Save API configuration
      settings.apiKeys = this.currentApiKeys || [];
      settings.defaultModel = document.getElementById('defaultModel').value;
      settings.keyRotation = document.getElementById('keyRotation').checked;
      settings.apiTimeout = parseInt(document.getElementById('apiTimeout').value);
      settings.maxRetries = parseInt(document.getElementById('maxRetries').value);

      // Save to storage
      await this.setStorageData({ settings });

      // Show success message
      this.showToast('API configuration saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save API configuration:', error);
      this.showToast('Failed to save API configuration', 'error');
    }
  }

  async saveAllSettings() {
    try {
      this.showLoading(true);

      // Save preferences first
      await this.savePreferences();

      // Try to save API keys to background, but don't fail if it doesn't work
      if (this.currentApiKeys && this.currentApiKeys.length > 0) {
        try {
          const result = await this.sendMessageToBackground({
            type: 'UPDATE_API_KEYS',
            keys: this.currentApiKeys
          });

          if (!result.success) {
            console.warn('Background API key save failed:', result.error);
            // Continue anyway since we saved to settings
          }
        } catch (error) {
          console.warn('Failed to communicate with background script:', error);
          // Continue anyway since we saved to settings
        }
      }

      // Save knowledge base (ensure it's persisted)
      const knowledgeBase = await this.getStorageData('knowledgeBase') || {};
      const kbSaveSuccess = await this.setStorageData({ knowledgeBase });
      if (!kbSaveSuccess) {
        throw new Error('Failed to save knowledge base');
      }

      // Save custom prompts (ensure they're persisted)
      const customPrompts = await this.getStorageData('customPrompts') || {};
      const promptsSaveSuccess = await this.setStorageData({ customPrompts });
      if (!promptsSaveSuccess) {
        throw new Error('Failed to save custom prompts');
      }

      // Save favorites (ensure they're persisted)
      const favoritesSaveSuccess = await this.setStorageData({
        favoritePrompts: Array.from(this.favoritePrompts)
      });
      if (!favoritesSaveSuccess) {
        throw new Error('Failed to save favorite prompts');
      }

      // Verify all data was saved correctly
      const verifyKB = await this.getStorageData('knowledgeBase');
      const verifyPrompts = await this.getStorageData('customPrompts');
      const verifyFavorites = await this.getStorageData('favoritePrompts');

      console.log('Verification - KB:', Object.keys(verifyKB || {}).length, 'Prompts:', Object.keys(verifyPrompts || {}).length, 'Favorites:', (verifyFavorites || []).length);

      this.showToast('All settings saved successfully! 🎉', 'success');
    } catch (error) {
      console.error('Failed to save all settings:', error);
      this.showToast('Failed to save settings: ' + error.message, 'error');
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
      try {
        // Check if extension context is valid before sending message
        if (!chrome.runtime?.id) {
          resolve({ success: false, error: 'Extension context invalidated' });
          return;
        }

        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            const errorMessage = chrome.runtime.lastError.message || 'Unknown runtime error';
            console.warn('Runtime error:', errorMessage);
            resolve({ success: false, error: errorMessage });
            return;
          }
          resolve(response || { success: false, error: 'No response from background script' });
        });
      } catch (error) {
        console.error('Failed to send message to background:', error);
        resolve({ success: false, error: error.message });
      }
    });
  }

  async getStorageData(keys) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            console.error('Storage get error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          // If keys is a string, return the value directly
          if (typeof keys === 'string') {
            resolve(result[keys]);
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        console.error('Storage get exception:', error);
        reject(error);
      }
    });
  }

  async setStorageData(data) {
    return new Promise((resolve, reject) => {
      try {
        // Validate data before saving
        if (!data || typeof data !== 'object') {
          console.error('Invalid data format for storage:', data);
          reject(new Error('Invalid data format for storage'));
          return;
        }

        // Check for circular references and clean data
        let cleanData = {};
        try {
          Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null) {
              // Test if value can be serialized
              JSON.stringify(data[key]);
              cleanData[key] = data[key];
            }
          });
        } catch (circularError) {
          console.error('Data contains circular references:', circularError);
          reject(new Error('Data contains circular references'));
          return;
        }

        // Use clean data without timestamps to avoid storage issues
        chrome.storage.local.set(cleanData, () => {
          if (chrome.runtime.lastError) {
            console.error('Storage set error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          console.log('Successfully saved to storage:', Object.keys(cleanData));
          resolve(true);
        });
      } catch (error) {
        console.error('Storage set exception:', error);
        reject(error);
      }
    });
  }

  // Clear any potential cache conflicts
  async clearStorageCache() {
    try {
      // Send message to content script to clear its cache
      await this.sendMessageToTab({ type: 'CLEAR_STORAGE_CACHE' });
    } catch (error) {
      console.warn('Could not clear content script cache:', error);
    }
  }

  // Force reload data from storage (bypassing any cache)
  async forceReloadFromStorage(key) {
    try {
      // Clear any potential cache first
      await this.clearStorageCache();

      // Get fresh data from storage
      const result = await chrome.storage.local.get([key, `${key}_timestamp`]);
      console.log(`Force reloaded ${key}:`, result[key], 'timestamp:', result[`${key}_timestamp`]);
      return result[key];
    } catch (error) {
      console.error(`Failed to force reload ${key}:`, error);
      return null;
    }
  }

  // Validation helper function
  validateStorageData(key, data) {
    switch (key) {
      case 'knowledgeBase':
        if (typeof data !== 'object' || data === null) {
          throw new Error('Knowledge base must be an object');
        }
        for (const [varKey, varValue] of Object.entries(data)) {
          if (typeof varKey !== 'string' || typeof varValue !== 'string') {
            throw new Error('Knowledge base variables must be strings');
          }
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varKey)) {
            throw new Error(`Invalid variable name: ${varKey}`);
          }
        }
        break;

      case 'customPrompts':
        if (typeof data !== 'object' || data === null) {
          throw new Error('Custom prompts must be an object');
        }
        for (const [promptKey, promptData] of Object.entries(data)) {
          if (typeof promptKey !== 'string' || typeof promptData !== 'object') {
            throw new Error('Invalid prompt data structure');
          }
          if (!promptData.name || !promptData.prompt) {
            throw new Error(`Prompt ${promptKey} missing required fields`);
          }
        }
        break;

      case 'favoritePrompts':
        if (!Array.isArray(data)) {
          throw new Error('Favorite prompts must be an array');
        }
        break;
    }
    return true;
  }

  // Fiverr-specific methods
  async fetchFiverrContacts() {
    try {
      this.showLoading(true);
      this.updateFiverrStatus('🔄', 'Fetching contacts...');

      const result = await this.sendMessageToTab({
        type: 'FETCH_FIVERR_CONTACTS'
      });

      if (result.success) {
        this.showToast('Contacts fetched successfully!');
        await this.loadStoredContacts();
      } else {
        throw new Error(result.error || 'Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      this.showToast('Failed to fetch contacts', 'error');
      this.updateFiverrStatus('❌', 'Failed to fetch contacts');
    } finally {
      this.showLoading(false);
    }
  }

  async extractCurrentConversation() {
    try {
      this.showLoading(true);
      this.updateFiverrStatus('🔄', 'Extracting conversation...');

      const result = await this.sendMessageToTab({
        type: 'EXTRACT_CURRENT_CONVERSATION'
      });

      if (result.success && result.data) {
        this.showToast('Conversation extracted successfully!');
        await this.loadStoredConversations();
        this.updateFiverrStatus('✅', 'Conversation extracted');
      } else {
        throw new Error(result.error || 'Failed to extract conversation');
      }
    } catch (error) {
      console.error('Failed to extract conversation:', error);
      this.showToast('Failed to extract conversation', 'error');
      this.updateFiverrStatus('❌', 'Failed to extract conversation');
    } finally {
      this.showLoading(false);
    }
  }

  async extractConversationByUsername(username) {
    try {
      this.showLoading(true);
      this.updateFiverrStatus('🔄', `Extracting conversation with ${username}...`);

      const result = await this.sendMessageToTab({
        type: 'EXTRACT_CONVERSATION_BY_USERNAME',
        username
      });

      if (result.success && result.data) {
        this.showToast(`Conversation with ${username} extracted successfully!`);
        await this.loadStoredConversations();
        this.updateFiverrStatus('✅', 'Conversation extracted');
      } else {
        throw new Error(result.error || 'Failed to extract conversation');
      }
    } catch (error) {
      console.error('Failed to extract conversation:', error);
      this.showToast(`Failed to extract conversation with ${username}`, 'error');
      this.updateFiverrStatus('❌', 'Failed to extract conversation');
    } finally {
      this.showLoading(false);
    }
  }

  async updateConversation(username) {
    try {
      this.showLoading(true);
      this.updateFiverrStatus('🔄', `Updating conversation with ${username}...`);

      const result = await this.sendMessageToTab({
        type: 'UPDATE_CONVERSATION',
        username
      });

      if (result.success && result.data) {
        const newMessages = result.data.newMessages || 0;
        this.showToast(`Updated conversation with ${username} (${newMessages} new messages)`);
        await this.loadStoredConversations();
        this.updateFiverrStatus('✅', 'Conversation updated');
      } else {
        throw new Error(result.error || 'Failed to update conversation');
      }
    } catch (error) {
      console.error('Failed to update conversation:', error);
      this.showToast(`Failed to update conversation with ${username}`, 'error');
      this.updateFiverrStatus('❌', 'Failed to update conversation');
    } finally {
      this.showLoading(false);
    }
  }

  async deleteConversation(username) {
    if (!confirm(`Are you sure you want to delete the conversation with ${username}?`)) {
      return;
    }

    try {
      this.showLoading(true);

      const result = await this.sendMessageToTab({
        type: 'DELETE_CONVERSATION',
        username
      });

      if (result.success) {
        this.showToast(`Conversation with ${username} deleted`);
        await this.loadStoredConversations();
      } else {
        throw new Error(result.error || 'Failed to delete conversation');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      this.showToast(`Failed to delete conversation with ${username}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }



  updateFiverrStatus(indicator, text) {
    const statusIndicator = document.getElementById('fiverrStatusIndicator');
    const statusText = document.getElementById('fiverrStatusText');

    if (statusIndicator) statusIndicator.textContent = indicator;
    if (statusText) statusText.textContent = text;
  }

  updateProgressInfo(text, counter = '') {
    const progressInfo = document.getElementById('progressInfo');
    const progressText = document.getElementById('progressText');
    const progressCounter = document.getElementById('progressCounter');

    if (progressInfo) {
      progressInfo.style.display = text ? 'block' : 'none';
    }
    if (progressText) progressText.textContent = text;
    if (progressCounter) progressCounter.textContent = counter;
  }

  async loadStoredConversations() {
    try {
      const result = await this.sendMessageToTab({
        type: 'GET_STORED_CONVERSATIONS'
      });

      if (result.success && result.data) {
        this.displayStoredConversations(result.data);
      }
    } catch (error) {
      console.error('Failed to load stored conversations:', error);
    }
  }

  displayStoredConversations(conversations) {
    const conversationsList = document.getElementById('conversationsList');
    if (!conversationsList) return;

    if (!conversations || conversations.length === 0) {
      conversationsList.innerHTML = '<div class="no-conversations">No conversations stored yet</div>';
      return;
    }

    conversationsList.innerHTML = conversations.map(conv => `
      <div class="conversation-item">
        <div class="conversation-info">
          <div class="conversation-name">${conv.username}</div>
          <div class="conversation-meta">
            ${conv.messageCount || 0} messages •
            Last extracted: ${new Date(conv.lastExtracted || 0).toLocaleDateString()}
          </div>
        </div>
        <div class="conversation-actions">
          <button class="btn-icon" onclick="popupManager.updateConversation('${conv.username}')" title="Update">🔄</button>
          <button class="btn-icon" onclick="popupManager.deleteConversation('${conv.username}')" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');
  }



  async loadStoredContacts() {
    try {
      const result = await this.sendMessageToTab({
        type: 'GET_STORED_CONTACTS'
      });

      if (result.success && result.data) {
        this.displayStoredContacts(result.data);
      }
    } catch (error) {
      console.error('Failed to load stored contacts:', error);
    }
  }

  displayStoredContacts(contactsData) {
    const contactsList = document.getElementById('contactsList');
    const contactsSection = document.getElementById('contactsSection');

    if (!contactsList || !contactsSection) return;

    const contacts = contactsData.contacts || [];

    if (contacts.length === 0) {
      contactsSection.style.display = 'none';
      return;
    }

    contactsSection.style.display = 'block';

    // Show first 20 contacts
    const displayContacts = contacts.slice(0, 20);

    contactsList.innerHTML = displayContacts.map(contact => `
      <div class="contact-item" onclick="popupManager.extractConversationByUsername('${contact.username}')">
        <div class="contact-info">
          <div class="contact-name">${contact.username}</div>
          <div class="contact-meta">
            Last message: ${new Date(contact.recentMessageDate).toLocaleDateString()}
          </div>
        </div>
        <div class="contact-actions">
          <button class="btn-icon" onclick="event.stopPropagation(); popupManager.extractConversationByUsername('${contact.username}')" title="Extract">💬</button>
        </div>
      </div>
    `).join('');

    if (contacts.length > 20) {
      contactsList.innerHTML += `
        <div class="contact-item" style="text-align: center; opacity: 0.7;">
          ... and ${contacts.length - 20} more contacts
        </div>
      `;
    }
  }

  handleRuntimeMessage(request, sender, sendResponse) {
    switch (request.type) {
      case 'CONTACTS_PROGRESS':
        this.updateProgressInfo(request.message, request.totalContacts ? `Total: ${request.totalContacts}` : '');
        if (request.isError) {
          this.updateFiverrStatus('❌', request.message);
        } else {
          this.updateFiverrStatus('🔄', request.message);
        }
        break;

      case 'CONTACTS_FETCHED':
        this.updateProgressInfo('');
        this.updateFiverrStatus('✅', request.message);
        this.loadStoredContacts();
        break;

      case 'EXTRACTION_PROGRESS':
        this.updateProgressInfo(request.message);
        this.updateFiverrStatus('🔄', request.message);
        break;

      case 'CONVERSATION_EXTRACTED':
        this.updateProgressInfo('');
        this.updateFiverrStatus('✅', request.message);
        this.loadStoredConversations();
        break;

      case 'CONVERSATION_UPDATED':
        this.updateProgressInfo('');
        this.updateFiverrStatus('✅', request.message);
        this.loadStoredConversations();
        break;

      case 'EXTRACTION_ERROR':
        this.updateProgressInfo('');
        this.updateFiverrStatus('❌', request.message);
        this.showToast(request.message, 'error');
        break;

      case 'CONTACTS_ERROR':
        this.updateProgressInfo('');
        this.updateFiverrStatus('❌', request.message);
        this.showToast(request.message, 'error');
        break;
    }
  }

  // Conversations Management Methods
  async loadConversations() {
    try {
      this.showLoading(true);

      // Get stored conversations from extension storage
      const result = await chrome.storage.local.get('fiverrConversations');
      let conversations = result.fiverrConversations || {};

      // Clean up invalid conversations
      conversations = await this.cleanupInvalidConversations(conversations);

      // Update stats
      this.updateConversationStats(conversations);

      // Render conversations list
      this.renderConversationsList(conversations);

      // Also update the dashboard conversations count (using valid conversations only)
      const validConversations = Object.entries(conversations).filter(([username, conversation]) => {
        return this.isValidConversation(username, conversation);
      });
      const conversationCount = validConversations.length;
      const totalConversationsElement = document.getElementById('totalConversations');
      if (totalConversationsElement) {
        totalConversationsElement.textContent = conversationCount;
      }

    } catch (error) {
      console.error('Failed to load conversations:', error);
      this.showToast('Failed to load conversations', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  updateConversationStats(conversations) {
    // Filter out invalid conversations for accurate count
    const validConversations = Object.entries(conversations).filter(([username, conversation]) => {
      return this.isValidConversation(username, conversation);
    });

    const conversationCount = validConversations.length;
    const storageSize = this.calculateStorageSize(conversations);

    document.getElementById('totalConversationsCount').textContent = conversationCount;
    document.getElementById('storageUsed').textContent = this.formatBytes(storageSize);
  }

  calculateStorageSize(conversations) {
    return new Blob([JSON.stringify(conversations)]).size;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  renderConversationsList(conversations) {
    const conversationsList = document.getElementById('conversationsList');

    // Filter out invalid conversations using the validation method
    const validConversations = Object.entries(conversations).filter(([username, conversation]) => {
      return this.isValidConversation(username, conversation);
    });

    if (validConversations.length === 0) {
      conversationsList.innerHTML = `
        <div class="conversations-empty">
          <div class="conversations-empty-icon">💬</div>
          <div class="conversations-empty-text">No conversations found</div>
          <div class="conversations-empty-subtext">Start chatting on Fiverr to see conversations here</div>
        </div>
      `;
      return;
    }

    const conversationItems = validConversations
      .sort(([,a], [,b]) => (b.lastExtracted || 0) - (a.lastExtracted || 0))
      .map(([username, conversation]) => this.createConversationItem(username, conversation))
      .join('');

    conversationsList.innerHTML = conversationItems;
  }

  createConversationItem(username, conversation) {
    const messageCount = conversation.messages?.length || 0;
    const lastMessage = conversation.messages?.length > 0
      ? conversation.messages[conversation.messages.length - 1]
      : null;

    // Format dates better
    const lastExtractedDate = new Date(conversation.lastExtracted || conversation.extractedAt);
    const formattedDate = this.formatRelativeDate(lastExtractedDate);
    const fullDate = lastExtractedDate.toLocaleString();

    // Create better preview
    const preview = lastMessage
      ? this.cleanMessagePreview(lastMessage.body)
      : 'No messages available';

    // Format username better
    const displayUsername = this.formatUsername(username);

    return `
      <div class="conversation-item" data-username="${username}" onclick="popupManager.showConversationModal('${username}')">
        <div class="conversation-left-column">
          <div class="conversation-item-header">
            <div class="conversation-username">${displayUsername}</div>
            <div class="conversation-date" title="${fullDate}">${formattedDate}</div>
          </div>
          <div class="conversation-stats">
            <span class="conversation-stat">💬 ${messageCount} messages</span>
          </div>
          <div class="conversation-stats">
            <span class="conversation-stat">🕒 ${formattedDate}</span>
          </div>
        </div>
        <div class="conversation-right-column">
          <div class="conversation-preview">${preview}</div>
        </div>
      </div>
    `;
  }

  // Helper methods for better formatting
  formatUsername(username) {
    // Replace underscores with spaces and capitalize
    return username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatRelativeDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  cleanMessagePreview(text) {
    if (!text) return 'No message content';

    // Remove extra whitespace and newlines
    const cleaned = text.replace(/\s+/g, ' ').trim();

    // Truncate to reasonable length
    if (cleaned.length > 120) {
      return cleaned.substring(0, 120) + '...';
    }

    return cleaned;
  }

  // Validation and cleanup methods
  isValidConversation(username, conversation) {
    // Filter out fake/invalid conversations
    if (username === 'FiverrConversations' || username === 'fiverrConversations') {
      return false;
    }

    // Must have valid username and conversation object
    if (!username || !conversation || typeof conversation !== 'object') {
      return false;
    }

    // Must have messages array
    if (!Array.isArray(conversation.messages)) {
      return false;
    }

    // Must have at least some basic data or messages
    if (conversation.messages.length === 0 && !conversation.lastExtracted) {
      return false;
    }

    return true;
  }

  async cleanupInvalidConversations(conversations) {
    const validConversations = {};
    let hasInvalidConversations = false;

    Object.entries(conversations).forEach(([username, conversation]) => {
      if (this.isValidConversation(username, conversation)) {
        validConversations[username] = conversation;
      } else {
        hasInvalidConversations = true;
        console.log(`Removing invalid conversation: ${username}`);
      }
    });

    // If we found invalid conversations, update storage
    if (hasInvalidConversations) {
      try {
        await chrome.storage.local.set({ fiverrConversations: validConversations });
        console.log('Cleaned up invalid conversations from storage');
      } catch (error) {
        console.error('Failed to cleanup invalid conversations:', error);
      }
    }

    return validConversations;
  }

  async showConversationModal(username) {
    try {
      this.currentConversationUsername = username;

      // Get conversation data
      const result = await chrome.storage.local.get('fiverrConversations');
      const conversations = result.fiverrConversations || {};
      const conversation = conversations[username];

      if (!conversation) {
        this.showToast('Conversation not found', 'error');
        return;
      }

      // Update modal title and meta
      document.getElementById('conversationModalTitle').textContent = `Conversation with ${username}`;
      document.getElementById('conversationModalMeta').textContent =
        `${conversation.messages?.length || 0} messages • Last updated: ${new Date(conversation.lastExtracted || conversation.extractedAt).toLocaleString()}`;

      // Render conversation content
      this.renderConversationContent(conversation);

      // Show modal
      document.getElementById('conversationModalOverlay').classList.add('active');

    } catch (error) {
      console.error('Failed to show conversation modal:', error);
      this.showToast('Failed to load conversation details', 'error');
    }
  }

  renderConversationContent(conversation) {
    const contentContainer = document.getElementById('conversationContent');

    if (!conversation.messages || conversation.messages.length === 0) {
      contentContainer.innerHTML = '<div class="conversations-empty">No messages in this conversation</div>';
      return;
    }

    const messagesHtml = conversation.messages.map(message => {
      const isUser = message.sender === conversation.username;
      const attachmentsHtml = message.attachments && message.attachments.length > 0
        ? `<div class="message-attachments">📎 Attachments: ${message.attachments.map(att => att.filename || 'Unknown file').join(', ')}</div>`
        : '';

      return `
        <div class="conversation-message ${isUser ? 'user' : 'client'}">
          <div class="message-header">
            <div class="message-sender">${message.sender || 'Unknown'}</div>
            <div class="message-time">${message.formattedTime || new Date(message.createdAt).toLocaleString()}</div>
          </div>
          <div class="message-body">${message.body || ''}</div>
          ${attachmentsHtml}
        </div>
      `;
    }).join('');

    contentContainer.innerHTML = messagesHtml;
  }

  closeConversationModal() {
    document.getElementById('conversationModalOverlay').classList.remove('active');
    this.currentConversationUsername = null;
  }

  async exportCurrentConversation() {
    if (!this.currentConversationUsername) {
      this.showToast('No conversation selected', 'error');
      return;
    }

    try {
      const format = document.getElementById('exportFormat').value;

      // Get conversation data
      const result = await chrome.storage.local.get('fiverrConversations');
      const conversations = result.fiverrConversations || {};
      const conversation = conversations[this.currentConversationUsername];

      if (!conversation) {
        this.showToast('Conversation not found', 'error');
        return;
      }

      // Generate export content based on format
      let content, filename, mimeType;

      switch (format) {
        case 'markdown':
          content = await this.convertToMarkdown(conversation);
          filename = `fiverr_conversation_${this.currentConversationUsername}_${new Date().toISOString().split('T')[0]}.md`;
          mimeType = 'text/markdown';
          break;

        case 'json':
          content = JSON.stringify(conversation, null, 2);
          filename = `fiverr_conversation_${this.currentConversationUsername}_${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;

        case 'txt':
          content = this.convertToText(conversation);
          filename = `fiverr_conversation_${this.currentConversationUsername}_${new Date().toISOString().split('T')[0]}.txt`;
          mimeType = 'text/plain';
          break;

        case 'csv':
          content = this.convertToCSV(conversation);
          filename = `fiverr_conversation_${this.currentConversationUsername}_${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;

        case 'html':
          content = this.convertToHTML(conversation);
          filename = `fiverr_conversation_${this.currentConversationUsername}_${new Date().toISOString().split('T')[0]}.html`;
          mimeType = 'text/html';
          break;

        default:
          this.showToast('Unsupported export format', 'error');
          return;
      }

      // Download the file
      this.downloadFile({ content, filename, mimeType });
      this.showToast(`Conversation exported as ${format.toUpperCase()}`, 'success');

    } catch (error) {
      console.error('Export failed:', error);
      this.showToast('Failed to export conversation', 'error');
    }
  }

  async convertToMarkdown(conversation) {
    let markdown = `# Conversation with ${conversation.username}\n\n`;
    markdown += `**Extracted:** ${new Date(conversation.extractedAt || conversation.lastExtracted).toLocaleString()}\n`;
    markdown += `**Total Messages:** ${conversation.messages?.length || 0}\n\n`;

    if (!conversation.messages || conversation.messages.length === 0) {
      markdown += 'No messages in this conversation.\n';
      return markdown;
    }

    for (const message of conversation.messages) {
      const timestamp = message.formattedTime || new Date(message.createdAt).toLocaleString();
      const sender = message.sender || 'Unknown';

      markdown += `### ${sender} (${timestamp})\n\n`;

      if (message.body) {
        markdown += `${message.body}\n\n`;
      }

      if (message.attachments && message.attachments.length > 0) {
        markdown += '**Attachments:**\n';
        for (const attachment of message.attachments) {
          const fileName = attachment.filename || 'Unnamed File';
          const fileSize = attachment.fileSize ? this.formatBytes(attachment.fileSize) : 'size unknown';
          markdown += `- ${fileName} (${fileSize})\n`;
        }
        markdown += '\n';
      }

      markdown += '---\n\n';
    }

    return markdown;
  }

  convertToText(conversation) {
    let text = `Conversation with ${conversation.username}\n`;
    text += `Extracted: ${new Date(conversation.extractedAt || conversation.lastExtracted).toLocaleString()}\n`;
    text += `Total Messages: ${conversation.messages?.length || 0}\n\n`;

    if (!conversation.messages || conversation.messages.length === 0) {
      text += 'No messages in this conversation.\n';
      return text;
    }

    conversation.messages.forEach(message => {
      const timestamp = message.formattedTime || new Date(message.createdAt).toLocaleString();
      const sender = message.sender || 'Unknown';

      text += `${sender} (${timestamp}):\n${message.body || ''}\n\n`;

      if (message.attachments && message.attachments.length > 0) {
        text += 'Attachments:\n';
        message.attachments.forEach(attachment => {
          text += `- ${attachment.filename || 'Unknown file'}\n`;
        });
        text += '\n';
      }
    });

    return text;
  }

  convertToCSV(conversation) {
    let csv = 'Timestamp,Sender,Message,Attachments\n';

    if (!conversation.messages || conversation.messages.length === 0) {
      return csv;
    }

    conversation.messages.forEach(message => {
      const timestamp = new Date(message.createdAt).toISOString();
      const sender = (message.sender || 'Unknown').replace(/"/g, '""');
      const body = (message.body || '').replace(/"/g, '""').replace(/\n/g, ' ');
      const attachments = message.attachments && message.attachments.length > 0
        ? message.attachments.map(att => att.filename || 'Unknown file').join('; ')
        : '';

      csv += `"${timestamp}","${sender}","${body}","${attachments}"\n`;
    });

    return csv;
  }

  convertToHTML(conversation) {
    let html = `<!DOCTYPE html>
<html>
<head>
    <title>Conversation with ${conversation.username}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
        .message.user { background-color: #e3f2fd; }
        .message.client { background-color: #f3e5f5; }
        .message-header { font-weight: bold; margin-bottom: 5px; }
        .message-time { font-size: 12px; color: #666; }
        .message-body { margin-top: 10px; white-space: pre-wrap; }
        .attachments { margin-top: 10px; font-style: italic; color: #666; }
    </style>
</head>
<body>
    <h1>Conversation with ${conversation.username}</h1>
    <p><strong>Extracted:</strong> ${new Date(conversation.extractedAt || conversation.lastExtracted).toLocaleString()}</p>
    <p><strong>Total Messages:</strong> ${conversation.messages?.length || 0}</p>
`;

    if (!conversation.messages || conversation.messages.length === 0) {
      html += '<p>No messages in this conversation.</p>';
    } else {
      conversation.messages.forEach(message => {
        const timestamp = new Date(message.createdAt).toLocaleString();
        const sender = message.sender || 'Unknown';
        const isUser = sender === conversation.username;

        html += `    <div class="message ${isUser ? 'user' : 'client'}">
        <div class="message-header">${sender}</div>
        <div class="message-time">${timestamp}</div>
        <div class="message-body">${(message.body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;

        if (message.attachments && message.attachments.length > 0) {
          html += `        <div class="attachments">Attachments: ${message.attachments.map(att => att.filename || 'Unknown file').join(', ')}</div>`;
        }

        html += `    </div>\n`;
      });
    }

    html += `</body>
</html>`;

    return html;
  }



  async deleteCurrentConversation() {
    if (!this.currentConversationUsername) {
      this.showToast('No conversation selected', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete the conversation with ${this.currentConversationUsername}?`)) {
      return;
    }

    try {
      // Get current conversations
      const result = await chrome.storage.local.get('fiverrConversations');
      const conversations = result.fiverrConversations || {};

      // Delete the conversation
      delete conversations[this.currentConversationUsername];

      // Save back to storage
      await chrome.storage.local.set({ fiverrConversations: conversations });

      // Close modal and refresh list
      this.closeConversationModal();
      await this.loadConversations();

      this.showToast('Conversation deleted successfully', 'success');

    } catch (error) {
      console.error('Failed to delete conversation:', error);
      this.showToast('Failed to delete conversation', 'error');
    }
  }

  async refreshCurrentConversation() {
    if (!this.currentConversationUsername) {
      this.showToast('No conversation selected', 'error');
      return;
    }

    try {
      this.showLoading(true);

      // Send message to content script to refresh this specific conversation
      const response = await this.sendMessageToTab({
        type: 'EXTRACT_CONVERSATION',
        username: this.currentConversationUsername,
        forceRefresh: true
      });

      if (response && response.success) {
        // Reload the modal with fresh data
        await this.showConversationModal(this.currentConversationUsername);
        await this.loadConversations();
        this.showToast('Conversation refreshed successfully', 'success');
      } else {
        this.showToast('Failed to refresh conversation', 'error');
      }

    } catch (error) {
      console.error('Failed to refresh conversation:', error);
      this.showToast('Failed to refresh conversation', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async clearAllConversations() {
    if (!confirm('Are you sure you want to delete ALL stored conversations? This action cannot be undone.')) {
      return;
    }

    try {
      this.showLoading(true);

      // Clear all conversations from storage
      await chrome.storage.local.set({ fiverrConversations: {} });

      // Refresh the conversations list
      await this.loadConversations();

      // Close modal if open
      if (this.currentConversationUsername) {
        this.closeConversationModal();
      }

      this.showToast('All conversations cleared successfully', 'success');

    } catch (error) {
      console.error('Failed to clear conversations:', error);
      this.showToast('Failed to clear conversations', 'error');
    } finally {
      this.showLoading(false);
    }
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (window.popupManager) {
    window.popupManager.handleRuntimeMessage(request, sender, sendResponse);
  }
});

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.popupManager = new PopupManager();
});
