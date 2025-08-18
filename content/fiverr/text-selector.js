/**
 * Text Selection Handler for aiFiverr Extension
 * Detects text selection, copies to clipboard, and shows floating action icon
 */

class TextSelector {
  constructor() {
    this.isActive = false;
    this.currentSelection = null;
    this.floatingIcon = null;
    this.contextMenu = null;
    this.selectedText = '';
    this.selectionRect = null;
    this.hideTimeout = null;
    
    this.init();
  }

  /**
   * Initialize text selection handler
   */
  init() {
    console.log('aiFiverr: Initializing text selector...');
    this.setupEventListeners();
    this.createFloatingIcon();
    this.isActive = true;
  }

  /**
   * Setup event listeners for text selection
   */
  setupEventListeners() {
    // Listen for text selection events
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // Hide floating icon when clicking elsewhere
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    
    // Handle window resize
    window.addEventListener('resize', () => this.hideFloatingIcon());
    
    // Handle scroll
    document.addEventListener('scroll', () => this.hideFloatingIcon(), true);
  }

  /**
   * Handle mouse up events (end of selection)
   */
  async handleMouseUp(e) {
    // Small delay to ensure selection is complete
    setTimeout(async () => {
      await this.checkSelection(e);
    }, 10);
  }

  /**
   * Handle keyboard selection (Shift+Arrow keys, Ctrl+A, etc.)
   */
  async handleKeyUp(e) {
    // Check for selection-related keys
    if (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
        e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
        (e.ctrlKey && e.key === 'a')) {
      setTimeout(async () => {
        await this.checkSelection(e);
      }, 10);
    }
  }

  /**
   * Handle mouse down events to hide icon when clicking elsewhere
   */
  handleMouseDown(e) {
    if (this.floatingIcon && !this.floatingIcon.contains(e.target) && 
        this.contextMenu && !this.contextMenu.contains(e.target)) {
      this.hideFloatingIcon();
    }
  }

  /**
   * Check current text selection and handle it
   */
  async checkSelection(e) {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      this.hideFloatingIcon();
      return;
    }

    const selectedText = selection.toString().trim();
    console.log('aiFiverr: Text selected:', selectedText.length, 'characters');

    // Minimum text length requirement
    if (selectedText.length < 3) {
      console.log('aiFiverr: Text too short, hiding icon');
      this.hideFloatingIcon();
      return;
    }

    // Check if selection is within Fiverr content areas
    const isValid = this.isValidSelectionArea(selection);
    console.log('aiFiverr: Selection area valid:', isValid);

    if (!isValid) {
      this.hideFloatingIcon();
      return;
    }

    console.log('aiFiverr: Showing floating icon for selected text');
    this.selectedText = selectedText;
    this.currentSelection = selection;

    // Copy to clipboard
    await this.copyToClipboard(selectedText);

    // Get selection position
    const range = selection.getRangeAt(0);
    this.selectionRect = range.getBoundingClientRect();
    console.log('aiFiverr: Selection rect:', this.selectionRect);

    // Show floating icon
    this.showFloatingIcon();
  }

  /**
   * Check if selection is in a valid area (not in input fields, etc.)
   */
  isValidSelectionArea(selection) {
    if (!selection.rangeCount) return false;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;

    console.log('aiFiverr: Checking selection area:', element.tagName, element.className);

    // Avoid selecting from input fields, textareas, or contenteditable elements
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' ||
        element.contentEditable === 'true') {
      console.log('aiFiverr: Selection in input field, rejecting');
      return false;
    }

    // Check if we're in a valid content area
    // For Fiverr pages, check specific selectors
    if (window.location.hostname.includes('fiverr.com')) {
      const fiverrContent = element.closest('[class*="conversation"], [class*="message"], [class*="brief"], [class*="description"], [class*="content"], .inbox-view, .order-page');
      const isValid = !!fiverrContent;
      console.log('aiFiverr: Fiverr content check:', isValid);
      if (isValid) return true;

      // Be more permissive on Fiverr - allow selection in most text areas
      const generalContent = element.closest('div, p, span, article, section, main, td, th, li');
      if (generalContent) {
        console.log('aiFiverr: General content area found on Fiverr');
        return true;
      }
    }

    // For test pages or other domains, allow selection in elements with specific classes
    const testContent = element.closest('.selectable-text, .conversation, .message, .brief, .description, .content');
    if (testContent) {
      console.log('aiFiverr: Test content area found');
      return true;
    }

    // Allow selection in general content areas (paragraphs, divs, etc.)
    const contentTags = ['P', 'DIV', 'SPAN', 'ARTICLE', 'SECTION', 'MAIN', 'TD', 'TH', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
    const isValidTag = contentTags.includes(element.tagName);
    console.log('aiFiverr: Content tag check:', isValidTag, element.tagName);
    return isValidTag;
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      console.log('aiFiverr: Text copied to clipboard:', text.substring(0, 50) + '...');
    } catch (error) {
      console.error('aiFiverr: Failed to copy to clipboard:', error);
    }
  }

  /**
   * Create floating action icon - SAME AS CHAT ICON
   */
  createFloatingIcon() {
    // Create button exactly like the chat icon
    this.floatingIcon = document.createElement('button');
    this.floatingIcon.className = 'aifiverr-text-selection-icon';
    this.floatingIcon.innerHTML = '💬'; // Same icon as chat
    this.floatingIcon.title = 'AI Text Actions';

    // Style exactly like the chat icon - no background
    Object.assign(this.floatingIcon.style, {
      background: 'none',
      border: 'none',
      fontSize: '18px',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      transition: 'all 0.2s ease',
      opacity: '0.7',
      position: 'fixed',
      zIndex: '10000',
      display: 'none'
    });

    // Hover effect - exactly like chat icon
    this.floatingIcon.addEventListener('mouseenter', () => {
      this.floatingIcon.style.opacity = '1';
      this.floatingIcon.style.transform = 'scale(1.1)';
    });

    this.floatingIcon.addEventListener('mouseleave', () => {
      this.floatingIcon.style.opacity = '0.7';
      this.floatingIcon.style.transform = 'scale(1)';
    });

    // Add click handler
    this.floatingIcon.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('aiFiverr: Text selection icon clicked');

      try {
        await this.showContextMenu();
      } catch (error) {
        console.error('aiFiverr: Error showing context menu:', error);
        this.showErrorMessage('Failed to show AI menu. Please try again.');
      }
    });

    document.body.appendChild(this.floatingIcon);
  }

  /**
   * Position dropdown relative to icon - SAME AS CHAT DROPDOWN
   */
  positionDropdown() {
    if (!this.contextMenu || !this.floatingIcon) return;

    const iconRect = this.floatingIcon.getBoundingClientRect();
    const dropdownHeight = this.contextMenu.offsetHeight || 200;
    const viewportHeight = window.innerHeight;
    const spaceAbove = iconRect.top;
    const spaceBelow = viewportHeight - iconRect.bottom;

    // Position above icon if there's more space above, otherwise below
    if (spaceAbove > spaceBelow && spaceAbove > dropdownHeight + 20) {
      // Position above
      this.contextMenu.style.top = (iconRect.top - dropdownHeight - 4) + 'px';
    } else {
      // Position below
      this.contextMenu.style.top = (iconRect.bottom + 4) + 'px';
    }

    // Center horizontally relative to icon
    const iconCenterX = iconRect.left + (iconRect.width / 2);
    const dropdownWidth = this.contextMenu.offsetWidth || 200;
    let left = iconCenterX - (dropdownWidth / 2);

    // Keep within viewport
    const viewportWidth = window.innerWidth;
    if (left < 8) left = 8;
    if (left + dropdownWidth > viewportWidth - 8) {
      left = viewportWidth - dropdownWidth - 8;
    }

    this.contextMenu.style.left = left + 'px';
  }

  /**
   * Show floating icon near selection
   */
  showFloatingIcon() {
    if (!this.floatingIcon || !this.selectionRect) return;

    // Clear any existing hide timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Calculate position (top-right of selection)
    const iconSize = 36;
    const margin = 8;
    
    let left = this.selectionRect.right + margin;
    let top = this.selectionRect.top - margin;

    // Ensure icon stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left + iconSize > viewportWidth) {
      left = this.selectionRect.left - iconSize - margin;
    }

    if (top < 0) {
      top = this.selectionRect.bottom + margin;
    }

    if (top + iconSize > viewportHeight) {
      top = viewportHeight - iconSize - margin;
    }

    // Position and show icon
    this.floatingIcon.style.left = `${left}px`;
    this.floatingIcon.style.top = `${top}px`;
    this.floatingIcon.style.display = 'block';
  }

  /**
   * Hide floating icon
   */
  hideFloatingIcon() {
    if (this.floatingIcon) {
      this.floatingIcon.style.display = 'none';
    }

    if (this.contextMenu) {
      this.contextMenu.style.display = 'none';
    }

    // Clear selection
    this.selectedText = '';
    this.currentSelection = null;
    this.selectionRect = null;
  }

  /**
   * Show context menu with AI prompts - SAME AS CHAT DROPDOWN
   */
  async showContextMenu() {
    console.log('aiFiverr: Attempting to show dropdown...');

    // Wait for prompt selector to be available
    if (!await this.waitForPromptSelector()) {
      console.error('aiFiverr: Prompt selector not available after waiting');
      this.showErrorMessage('AI prompts are not ready yet. Please try again in a moment.');
      return;
    }

    // Create dropdown if it doesn't exist
    if (!this.contextMenu) {
      this.createDropdown();
    }

    // Toggle dropdown visibility
    const isVisible = this.contextMenu.style.display === 'block';
    if (isVisible) {
      this.contextMenu.style.display = 'none';
    } else {
      // Load prompts and show dropdown
      await this.populateDropdown();
      this.contextMenu.style.display = 'block';

      // Position dropdown relative to icon
      this.positionDropdown();
    }
  }

  /**
   * Wait for prompt selector to be available and initialized
   */
  async waitForPromptSelector() {
    const maxWait = 5000; // 5 seconds
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (waited < maxWait) {
      if (window.promptSelector &&
          window.promptSelector.allPrompts &&
          Object.keys(window.promptSelector.allPrompts).length > 0) {
        console.log('aiFiverr: Prompt selector is ready');
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    console.error('aiFiverr: Prompt selector not ready after', maxWait, 'ms');
    return false;
  }

  /**
   * Create dropdown menu - SAME AS CHAT DROPDOWN
   */
  createDropdown() {
    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'aifiverr-text-selection-dropdown';

    // Style exactly like chat dropdown
    Object.assign(this.contextMenu.style, {
      position: 'fixed',
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: '10001',
      minWidth: '200px',
      maxWidth: '300px',
      maxHeight: '300px',
      overflowY: 'auto',
      display: 'none',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    document.body.appendChild(this.contextMenu);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.contextMenu.contains(e.target) && e.target !== this.floatingIcon) {
        this.contextMenu.style.display = 'none';
      }
    });
  }

  /**
   * Add styles for context menu
   */
  addContextMenuStyles() {
    if (document.getElementById('aifiverr-context-menu-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'aifiverr-context-menu-styles';
    styles.textContent = `
      .aifiverr-text-selection-menu {
        position: fixed;
        z-index: 10001;
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        border: 1px solid #e1e8ed;
        min-width: 250px;
        max-width: 300px;
        max-height: 400px;
        overflow: hidden;
        animation: aifiverr-slideIn 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .aifiverr-text-selection-menu .menu-header {
        background: linear-gradient(135deg, #1dbf73 0%, #19a463 100%);
        color: white;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        font-size: 14px;
      }

      .aifiverr-text-selection-menu .menu-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s ease;
      }

      .aifiverr-text-selection-menu .menu-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .aifiverr-text-selection-menu .menu-content {
        max-height: 320px;
        overflow-y: auto;
      }

      .aifiverr-text-selection-menu .menu-loading {
        padding: 20px;
        text-align: center;
        color: #666;
        font-size: 14px;
      }

      .aifiverr-text-selection-menu .prompt-item {
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .aifiverr-text-selection-menu .prompt-item:hover {
        background: #f8f9fa;
      }

      .aifiverr-text-selection-menu .prompt-item:last-child {
        border-bottom: none;
      }

      .aifiverr-text-selection-menu .prompt-name {
        font-weight: 600;
        font-size: 14px;
        color: #2c3e50;
        margin-bottom: 4px;
      }

      .aifiverr-text-selection-menu .prompt-description {
        font-size: 12px;
        color: #666;
        line-height: 1.4;
      }

      @keyframes aifiverr-slideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    
    document.head.appendChild(styles);
  }



  /**
   * Populate dropdown with prompts - SAME AS CHAT DROPDOWN
   */
  async populateDropdown() {
    try {
      console.log('aiFiverr: Populating dropdown with prompts...');

      // Get prompts from prompt selector
      await window.promptSelector.loadPrompts();
      const prompts = window.promptSelector.allPrompts;
      const favoritePrompts = window.promptSelector.favoritePrompts || [];

      console.log('aiFiverr: Available prompts:', Object.keys(prompts).length);

      if (!prompts || Object.keys(prompts).length === 0) {
        this.contextMenu.innerHTML = '<div style="padding: 12px; color: #666;">No prompts available</div>';
        return;
      }

      // Clear dropdown
      this.contextMenu.innerHTML = '';

      // Add favorite prompts first
      if (Array.isArray(favoritePrompts)) {
        favoritePrompts.forEach(promptKey => {
          const prompt = prompts[promptKey];
          if (prompt) {
            const item = this.createDropdownItem(promptKey, prompt);
            this.contextMenu.appendChild(item);
          }
        });
      }

      // Add other prompts (limit to avoid overwhelming)
      const otherPrompts = Object.keys(prompts).filter(key => !favoritePrompts.includes(key));
      otherPrompts.slice(0, 5).forEach(promptKey => {
        const prompt = prompts[promptKey];
        if (prompt) {
          const item = this.createDropdownItem(promptKey, prompt);
          this.contextMenu.appendChild(item);
        }
      });

      console.log('aiFiverr: Dropdown populated with', this.contextMenu.children.length, 'items');

    } catch (error) {
      console.error('aiFiverr: Failed to populate dropdown:', error);
      this.contextMenu.innerHTML = '<div style="padding: 12px; color: #dc3545;">Failed to load prompts</div>';
    }
  }

  /**
   * Create dropdown item - SAME AS CHAT DROPDOWN
   */
  createDropdownItem(promptKey, prompt) {
    const item = document.createElement('div');
    item.className = 'aifiverr-dropdown-item';
    item.dataset.promptKey = promptKey;

    // Style like chat dropdown items
    Object.assign(item.style, {
      padding: '12px 16px',
      cursor: 'pointer',
      borderBottom: '1px solid #f3f4f6',
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'background-color 0.2s ease'
    });

    // Create content
    const name = document.createElement('div');
    name.style.fontWeight = '500';
    name.style.color = '#374151';
    name.textContent = prompt.name || promptKey;

    const description = document.createElement('div');
    description.style.fontSize = '12px';
    description.style.color = '#6b7280';
    description.style.marginTop = '2px';
    description.textContent = prompt.description || 'No description';

    item.appendChild(name);
    item.appendChild(description);

    // Hover effect
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f9fafb';
    });

    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });

    // Click handler
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('aiFiverr: Dropdown item clicked:', promptKey);
      this.contextMenu.style.display = 'none';
      this.handlePromptSelection(promptKey);
    });

    return item;
  }

  /**
   * Handle prompt selection
   */
  async handlePromptSelection(promptKey) {
    console.log('aiFiverr: Selected prompt:', promptKey, 'for text:', this.selectedText.substring(0, 50) + '...');

    // Hide dropdown
    if (this.contextMenu) {
      this.contextMenu.style.display = 'none';
    }

    // Process the selected text with the chosen prompt
    await this.processTextWithPrompt(promptKey, this.selectedText);
  }

  /**
   * Process selected text with chosen prompt
   */
  async processTextWithPrompt(promptKey, selectedText) {
    try {
      console.log('aiFiverr: Processing text with prompt:', promptKey);
      console.log('aiFiverr: Selected text length:', selectedText.length);

      // Show loading indicator
      this.showProcessingIndicator();

      // Get the prompt from prompt selector
      const prompt = window.promptSelector.allPrompts[promptKey];
      if (!prompt) {
        throw new Error(`Prompt not found: ${promptKey}`);
      }

      console.log('aiFiverr: Found prompt:', prompt.name || promptKey);

      // Check if required managers are available
      if (!window.sessionManager) {
        throw new Error('Session manager not available');
      }
      if (!window.knowledgeBaseManager) {
        throw new Error('Knowledge base manager not available');
      }
      if (!window.geminiClient) {
        throw new Error('Gemini client not available');
      }

      // Get or create session for text selection
      const session = await window.sessionManager.getOrCreateSession('text_selection');
      console.log('aiFiverr: Got session:', session.id);

      // Process the prompt with the selected text
      const promptText = prompt.prompt || prompt.description;
      console.log('aiFiverr: Processing prompt text:', promptText.substring(0, 100) + '...');

      const processedPrompt = await window.knowledgeBaseManager.processPrompt(promptText, {
        conversation: selectedText,
        username: 'User'
      });

      console.log('aiFiverr: Processed prompt:', processedPrompt.substring(0, 100) + '...');

      // Generate AI response
      console.log('aiFiverr: Generating AI response...');
      const response = await window.geminiClient.generateChatReply(session, processedPrompt);
      console.log('aiFiverr: Got AI response:', response.response.substring(0, 100) + '...');

      // Show result modal
      this.showResultModal(response.response, selectedText);

    } catch (error) {
      console.error('aiFiverr: Failed to process text with prompt:', error);
      this.showErrorMessage(`Failed to process text: ${error.message}. Please try again.`);
    } finally {
      this.hideProcessingIndicator();
    }
  }

  /**
   * Show processing indicator
   */
  showProcessingIndicator() {
    if (!this.processingIndicator) {
      this.createProcessingIndicator();
    }
    this.processingIndicator.style.display = 'flex';
  }

  /**
   * Hide processing indicator
   */
  hideProcessingIndicator() {
    if (this.processingIndicator) {
      this.processingIndicator.style.display = 'none';
    }
  }

  /**
   * Create processing indicator
   */
  createProcessingIndicator() {
    this.processingIndicator = document.createElement('div');
    this.processingIndicator.className = 'aifiverr-processing-indicator';
    this.processingIndicator.innerHTML = `
      <div class="processing-content">
        <div class="processing-spinner"></div>
        <div class="processing-text">Processing with AI...</div>
      </div>
    `;

    // Add styles
    this.addProcessingIndicatorStyles();
    document.body.appendChild(this.processingIndicator);
    this.processingIndicator.style.display = 'none';
  }

  /**
   * Add styles for processing indicator
   */
  addProcessingIndicatorStyles() {
    if (document.getElementById('aifiverr-processing-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'aifiverr-processing-styles';
    styles.textContent = `
      .aifiverr-processing-indicator {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10002;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .aifiverr-processing-indicator .processing-content {
        background: white;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .aifiverr-processing-indicator .processing-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #1dbf73;
        border-radius: 50%;
        animation: aifiverr-spin 1s linear infinite;
      }

      .aifiverr-processing-indicator .processing-text {
        font-size: 16px;
        color: #2c3e50;
        font-weight: 500;
      }

      @keyframes aifiverr-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Show result modal
   */
  showResultModal(result, originalText) {
    if (!this.resultModal) {
      this.createResultModal();
    }

    // Set content
    const originalTextEl = this.resultModal.querySelector('.original-text');
    const resultTextEl = this.resultModal.querySelector('.result-text');

    originalTextEl.textContent = originalText;
    resultTextEl.value = result;

    // Show modal
    this.resultModal.style.display = 'flex';

    // Focus on result text for easy editing
    setTimeout(() => {
      resultTextEl.focus();
      resultTextEl.select();
    }, 100);
  }

  /**
   * Create result modal
   */
  createResultModal() {
    this.resultModal = document.createElement('div');
    this.resultModal.className = 'aifiverr-result-modal';
    this.resultModal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>AI Result</h3>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="original-section">
            <label>Original Text:</label>
            <div class="original-text"></div>
          </div>
          <div class="result-section">
            <label>AI Generated Result:</label>
            <textarea class="result-text" rows="8"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary modal-close">Cancel</button>
          <button class="btn-copy">Copy to Clipboard</button>
          <button class="btn-insert">Insert into Field</button>
        </div>
      </div>
    `;

    // Add event handlers
    this.setupResultModalHandlers();

    // Add styles
    this.addResultModalStyles();

    document.body.appendChild(this.resultModal);
    this.resultModal.style.display = 'none';
  }

  /**
   * Setup result modal event handlers
   */
  setupResultModalHandlers() {
    // Close handlers
    const closeButtons = this.resultModal.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.hideResultModal());
    });

    // Click outside to close
    this.resultModal.addEventListener('click', (e) => {
      if (e.target === this.resultModal) {
        this.hideResultModal();
      }
    });

    // Copy button
    const copyBtn = this.resultModal.querySelector('.btn-copy');
    copyBtn.addEventListener('click', () => this.copyResultToClipboard());

    // Insert button
    const insertBtn = this.resultModal.querySelector('.btn-insert');
    insertBtn.addEventListener('click', () => this.insertResultIntoField());

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.resultModal.style.display === 'flex') {
        this.hideResultModal();
      }
    });
  }

  /**
   * Add styles for result modal
   */
  addResultModalStyles() {
    if (document.getElementById('aifiverr-result-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'aifiverr-result-modal-styles';
    styles.textContent = `
      .aifiverr-result-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10003;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .aifiverr-result-modal .modal-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow: hidden;
        animation: aifiverr-modalIn 0.3s ease;
      }

      .aifiverr-result-modal .modal-header {
        background: linear-gradient(135deg, #1dbf73 0%, #19a463 100%);
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .aifiverr-result-modal .modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .aifiverr-result-modal .modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s ease;
      }

      .aifiverr-result-modal .modal-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .aifiverr-result-modal .modal-body {
        padding: 20px;
        max-height: 60vh;
        overflow-y: auto;
      }

      .aifiverr-result-modal .original-section,
      .aifiverr-result-modal .result-section {
        margin-bottom: 20px;
      }

      .aifiverr-result-modal label {
        display: block;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 8px;
        font-size: 14px;
      }

      .aifiverr-result-modal .original-text {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 12px;
        font-size: 14px;
        line-height: 1.5;
        color: #495057;
        max-height: 120px;
        overflow-y: auto;
        word-wrap: break-word;
      }

      .aifiverr-result-modal .result-text {
        width: 100%;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 12px;
        font-size: 14px;
        line-height: 1.5;
        font-family: inherit;
        resize: vertical;
        min-height: 120px;
      }

      .aifiverr-result-modal .result-text:focus {
        outline: none;
        border-color: #1dbf73;
        box-shadow: 0 0 0 2px rgba(29, 191, 115, 0.2);
      }

      .aifiverr-result-modal .modal-footer {
        padding: 16px 20px;
        border-top: 1px solid #e9ecef;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .aifiverr-result-modal .modal-footer button {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }

      .aifiverr-result-modal .btn-secondary {
        background: #6c757d;
        color: white;
      }

      .aifiverr-result-modal .btn-secondary:hover {
        background: #5a6268;
      }

      .aifiverr-result-modal .btn-copy {
        background: #17a2b8;
        color: white;
      }

      .aifiverr-result-modal .btn-copy:hover {
        background: #138496;
      }

      .aifiverr-result-modal .btn-insert {
        background: linear-gradient(135deg, #1dbf73 0%, #19a463 100%);
        color: white;
      }

      .aifiverr-result-modal .btn-insert:hover {
        background: linear-gradient(135deg, #19a463 0%, #17935a 100%);
      }

      @keyframes aifiverr-modalIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Hide result modal
   */
  hideResultModal() {
    if (this.resultModal) {
      this.resultModal.style.display = 'none';
    }
  }

  /**
   * Copy result to clipboard
   */
  async copyResultToClipboard() {
    const resultText = this.resultModal.querySelector('.result-text').value;

    try {
      await this.copyToClipboard(resultText);
      this.showSuccessMessage('Result copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy result:', error);
      this.showErrorMessage('Failed to copy result to clipboard');
    }
  }

  /**
   * Insert result into active field
   */
  async insertResultIntoField() {
    const resultText = this.resultModal.querySelector('.result-text').value;

    try {
      const inserted = await this.insertTextIntoActiveField(resultText);
      if (inserted) {
        this.showSuccessMessage('Result inserted into field!');
        this.hideResultModal();
      } else {
        this.showErrorMessage('No suitable input field found. Text copied to clipboard instead.');
        await this.copyToClipboard(resultText);
      }
    } catch (error) {
      console.error('Failed to insert result:', error);
      this.showErrorMessage('Failed to insert result into field');
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    this.showToastMessage(message, 'success');
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    this.showToastMessage(message, 'error');
  }

  /**
   * Show toast message
   */
  showToastMessage(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `aifiverr-toast aifiverr-toast-${type}`;
    toast.textContent = message;

    // Add toast styles if not already added
    this.addToastStyles();

    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Hide and remove toast
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Add toast styles
   */
  addToastStyles() {
    if (document.getElementById('aifiverr-toast-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'aifiverr-toast-styles';
    styles.textContent = `
      .aifiverr-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: 10004;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .aifiverr-toast.show {
        opacity: 1;
        transform: translateX(0);
      }

      .aifiverr-toast-success {
        background: #28a745;
      }

      .aifiverr-toast-error {
        background: #dc3545;
      }

      .aifiverr-toast-info {
        background: #17a2b8;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Hide context menu
   */
  hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.style.display = 'none';
    }
  }

  /**
   * Insert text into active field
   */
  async insertTextIntoActiveField(text) {
    // Find suitable input fields on the page
    const inputSelectors = [
      'textarea[data-testid="message-input"]', // Fiverr chat input
      'textarea[placeholder*="message"]', // Generic message inputs
      'textarea[placeholder*="reply"]', // Reply inputs
      'div[contenteditable="true"]', // Contenteditable divs
      'textarea:not([readonly]):not([disabled])', // Any enabled textarea
      'input[type="text"]:not([readonly]):not([disabled])', // Text inputs
      '.ql-editor', // Quill editor
      '[data-testid="offer-description"]', // Offer description
      '[data-testid="brief-description"]' // Brief description
    ];

    // Try to find the most suitable field
    let targetField = null;

    for (const selector of inputSelectors) {
      const fields = document.querySelectorAll(selector);
      for (const field of fields) {
        // Check if field is visible and not disabled
        if (this.isFieldSuitable(field)) {
          targetField = field;
          break;
        }
      }
      if (targetField) break;
    }

    if (!targetField) {
      // Try to find the last focused input
      targetField = document.activeElement;
      if (!this.isFieldSuitable(targetField)) {
        return false;
      }
    }

    // Insert text into the field
    return this.insertTextIntoField(targetField, text);
  }

  /**
   * Check if field is suitable for text insertion
   */
  isFieldSuitable(field) {
    if (!field) return false;

    // Check if field is visible
    const rect = field.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    // Check if field is not disabled or readonly
    if (field.disabled || field.readOnly) return false;

    // Check if field is actually an input field
    const tagName = field.tagName.toLowerCase();
    const isInput = tagName === 'textarea' || tagName === 'input' || field.contentEditable === 'true';

    return isInput;
  }

  /**
   * Insert text into specific field
   */
  insertTextIntoField(field, text) {
    try {
      if (field.contentEditable === 'true') {
        // Handle contenteditable elements
        field.focus();

        // Try to use execCommand first
        if (document.execCommand) {
          const success = document.execCommand('insertText', false, text);
          if (success) {
            field.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }
        }

        // Fallback: replace content
        field.textContent = text;
        field.dispatchEvent(new Event('input', { bubbles: true }));

      } else {
        // Handle regular input/textarea elements
        field.focus();

        // Get current cursor position
        const start = field.selectionStart || 0;
        const end = field.selectionEnd || 0;

        // Insert text at cursor position
        const currentValue = field.value || '';
        const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);

        field.value = newValue;

        // Set cursor position after inserted text
        const newCursorPos = start + text.length;
        field.setSelectionRange(newCursorPos, newCursorPos);

        // Trigger events
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return true;
    } catch (error) {
      console.error('Failed to insert text into field:', error);
      return false;
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    this.isActive = false;

    if (this.floatingIcon) {
      this.floatingIcon.remove();
      this.floatingIcon = null;
    }

    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }

    if (this.processingIndicator) {
      this.processingIndicator.remove();
      this.processingIndicator = null;
    }

    if (this.resultModal) {
      this.resultModal.remove();
      this.resultModal = null;
    }

    // Clear timeouts
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Remove event listeners
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('resize', this.hideFloatingIcon);
    document.removeEventListener('scroll', this.hideFloatingIcon, true);
  }
}

// Initialize text selector when script loads
if (typeof window !== 'undefined') {
  window.textSelector = new TextSelector();
}
