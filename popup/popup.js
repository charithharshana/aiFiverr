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

    // Export/Import actions
    document.getElementById('exportAllData')?.addEventListener('click', () => {
      this.exportData('all');
    });

    document.getElementById('exportSessions')?.addEventListener('click', () => {
      this.exportData('sessions');
    });

    document.getElementById('exportConversations')?.addEventListener('click', () => {
      this.exportData('conversations');
    });

    // Fiverr conversation extraction actions
    document.getElementById('fetchContactsBtn')?.addEventListener('click', () => {
      this.fetchFiverrContacts();
    });

    document.getElementById('extractCurrentBtn')?.addEventListener('click', () => {
      this.extractCurrentConversation();
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

    // Global save button
    document.getElementById('globalSaveBtn')?.addEventListener('click', () => {
      this.saveAllSettings();
    });
  }

  async initializeUI() {
    // Load settings (this includes knowledge base and prompts)
    await this.loadSettings();

    // Load sessions
    await this.loadSessions();

    // Update status
    this.updateStatus();
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
      case 'sessions':
        this.loadSessions();
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

      // Load knowledge base
      await this.loadKnowledgeBase();

      // Load prompt management
      await this.loadPrompts();

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
        'bio': 'Your professional bio and background information',
        'services': 'List of services you offer',
        'portfolio': 'Links to your portfolio or previous work',
        'custom1': 'Custom field 1 - Add any specific information like project goals, availability, or desired tone',
        'custom2': 'Custom field 2 - Add any specific information like updates, timeline, or special requirements',
        'availability': 'Your current availability and working hours',
        'experience': 'Your years of experience and expertise',
        'rates': 'Your pricing and rate information',
        'contact': 'Your contact information and preferred communication methods'
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
            this.showToast(`Auto-populated ${Object.keys(knowledgeBase).length} variables from default prompts`, 'success');
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
        prompt: `You are an expert freelance assistant. Your goal is to generate a professional, friendly, and concise reply to a potential client's initial message.

**Analyze this context:**
*   **Client's Message:** {conversation}
*   **Client's Username:** {username}
*   **My Professional Bio:** {{bio}}
*   **My Services:** {{services}}
*   **My Portfolio:** {{portfolio}}
*   **Custom Information:** {{custom1}}

**Based on the context, generate a reply that:**
1. Greets the client by their {username}.
2. Acknowledges and shows understanding of their core request from the {conversation}.
3. Intelligently incorporates a relevant point from my {{bio}} or mentions a specific service from {{services}} that fits their need. Do not just list them.
4. Suggests a clear next step (e.g., asking a key question, suggesting a call).
5. Maintains a helpful, confident, and professional tone.
6. Provides the reply directly, without any extra explanations.`
      },
      'project_summary': {
        name: 'Project Summary',
        description: 'Analyze conversation and extract key details into a structured, concise summary',
        prompt: `You are a project management assistant. Analyze the following conversation and extract the key details into a structured, concise summary.

**Conversation to Analyze:**
{conversation}

**Generate the summary using this exact format:**
*   **Project Overview:** A one-sentence summary of the client's primary goal.
*   **Key Deliverables:** A bulleted list of the specific items the client expects.
*   **Client Preferences:** A bulleted list of specific instructions or requirements mentioned.
*   **Key Decisions Made:** A bulleted list of important agreements or changes confirmed.
*   **Budget & Pricing:** Any mention of financial agreements. State "Not discussed" if absent.
*   **Deadlines & Timeline:** Any specific dates or time frames mentioned. State "Not discussed" if absent.
*   **Next Action Items:** What needs to be done next, and by whom.`
      },
      'follow_up_message': {
        name: 'Follow-up Message',
        description: 'Draft a concise and effective follow-up message to a client based on conversation history',
        prompt: `You are a professional freelance communicator. Your goal is to draft a concise and effective follow-up message to a client based on our conversation history.

**Use this project context:**
*   **Conversation History:** {conversation}
*   **Purpose of this follow-up:** {{custom1}}
*   **My availability or updates:** {{custom2}}

**Draft a follow-up message that:**
1. Is friendly and professional.
2. Directly addresses the purpose described in {{custom1}}.
3. Briefly references a specific part of the project from the {conversation} to show context.
4. Includes a clear, simple call to action.
5. If provided, briefly mentions my availability or updates from {{custom2}}.
6. Provides the reply directly, without any extra explanations.`
      },
      'project_proposal': {
        name: 'Project Proposal',
        description: 'Transform raw notes into a clear, professional, and persuasive project proposal message',
        prompt: `You are a skilled proposal writer. Your task is to transform my raw notes into a clear, professional, and persuasive project proposal message for a client.

**Analyze this information:**
*   **Client's Username:** {username}
*   **Conversation History:** {conversation}
*   **My Proposal Notes (Scope, Timeline, Price):** {proposal}
*   **My Professional Bio:** {{bio}}
*   **Relevant Portfolio Links:** {{portfolio}}

**Generate a proposal message that follows this structure:**
1.  **Personalized Greeting:** Start with a friendly greeting to {username}.
2.  **Summary of Understanding:** Briefly state your understanding of their project goal, based on the {conversation}.
3.  **The Proposal:** Clearly present the information from the {proposal} notes, using clear headings like "Scope," "Timeline," and "Investment."
4.  **Why Me:** Subtly weave in a relevant point from your {{bio}} to build confidence.
5.  **Proof of Work:** Naturally include a link to a relevant project from your {{portfolio}}.
6.  **Clear Call to Action:** End with a clear next step, such as inviting them to ask questions or accept the offer.`
      },
      'translate_and_explain': {
        name: 'Translate and Explain Message',
        description: 'Translate text and provide a simple explanation of its content',
        prompt: `You are an expert multilingual assistant. Your task is to translate the given text and provide a simple explanation of its content.

**Analyze this information:**
*   **Text to Analyze:** {conversation}
*   **Translate to Language:** {language}

**Provide your response in the following structured format:**

**Simple Explanation (in English):**
*   **Main Goal:** What is the sender trying to achieve?
*   **Key Points:** What are the most important pieces of information or questions?
*   **Tone:** Is the sender formal, informal, happy, urgent?

---

**Full Translation (in {language}):**
[Provide the accurate and natural-sounding translation of the entire text here]`
      },
      'refine_and_translate': {
        name: 'Refine and Translate My Message',
        description: 'Refine draft message for clarity and professionalism, then translate to requested language',
        prompt: `You are an expert multilingual editor and translator. Your task is to first refine the provided draft message for clarity, professionalism, and grammar, and then translate the improved version into the requested language.

**Analyze this information:**
*   **My Draft Message:** {conversation}
*   **Translate to Language:** {language}

**Perform the following steps:**
1.  Silently review and refine the "My Draft Message" to make it more professional and effective. Correct all spelling and grammar mistakes.
2.  Provide a perfect translation of that REFINED message into the target {language}.

**Your output should ONLY be the final, translated text. Do not include the English version or any explanations.**`
      },
      'refine_message': {
        name: 'Refine My Message (No Translation)',
        description: 'Refine draft message to improve quality, clarity, and impact without translation',
        prompt: `You are an expert copy editor and communication coach. Your task is to refine the following draft message to improve its quality, clarity, and impact.

**Analyze this information:**
*   **My Draft Message:** {conversation}
*   **Desired Tone/Goal:** {{custom1}} (e.g., "more professional," "more friendly," "more persuasive," "more concise")

**Based on the instructions, refine the draft by:**
1. Correcting all spelling, grammar, and punctuation errors.
2. Improving clarity, flow, and conciseness.
3. Adjusting the tone to be more {{custom1}}.
4. Retaining the original core meaning of the message.

**Your output should ONLY be the final, refined message. Do not provide explanations or comments about the changes made.**`
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

      if (type === 'conversations') {
        // Export only Fiverr conversations
        const result = await this.sendMessageToTab({
          type: 'EXPORT_FIVERR_CONVERSATIONS',
          format
        });

        if (result.success && result.data) {
          this.downloadFile(result.data);
          this.showToast('Conversations exported successfully!');
        } else {
          throw new Error('Failed to export conversations');
        }
      } else {
        // Export all data or sessions
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

  async exportSingleConversation(username, format = 'markdown') {
    try {
      this.showLoading(true);

      const result = await this.sendMessageToTab({
        type: 'EXPORT_SINGLE_CONVERSATION',
        username,
        format
      });

      if (result.success && result.data) {
        this.downloadFile(result.data);
        this.showToast(`Conversation with ${username} exported successfully!`);
      } else {
        throw new Error(result.error || 'Failed to export conversation');
      }
    } catch (error) {
      console.error('Failed to export conversation:', error);
      this.showToast(`Failed to export conversation with ${username}`, 'error');
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
          <button class="btn-icon" onclick="popupManager.exportSingleConversation('${conv.username}', 'markdown')" title="Export">📤</button>
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
