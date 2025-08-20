/**
 * aiFiverr Main Content Script
 * Initializes and coordinates all extension functionality
 */

class AiFiverrMain {
  constructor() {
    this.isInitialized = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.init();
  }

  async init() {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initialize());
      } else {
        await this.initialize();
      }
    } catch (error) {
      console.error('aiFiverr initialization failed:', error);
      this.handleInitializationError(error);
    }
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('aiFiverr: Initializing extension...');

      // Check if extension context is valid
      if (!chrome.runtime?.id) {
        console.warn('aiFiverr: Extension context invalidated, cannot initialize');
        return;
      }

      // Check site restriction settings
      const shouldInitialize = await this.shouldInitializeOnCurrentSite();
      if (!shouldInitialize) {
        console.log('aiFiverr: Site restriction prevents initialization on this domain');
        return;
      }

      // Wait for required dependencies
      await this.waitForDependencies();

      // Initialize managers in order
      await this.initializeManagers();

      // Set up event listeners
      this.setupEventListeners();

      // Start monitoring
      this.startMonitoring();

      this.isInitialized = true;
      console.log('aiFiverr: Extension initialized successfully');

      // Add debugging info
      console.log('aiFiverr: Available global objects:', {
        promptSelector: !!window.promptSelector,
        fiverrDetector: !!window.fiverrDetector,
        fiverrInjector: !!window.fiverrInjector,
        storageManager: !!window.storageManager,
        textSelector: !!window.textSelector
      });

      // Let normal detection work - don't force it automatically
      console.log('aiFiverr: Extension ready. Use Ctrl+Shift+D to manually trigger detection if needed.');

      // Extension initialized - no background communication needed
      console.log('aiFiverr: Extension initialized for:', {
        url: window.location.href,
        pageType: fiverrDetector.pageType
      });

    } catch (error) {
      console.error('aiFiverr: Initialization error:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Check if current page is a Fiverr page
   */
  isFiverrPage() {
    return window.location.hostname.includes('fiverr.com');
  }

  /**
   * Check if extension should initialize on current site based on settings
   */
  async shouldInitializeOnCurrentSite() {
    try {
      // Check if extension context is valid first
      if (!chrome.runtime?.id) {
        console.warn('aiFiverr: Extension context invalidated, cannot check site restrictions');
        return false;
      }

      // Get settings from storage using the same method as popup
      const result = await chrome.storage.local.get(['settings']);
      const settings = result.settings || {};

      // Default to restricting to Fiverr only (restrictToFiverr: true)
      // If the setting is explicitly set to false, allow all sites
      const restrictToFiverr = settings.restrictToFiverr !== false;

      console.log('aiFiverr: Site restriction check:', {
        restrictToFiverr,
        currentHostname: window.location.hostname,
        isFiverrPage: this.isFiverrPage(),
        settingsRaw: settings,
        settingsRestrictValue: settings.restrictToFiverr,
        willInitialize: restrictToFiverr ? this.isFiverrPage() : true
      });

      if (restrictToFiverr) {
        // Only initialize on Fiverr pages
        return this.isFiverrPage();
      } else {
        // Initialize on all sites
        return true;
      }
    } catch (error) {
      console.error('aiFiverr: Error checking site restriction settings:', error);
      // Default to Fiverr only if there's an error
      return this.isFiverrPage();
    }
  }

  /**
   * Wait for required dependencies to be available
   */
  async waitForDependencies() {
    const dependencies = [
      'storageManager',
      'sessionManager',
      'apiKeyManager',
      'geminiClient',
      'knowledgeBaseManager',
      'fiverrDetector',
      'fiverrExtractor',
      'fiverrInjector',
      'exportImportManager',
      'promptSelector',
      'textSelector'
    ];

    const maxWait = 10000; // 10 seconds
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (waited < maxWait) {
      const missing = dependencies.filter(dep => !window[dep]);
      
      if (missing.length === 0) {
        return; // All dependencies available
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    const stillMissing = dependencies.filter(dep => !window[dep]);
    if (stillMissing.length > 0) {
      throw new Error(`Missing dependencies: ${stillMissing.join(', ')}`);
    }
  }

  /**
   * Initialize all managers
   */
  async initializeManagers() {
    // Initialize storage manager
    if (window.storageManager && !window.storageManager.initialized) {
      await window.storageManager.init?.();
    }

    // Initialize knowledge base manager
    if (window.knowledgeBaseManager && !window.knowledgeBaseManager.initialized) {
      await window.knowledgeBaseManager.init();
      window.knowledgeBaseManager.initialized = true;
    }

    // Initialize session manager
    if (window.sessionManager && !window.sessionManager.initialized) {
      await window.sessionManager.init();
    }

    // Initialize API key manager
    if (window.apiKeyManager && !window.apiKeyManager.initialized) {
      await window.apiKeyManager.init();
    }

    // Initialize Gemini client
    if (window.geminiClient && !window.geminiClient.initialized) {
      await window.geminiClient.init();
    }

    console.log('aiFiverr: All managers initialized');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for page navigation
    window.addEventListener('popstate', () => {
      this.handleNavigation();
    });

    // Listen for URL changes (for SPA navigation)
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.handleNavigation();
      }
    }, 1000);

    // Listen for extension messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open
    });

    // Listen for keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcut(e);
    });



    // Listen for custom events
    window.addEventListener('aifiverr:sessionCreated', (e) => {
      this.handleSessionCreated(e.detail);
    });

    window.addEventListener('aifiverr:elementsDetected', (e) => {
      this.handleElementsDetected(e.detail);
    });

    console.log('aiFiverr: Event listeners set up');
  }

  /**
   * Start monitoring for changes
   */
  startMonitoring() {
    // Monitor for new elements every 5 seconds
    setInterval(() => {
      if (window.fiverrDetector) {
        window.fiverrDetector.detectAllElements();
      }
    }, 5000);

    // Clean up old sessions every 10 minutes
    setInterval(() => {
      if (window.sessionManager) {
        window.sessionManager.cleanupOldSessions();
      }
    }, 10 * 60 * 1000);

    console.log('aiFiverr: Monitoring started');
  }

  /**
   * Handle page navigation
   */
  handleNavigation() {
    console.log('aiFiverr: Page navigation detected');
    
    // Update page type
    if (window.fiverrDetector) {
      window.fiverrDetector.pageType = window.fiverrDetector.detectPageType();
    }

    // Re-detect elements after navigation
    setTimeout(() => {
      if (window.fiverrDetector) {
        window.fiverrDetector.detectAllElements();
      }
    }, 1000);
  }

  /**
   * Safe message sending to background script with context validation
   */
  safeMessageToBackground(message, callback = null) {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.warn('aiFiverr: Extension context invalidated, cannot send message');
        return;
      }

      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('aiFiverr: Background message error:', chrome.runtime.lastError.message);
          if (callback) callback(null, chrome.runtime.lastError);
        } else {
          if (callback) callback(response, null);
        }
      });
    } catch (error) {
      console.warn('aiFiverr: Failed to send message to background:', error.message);
      if (callback) callback(null, error);
    }
  }

  /**
   * Handle extension messages
   */
  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.type) {
        case 'GET_PAGE_INFO':
          sendResponse({
            success: true,
            data: {
              url: window.location.href,
              pageType: window.fiverrDetector?.pageType,
              isInitialized: this.isInitialized
            }
          });
          break;

        case 'EXTRACT_CONVERSATION':
          const conversation = await window.fiverrExtractor?.extractConversation();
          sendResponse({ success: true, data: conversation });
          break;

        case 'EXTRACT_BRIEF':
          const brief = window.fiverrExtractor?.extractBriefDetails();
          sendResponse({ success: true, data: brief });
          break;

        case 'FETCH_ALL_CONTACTS':
          try {
            const contacts = await window.fiverrExtractor?.fetchAllContacts();
            sendResponse({ success: true, data: contacts });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GET_STORED_CONTACTS':
          try {
            const storedContacts = await window.fiverrExtractor?.getStoredContacts();
            sendResponse({ success: true, data: storedContacts });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;





        case 'PROCESS_PROMPT':
          const processedPrompt = await this.handleProcessPrompt(request.data);
          sendResponse({ success: true, data: processedPrompt });
          break;



        case 'FETCH_FIVERR_CONTACTS':
          const contactsResult = await this.handleFetchFiverrContacts();
          sendResponse({ success: true, data: contactsResult });
          break;

        case 'EXTRACT_CURRENT_CONVERSATION':
          const currentConversation = await this.handleExtractCurrentConversation();
          sendResponse({ success: true, data: currentConversation });
          break;

        case 'EXTRACT_CONVERSATION_BY_USERNAME':
          const conversationByUsername = await this.handleExtractConversationByUsername(request.username);
          sendResponse({ success: true, data: conversationByUsername });
          break;

        case 'UPDATE_CONVERSATION':
          const updatedConversation = await this.handleUpdateConversation(request.username);
          sendResponse({ success: true, data: updatedConversation });
          break;

        case 'DELETE_CONVERSATION':
          const deleteResult = await this.handleDeleteConversation(request.username);
          sendResponse({ success: true, data: deleteResult });
          break;

        case 'GET_STORED_CONVERSATIONS':
          const storedConversations = await this.handleGetStoredConversations();
          sendResponse({ success: true, data: storedConversations });
          break;

        case 'GET_STORED_CONTACTS':
          const storedContacts = await this.handleGetStoredContacts();
          sendResponse({ success: true, data: storedContacts });
          break;

        case 'CLEAR_STORAGE_CACHE':
          // Clear storage manager cache to prevent conflicts
          if (window.storageManager && window.storageManager.cache) {
            window.storageManager.cache.clear();
            console.log('Storage cache cleared');
          }
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcut(e) {
    // Ctrl/Cmd + Shift + A: Open AI assistant
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      this.toggleFloatingWidget();
    }

    // Ctrl+Shift+G shortcut removed - use message icon instead
  }




  /**
   * Toggle floating widget
   */
  toggleFloatingWidget() {
    if (window.fiverrInjector?.floatingWidget) {
      const panel = window.fiverrInjector.floatingWidget.querySelector('.widget-panel');
      const isVisible = panel.style.display !== 'none';
      panel.style.display = isVisible ? 'none' : 'block';
    }
  }

  // showPromptSelectorForInput removed - use message icon instead

  // generateReplyForInput removed - use message icon instead

  /**
   * Handle session creation
   */
  handleSessionCreated(sessionData) {
    console.log('aiFiverr: New session created:', sessionData.sessionId);
  }

  /**
   * Handle elements detection
   */
  handleElementsDetected(detail) {
    console.log('aiFiverr: Elements detected:', detail);
  }



  /**
   * Handle process prompt request
   */
  async handleProcessPrompt(data) {
    const { promptKey, additionalContext = {}, language } = data;

    try {
      // Add language to additional context if provided
      if (language) {
        additionalContext.language = language;
      }

      // Process prompt with Fiverr context
      const processedPrompt = await window.knowledgeBaseManager?.processPromptWithFiverrContext(promptKey, additionalContext);

      return { processedPrompt };
    } catch (error) {
      console.error('Failed to process prompt:', error);
      throw error;
    }
  }

  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    this.retryCount++;
    
    if (this.retryCount < this.maxRetries) {
      console.log(`aiFiverr: Retrying initialization (${this.retryCount}/${this.maxRetries})...`);
      setTimeout(() => this.initialize(), 2000 * this.retryCount);
    } else {
      console.error('aiFiverr: Failed to initialize after maximum retries');
      
      // Show error notification to user
      this.showErrorNotification('aiFiverr extension failed to initialize. Please refresh the page.');
    }
  }

  /**
   * Show error notification
   */
  showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'aifiverr-error-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #e74c3c;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }

  // Fiverr-specific handlers


  async handleFetchFiverrContacts() {
    try {
      if (!window.fiverrExtractor) {
        throw new Error('Fiverr extractor not available');
      }

      return await window.fiverrExtractor.fetchAllContacts();
    } catch (error) {
      console.error('Failed to fetch Fiverr contacts:', error);
      throw error;
    }
  }

  async handleExtractCurrentConversation() {
    try {
      if (!window.fiverrExtractor) {
        throw new Error('Fiverr extractor not available');
      }

      return await window.fiverrExtractor.extractConversation(true); // Force refresh
    } catch (error) {
      console.error('Failed to extract current conversation:', error);
      throw error;
    }
  }

  async handleExtractConversationByUsername(username) {
    try {
      if (!window.fiverrExtractor) {
        throw new Error('Fiverr extractor not available');
      }

      return await window.fiverrExtractor.extractConversationByUsername(username, true);
    } catch (error) {
      console.error('Failed to extract conversation by username:', error);
      throw error;
    }
  }

  async handleUpdateConversation(username) {
    try {
      if (!window.fiverrExtractor) {
        throw new Error('Fiverr extractor not available');
      }

      return await window.fiverrExtractor.updateConversation(username);
    } catch (error) {
      console.error('Failed to update conversation:', error);
      throw error;
    }
  }

  async handleDeleteConversation(username) {
    try {
      if (!window.fiverrExtractor) {
        throw new Error('Fiverr extractor not available');
      }

      return await window.fiverrExtractor.deleteStoredConversation(username);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }



  async handleGetStoredConversations() {
    try {
      if (!window.fiverrExtractor) {
        return [];
      }

      return window.fiverrExtractor.getAllStoredConversations();
    } catch (error) {
      console.error('Failed to get stored conversations:', error);
      return [];
    }
  }

  async handleGetStoredContacts() {
    try {
      if (!window.fiverrExtractor) {
        return { contacts: [], totalCount: 0, lastFetched: 0 };
      }

      return await window.fiverrExtractor.getStoredContacts();
    } catch (error) {
      console.error('Failed to get stored contacts:', error);
      return { contacts: [], totalCount: 0, lastFetched: 0 };
    }
  }

  /**
   * Cleanup on page unload
   */
  cleanup() {
    if (window.fiverrDetector) {
      window.fiverrDetector.cleanup();
    }

    if (window.fiverrInjector) {
      window.fiverrInjector.cleanup();
    }
  }
}

// Initialize extension when script loads
const aiFiverrMain = new AiFiverrMain();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  aiFiverrMain.cleanup();
});
