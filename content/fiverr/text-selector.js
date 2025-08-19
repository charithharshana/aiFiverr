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
    this.isInteractingWithUI = false;

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

    // Handle window resize - only hide if not interacting with dropdown
    window.addEventListener('resize', () => {
      if (!this.contextMenu || this.contextMenu.style.display !== 'block') {
        this.hideFloatingIcon();
      }
    });

    // Handle scroll - only hide dropdown if scrolling outside the dropdown area
    document.addEventListener('scroll', (e) => {
      // Don't hide dropdown if scrolling within the dropdown itself
      if (this.contextMenu && this.contextMenu.style.display === 'block') {
        // Check if the scroll event is coming from within the dropdown
        if (!this.contextMenu.contains(e.target)) {
          this.contextMenu.style.display = 'none';
        }
      }
    }, true);
  }

  /**
   * Handle mouse up events (end of selection)
   */
  async handleMouseUp(e) {
    // Don't process selection if interacting with our UI elements
    if (this.floatingIcon && this.floatingIcon.contains(e.target)) {
      return;
    }
    if (this.contextMenu && this.contextMenu.contains(e.target)) {
      return;
    }

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
   * Handle mouse down events - only hide dropdown, not the icon
   */
  handleMouseDown(e) {
    // Don't hide anything if clicking on our UI elements
    if (this.floatingIcon && this.floatingIcon.contains(e.target)) {
      return;
    }
    if (this.contextMenu && this.contextMenu.contains(e.target)) {
      return;
    }

    // Only hide the dropdown when clicking outside, but keep the icon visible
    if (this.contextMenu && this.contextMenu.style.display === 'block') {
      this.contextMenu.style.display = 'none';
    }
  }

  /**
   * Check current text selection and handle it
   */
  async checkSelection(e) {
    // Don't hide icon if user is interacting with our UI
    if (this.isInteractingWithUI) {
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      // Only hide if not interacting with UI
      if (!this.isInteractingWithUI) {
        this.hideFloatingIcon();
      }
      return;
    }

    const selectedText = selection.toString().trim();
    console.log('aiFiverr: Text selected:', selectedText.length, 'characters');

    // Minimum text length requirement
    if (selectedText.length < 3) {
      console.log('aiFiverr: Text too short, hiding icon');
      // Only hide if not interacting with UI
      if (!this.isInteractingWithUI) {
        this.hideFloatingIcon();
      }
      return;
    }

    // Check if selection is within Fiverr content areas
    const isValid = this.isValidSelectionArea(selection);
    console.log('aiFiverr: Selection area valid:', isValid);

    if (!isValid) {
      // Only hide if not interacting with UI
      if (!this.isInteractingWithUI) {
        this.hideFloatingIcon();
      }
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
   * Create floating action icon with close button
   */
  createFloatingIcon() {
    // Create container for icon and close button
    this.floatingIcon = document.createElement('div');
    this.floatingIcon.className = 'aifiverr-text-selection-container';

    // Create main action button
    const actionButton = document.createElement('button');
    actionButton.className = 'aifiverr-text-selection-icon';
    actionButton.innerHTML = '💬'; // Same icon as chat
    actionButton.title = 'AI Text Actions';

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'aifiverr-text-selection-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close';

    // Style container
    Object.assign(this.floatingIcon.style, {
      position: 'fixed',
      zIndex: '10000',
      display: 'none',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '4px'
    });

    // Style action button exactly like the chat icon
    Object.assign(actionButton.style, {
      background: 'none',
      border: 'none',
      fontSize: '18px',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      transition: 'all 0.2s ease',
      opacity: '0.7'
    });

    // Style close button
    Object.assign(closeButton.style, {
      background: 'rgba(0, 0, 0, 0.1)',
      border: 'none',
      fontSize: '14px',
      cursor: 'pointer',
      padding: '2px 4px',
      borderRadius: '50%',
      transition: 'all 0.2s ease',
      opacity: '0.6',
      color: '#666',
      width: '20px',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });

    // Hover effects
    actionButton.addEventListener('mouseenter', () => {
      actionButton.style.opacity = '1';
      actionButton.style.transform = 'scale(1.1)';
    });

    actionButton.addEventListener('mouseleave', () => {
      actionButton.style.opacity = '0.7';
      actionButton.style.transform = 'scale(1)';
    });

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.opacity = '1';
      closeButton.style.background = 'rgba(255, 0, 0, 0.1)';
      closeButton.style.color = '#ff0000';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.opacity = '0.6';
      closeButton.style.background = 'rgba(0, 0, 0, 0.1)';
      closeButton.style.color = '#666';
    });

    // Add click handlers
    actionButton.addEventListener('click', async (e) => {
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

    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('aiFiverr: Close button clicked');
      this.hideFloatingIcon();
    });

    // Track when user is interacting with floating icon
    this.floatingIcon.addEventListener('mouseenter', () => {
      this.isInteractingWithUI = true;
    });

    this.floatingIcon.addEventListener('mouseleave', () => {
      this.isInteractingWithUI = false;
    });

    // Append buttons to container
    this.floatingIcon.appendChild(actionButton);
    this.floatingIcon.appendChild(closeButton);

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
    const iconSize = 60; // Increased to accommodate close button
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
    this.floatingIcon.style.display = 'flex';
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

    // Track when user is interacting with dropdown
    this.contextMenu.addEventListener('mouseenter', () => {
      this.isInteractingWithUI = true;
    });

    this.contextMenu.addEventListener('mouseleave', () => {
      this.isInteractingWithUI = false;
    });

    // Prevent wheel events from bubbling up when scrolling within dropdown
    this.contextMenu.addEventListener('wheel', (e) => {
      e.stopPropagation();
    });

    // Note: Click handling is now managed by handleMouseDown to avoid conflicts
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

      // Show loading animation on the icon
      this.startIconLoadingAnimation();

      // Get the prompt from prompt selector
      let prompt = null;
      if (window.promptSelector && window.promptSelector.allPrompts) {
        prompt = window.promptSelector.allPrompts[promptKey];
      }

      if (!prompt) {
        throw new Error(`Prompt '${promptKey}' not found`);
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
      const promptText = prompt.prompt || prompt.description || prompt.text;
      console.log('aiFiverr: Processing prompt text:', promptText.substring(0, 100) + '...');

      const processedPrompt = await window.knowledgeBaseManager.processPrompt(promptKey, {
        conversation: selectedText,
        username: 'User'
      });

      console.log('aiFiverr: Processed prompt:', processedPrompt.substring(0, 100) + '...');

      // Generate AI response
      console.log('aiFiverr: Generating AI response...');
      const response = await window.geminiClient.generateChatReply(session, processedPrompt);
      console.log('aiFiverr: Got AI response:', response.response.substring(0, 100) + '...');

      // Show result popup near the icon (like chatbox style)
      this.showResultPopup(response.response, selectedText);

    } catch (error) {
      console.error('aiFiverr: Failed to process text with prompt:', error);
      this.showErrorMessage(`Failed to process text: ${error.message}. Please try again.`);
    } finally {
      this.stopIconLoadingAnimation();
    }
  }

  /**
   * Start loading animation on the floating icon
   */
  startIconLoadingAnimation() {
    const actionButton = this.floatingIcon?.querySelector('.aifiverr-text-selection-icon');
    if (!actionButton) return;

    actionButton.classList.add('loading');
    actionButton.innerHTML = '💬';

    // Add animated dots
    let dotCount = 0;
    const animateIcon = () => {
      if (!actionButton.classList.contains('loading')) return;

      dotCount = (dotCount + 1) % 4;
      const dots = '.'.repeat(dotCount);
      actionButton.innerHTML = `💬${dots}`;

      setTimeout(animateIcon, 500);
    };

    setTimeout(animateIcon, 500);
  }

  /**
   * Stop loading animation on the floating icon
   */
  stopIconLoadingAnimation() {
    const actionButton = this.floatingIcon?.querySelector('.aifiverr-text-selection-icon');
    if (!actionButton) return;

    actionButton.classList.remove('loading');
    actionButton.innerHTML = '💬';
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
   * Show result popup near the floating icon (like chatbox style)
   */
  showResultPopup(result, originalText) {
    // Remove existing popup with proper cleanup
    const existingPopup = document.querySelector('.aifiverr-text-result-popup');
    if (existingPopup) {
      this.closeResultPopup(existingPopup);
    }

    const popup = document.createElement('div');
    popup.className = 'aifiverr-text-result-popup';
    popup.innerHTML = `
      <div class="result-header draggable-handle" title="Drag to move">
        <div class="result-title">
          <span class="result-icon">✨</span>
          <h3>AI Result</h3>
          <span class="drag-indicator">⋮⋮</span>
        </div>
        <button class="close-btn" title="Close">×</button>
      </div>
      <div class="result-content">
        <div class="result-text">${result.replace(/\n/g, '<br>')}</div>
      </div>
      <div class="result-actions">
        <button class="copy-btn" title="Copy to clipboard">📋 Copy</button>
        <button class="edit-btn" title="Edit text">✏️ Edit</button>
        <button class="insert-btn" title="Insert into field">📝 Insert</button>
      </div>
    `;

    // Add styles
    this.addResultPopupStyles();

    // Position popup near the floating icon
    this.positionResultPopup(popup);

    // Make popup draggable
    this.makeDraggable(popup);

    // Event listeners
    popup.querySelector('.close-btn').addEventListener('click', () => {
      this.closeResultPopup(popup);
    });

    popup.querySelector('.copy-btn').addEventListener('click', async () => {
      await this.copyToClipboard(result);
      this.showToast('Result copied to clipboard!');
    });

    popup.querySelector('.edit-btn').addEventListener('click', () => {
      this.showResultModal(result, originalText);
      this.closeResultPopup(popup);
    });

    popup.querySelector('.insert-btn').addEventListener('click', () => {
      this.insertTextIntoActiveField(result);
      this.showToast('Text inserted successfully!');
      this.closeResultPopup(popup);
    });

    // Add click-outside-to-close functionality
    this.addClickOutsideToClose(popup);

    // Store reference to popup for potential cleanup
    this.currentResultPopup = popup;
  }

  /**
   * Position result popup near the floating icon with intelligent positioning
   */
  positionResultPopup(popup) {
    if (!this.floatingIcon) return;

    // First, add popup to DOM temporarily to get actual dimensions
    popup.style.position = 'fixed';
    popup.style.left = '-9999px';
    popup.style.top = '-9999px';
    popup.style.visibility = 'hidden';
    document.body.appendChild(popup);

    // Get actual dimensions after rendering
    const popupRect = popup.getBoundingClientRect();
    const popupWidth = popupRect.width;
    const popupHeight = popupRect.height;

    // Get icon and viewport dimensions
    const iconRect = this.floatingIcon.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Define possible positions in order of preference
    const positions = [
      // Right of icon (preferred)
      {
        left: iconRect.right + margin,
        top: iconRect.top,
        name: 'right'
      },
      // Left of icon
      {
        left: iconRect.left - popupWidth - margin,
        top: iconRect.top,
        name: 'left'
      },
      // Below icon
      {
        left: iconRect.left,
        top: iconRect.bottom + margin,
        name: 'below'
      },
      // Above icon
      {
        left: iconRect.left,
        top: iconRect.top - popupHeight - margin,
        name: 'above'
      },
      // Center of viewport (fallback)
      {
        left: (viewportWidth - popupWidth) / 2,
        top: (viewportHeight - popupHeight) / 2,
        name: 'center'
      }
    ];

    // Find the best position that fits within viewport
    let bestPosition = null;
    for (const pos of positions) {
      const fitsHorizontally = pos.left >= margin && pos.left + popupWidth <= viewportWidth - margin;
      const fitsVertically = pos.top >= margin && pos.top + popupHeight <= viewportHeight - margin;

      if (fitsHorizontally && fitsVertically) {
        bestPosition = pos;
        break;
      }
    }

    // If no position fits perfectly, use the center position with adjustments
    if (!bestPosition) {
      bestPosition = positions[positions.length - 1]; // center position

      // Ensure it fits within viewport bounds
      bestPosition.left = Math.max(margin, Math.min(bestPosition.left, viewportWidth - popupWidth - margin));
      bestPosition.top = Math.max(margin, Math.min(bestPosition.top, viewportHeight - popupHeight - margin));
    }

    // Apply the final position
    popup.style.left = `${bestPosition.left}px`;
    popup.style.top = `${bestPosition.top}px`;
    popup.style.visibility = 'visible';
    popup.style.zIndex = '10001';

    console.log(`aiFiverr: Positioned popup at ${bestPosition.name} position (${bestPosition.left}, ${bestPosition.top})`);
  }

  /**
   * Make popup draggable
   */
  makeDraggable(popup) {
    const header = popup.querySelector('.draggable-handle');
    if (!header) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    // Add dragging cursor style
    header.style.cursor = 'move';

    const handleMouseDown = (e) => {
      // Don't start dragging if clicking on close button
      if (e.target.classList.contains('close-btn')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = popup.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      // Add dragging class for visual feedback
      popup.classList.add('dragging');

      // Prevent text selection during drag
      e.preventDefault();
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;

      // Get popup dimensions
      const popupRect = popup.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 10;

      // Constrain to viewport bounds
      newLeft = Math.max(margin, Math.min(newLeft, viewportWidth - popupRect.width - margin));
      newTop = Math.max(margin, Math.min(newTop, viewportHeight - popupRect.height - margin));

      popup.style.left = `${newLeft}px`;
      popup.style.top = `${newTop}px`;
    };

    const handleMouseUp = () => {
      if (!isDragging) return;

      isDragging = false;
      popup.classList.remove('dragging');
      document.body.style.userSelect = '';
    };

    // Add event listeners
    header.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Store cleanup function
    popup._dragCleanup = () => {
      header.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }

  /**
   * Add click-outside-to-close functionality
   */
  addClickOutsideToClose(popup) {
    const handleClickOutside = (e) => {
      // Don't close if clicking inside the popup
      if (popup.contains(e.target)) return;

      // Don't close if clicking on the floating icon or context menu
      if (this.floatingIcon && this.floatingIcon.contains(e.target)) return;
      if (this.contextMenu && this.contextMenu.contains(e.target)) return;

      // Close the popup
      this.closeResultPopup(popup);
    };

    // Add click listener with a small delay to avoid immediate closure
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    // Store cleanup function
    popup._clickOutsideCleanup = () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }

  /**
   * Close result popup with proper cleanup
   */
  closeResultPopup(popup) {
    if (!popup || !popup.parentNode) return;

    // Clean up event listeners
    if (popup._dragCleanup) {
      popup._dragCleanup();
    }
    if (popup._clickOutsideCleanup) {
      popup._clickOutsideCleanup();
    }

    // Remove popup
    popup.remove();

    // Clear reference
    if (this.currentResultPopup === popup) {
      this.currentResultPopup = null;
    }
  }

  /**
   * Clean up all popups and UI elements
   */
  cleanup() {
    // Close current result popup
    if (this.currentResultPopup) {
      this.closeResultPopup(this.currentResultPopup);
    }

    // Hide floating icon
    this.hideFloatingIcon();

    // Clean up any remaining popups
    const remainingPopups = document.querySelectorAll('.aifiverr-text-result-popup');
    remainingPopups.forEach(popup => this.closeResultPopup(popup));
  }

  /**
   * Show result modal (for editing)
   */
  showResultModal(result, originalText) {
    if (!this.resultModal) {
      this.createResultModal();
    }

    // Set content
    const resultDisplay = this.resultModal.querySelector('.result-display');
    const resultEditor = this.resultModal.querySelector('.result-editor');

    // Format result text with line breaks
    const formattedResult = result.replace(/\n/g, '<br>');
    resultDisplay.innerHTML = formattedResult;
    resultEditor.value = result;

    // Reset to display mode
    resultDisplay.style.display = 'block';
    resultEditor.style.display = 'none';

    // Update edit button state
    const editBtn = this.resultModal.querySelector('.btn-edit');
    editBtn.textContent = '✏️';
    editBtn.title = 'Edit text';

    // Show modal
    this.resultModal.style.display = 'flex';
  }

  /**
   * Create light UI result modal
   */
  createResultModal() {
    this.resultModal = document.createElement('div');
    this.resultModal.className = 'aifiverr-result-modal';
    this.resultModal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">
            <span class="modal-icon">✨</span>
            <h3>AI Result</h3>
          </div>
          <button class="modal-close" title="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="result-section">
            <div class="result-header">
              <label>Generated Text</label>
              <div class="result-actions">
                <button class="btn-edit" title="Edit text">✏️</button>
                <button class="btn-copy" title="Copy to clipboard">📋</button>
              </div>
            </div>
            <div class="result-content">
              <div class="result-display"></div>
              <textarea class="result-editor" style="display: none;"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary modal-close">Close</button>
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

    // Click backdrop to close
    const backdrop = this.resultModal.querySelector('.modal-backdrop');
    backdrop.addEventListener('click', () => this.hideResultModal());

    // Edit button
    const editBtn = this.resultModal.querySelector('.btn-edit');
    editBtn.addEventListener('click', () => this.toggleEditMode());

    // Copy button
    const copyBtn = this.resultModal.querySelector('.btn-copy');
    copyBtn.addEventListener('click', async () => {
      const isEditing = this.resultModal.querySelector('.result-editor').style.display !== 'none';
      const resultText = isEditing
        ? this.resultModal.querySelector('.result-editor').value
        : this.resultModal.querySelector('.result-display').textContent;

      await this.copyToClipboard(resultText);
      this.showToast('Result copied to clipboard!');
    });

    // Insert button
    const insertBtn = this.resultModal.querySelector('.btn-insert');
    insertBtn.addEventListener('click', () => {
      const isEditing = this.resultModal.querySelector('.result-editor').style.display !== 'none';
      const resultText = isEditing
        ? this.resultModal.querySelector('.result-editor').value
        : this.resultModal.querySelector('.result-display').textContent;

      this.insertTextIntoActiveField(resultText);
      this.hideResultModal();
      this.showToast('Text inserted successfully!');
    });

    // Handle textarea changes in edit mode
    const resultEditor = this.resultModal.querySelector('.result-editor');
    resultEditor.addEventListener('input', () => {
      // Auto-resize textarea
      resultEditor.style.height = 'auto';
      resultEditor.style.height = resultEditor.scrollHeight + 'px';
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.resultModal.style.display === 'flex') {
        this.hideResultModal();
      }
    });
  }

  /**
   * Add styles for result popup
   */
  addResultPopupStyles() {
    if (document.getElementById('aifiverr-result-popup-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'aifiverr-result-popup-styles';
    styles.textContent = `
      .aifiverr-text-result-popup {
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
        width: 350px;
        max-height: 400px;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: popupSlideIn 0.2s ease-out;
      }

      @keyframes popupSlideIn {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .aifiverr-text-result-popup .result-header {
        padding: 16px 20px 12px;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        user-select: none;
      }

      .aifiverr-text-result-popup .draggable-handle {
        cursor: move;
      }

      .aifiverr-text-result-popup.dragging {
        opacity: 0.9;
        transform: scale(1.02);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.1);
        transition: none;
      }

      .aifiverr-text-result-popup .result-title {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .aifiverr-text-result-popup .drag-indicator {
        color: #94a3b8;
        font-size: 12px;
        margin-left: auto;
        margin-right: 8px;
        opacity: 0.6;
        transition: opacity 0.2s ease;
      }

      .aifiverr-text-result-popup .draggable-handle:hover .drag-indicator {
        opacity: 1;
        color: #64748b;
      }

      .aifiverr-text-result-popup .result-icon {
        font-size: 16px;
      }

      .aifiverr-text-result-popup .result-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
      }

      .aifiverr-text-result-popup .close-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #64748b;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .aifiverr-text-result-popup .close-btn:hover {
        background: rgba(248, 113, 113, 0.1);
        color: #ef4444;
      }

      .aifiverr-text-result-popup .result-content {
        padding: 16px 20px;
        max-height: 250px;
        overflow-y: auto;
      }

      .aifiverr-text-result-popup .result-text {
        font-size: 14px;
        line-height: 1.6;
        color: #334155;
        white-space: pre-wrap;
      }

      .aifiverr-text-result-popup .result-actions {
        padding: 12px 20px 16px;
        border-top: 1px solid #f1f5f9;
        display: flex;
        gap: 8px;
        background: #fafbfc;
      }

      .aifiverr-text-result-popup .result-actions button {
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid #e2e8f0;
        background: white;
        color: #64748b;
        flex: 1;
      }

      .aifiverr-text-result-popup .result-actions button:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #475569;
        transform: translateY(-1px);
      }

      .aifiverr-text-result-popup .insert-btn {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
        color: white !important;
        border-color: transparent !important;
      }

      .aifiverr-text-result-popup .insert-btn:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
        transform: translateY(-1px);
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Toggle between display and edit mode
   */
  toggleEditMode() {
    const resultDisplay = this.resultModal.querySelector('.result-display');
    const resultEditor = this.resultModal.querySelector('.result-editor');
    const editBtn = this.resultModal.querySelector('.btn-edit');

    const isEditing = resultEditor.style.display !== 'none';

    if (isEditing) {
      // Switch to display mode
      const editedText = resultEditor.value;
      const formattedText = editedText.replace(/\n/g, '<br>');
      resultDisplay.innerHTML = formattedText;

      resultDisplay.style.display = 'block';
      resultEditor.style.display = 'none';
      editBtn.textContent = '✏️';
      editBtn.title = 'Edit text';
    } else {
      // Switch to edit mode
      const displayText = resultDisplay.textContent || resultDisplay.innerText;
      resultEditor.value = displayText;

      resultDisplay.style.display = 'none';
      resultEditor.style.display = 'block';
      editBtn.textContent = '👁️';
      editBtn.title = 'View text';

      // Auto-resize and focus
      resultEditor.style.height = 'auto';
      resultEditor.style.height = resultEditor.scrollHeight + 'px';
      resultEditor.focus();
    }
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
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10002;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      .aifiverr-result-modal .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(2px);
      }

      .aifiverr-result-modal .modal-content {
        position: relative;
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05);
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: modalSlideIn 0.2s ease-out;
      }

      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .aifiverr-result-modal .modal-header {
        padding: 20px 24px 16px;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      }

      .aifiverr-result-modal .modal-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .aifiverr-result-modal .modal-icon {
        font-size: 20px;
      }

      .aifiverr-result-modal .modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
      }

      .aifiverr-result-modal .modal-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #64748b;
        padding: 6px;
        border-radius: 6px;
        transition: all 0.2s ease;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .aifiverr-result-modal .modal-close:hover {
        background: rgba(248, 113, 113, 0.1);
        color: #ef4444;
      }

      .aifiverr-result-modal .modal-body {
        padding: 20px 24px;
        flex: 1;
        overflow-y: auto;
      }

      .aifiverr-result-modal .result-section {
        margin-bottom: 0;
      }

      .aifiverr-result-modal .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .aifiverr-result-modal .result-header label {
        margin: 0;
        font-weight: 600;
        color: #374151;
        font-size: 14px;
      }

      .aifiverr-result-modal .result-actions {
        display: flex;
        gap: 8px;
      }

      .aifiverr-result-modal .result-actions button {
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 6px 8px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
        color: #64748b;
      }

      .aifiverr-result-modal .result-actions button:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #475569;
      }

      .aifiverr-result-modal .result-content {
        position: relative;
      }

      .aifiverr-result-modal .result-display {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        font-size: 14px;
        color: #334155;
        line-height: 1.6;
        min-height: 120px;
        white-space: pre-wrap;
      }

      .aifiverr-result-modal .result-editor {
        width: 100%;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        font-size: 14px;
        line-height: 1.6;
        resize: none;
        min-height: 120px;
        font-family: inherit;
        background: white;
        color: #334155;
      }

      .aifiverr-result-modal .result-editor:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .aifiverr-result-modal .modal-footer {
        padding: 16px 24px 20px;
        border-top: 1px solid #f1f5f9;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        background: #fafbfc;
      }

      .aifiverr-result-modal .modal-footer button {
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;
      }

      .aifiverr-result-modal .btn-secondary {
        background: white;
        color: #64748b;
        border-color: #e2e8f0;
      }

      .aifiverr-result-modal .btn-secondary:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #475569;
      }

      .aifiverr-result-modal .btn-insert {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
      }

      .aifiverr-result-modal .btn-insert:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        transform: translateY(-1px);
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
