/**
 * Fiverr UI Injector
 * Injects AI assistance UI elements into Fiverr pages
 */

class FiverrInjector {
  constructor() {
    this.injectedElements = new Map();
    this.floatingWidget = null;
    this.init();
  }

  init() {
    // Listen for element detection events
    window.addEventListener('aifiverr:elementsDetected', (event) => {
      this.handleElementsDetected(event.detail);
    });

    // Inject floating widget
    this.injectFloatingWidget();
    
    // Monitor for new elements
    this.startMonitoring();
  }

  /**
   * Handle detected elements and inject UI
   */
  handleElementsDetected(detail) {
    const { pageType, elements } = detail;
    
    switch (pageType) {
      case 'conversation':
        this.injectChatUI(elements);
        break;
      case 'proposal':
        this.injectProposalUI(elements);
        break;
      case 'brief':
        this.injectBriefUI(elements);
        break;
    }
  }

  /**
   * Inject chat-related UI elements
   */
  injectChatUI(elements) {
    // Inject AI button for chat inputs
    if (elements.chat) {
      elements.chat.forEach(element => {
        if (fiverrDetector.isChatInput(element) && !fiverrDetector.isProcessed(element)) {
          this.injectChatInputButton(element);
          fiverrDetector.markAsProcessed(element);
        }
      });
    }

    // Inject message analysis buttons
    if (elements.inputs) {
      elements.inputs.forEach(element => {
        if (this.isMessageElement(element) && !fiverrDetector.isProcessed(element)) {
          this.injectMessageAnalysisButton(element);
          fiverrDetector.markAsProcessed(element);
        }
      });
    }
  }

  /**
   * Inject proposal-related UI elements
   */
  injectProposalUI(elements) {
    if (elements.proposal) {
      elements.proposal.forEach(element => {
        if (fiverrDetector.isProposalInput(element) && !fiverrDetector.isProcessed(element)) {
          this.injectProposalButton(element);
          fiverrDetector.markAsProcessed(element);
        }
      });
    }
  }

  /**
   * Inject brief-related UI elements
   */
  injectBriefUI(elements) {
    if (elements.brief) {
      // Inject copy brief button
      this.injectCopyBriefButton();
    }
  }

  /**
   * Inject AI button for chat input
   */
  injectChatInputButton(inputElement) {
    const container = this.createButtonContainer();
    const button = this.createAIButton('Generate Reply', 'chat');
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.handleChatGeneration(inputElement);
    });

    container.appendChild(button);
    this.insertButtonContainer(inputElement, container);
    
    this.injectedElements.set(inputElement, container);
  }

  /**
   * Inject message analysis button
   */
  injectMessageAnalysisButton(messageElement) {
    const button = this.createAIButton('🤖', 'analysis', { small: true });
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.handleMessageAnalysis(messageElement);
    });

    // Position button relative to message
    button.style.position = 'absolute';
    button.style.top = '5px';
    button.style.right = '5px';
    button.style.zIndex = '1000';

    messageElement.style.position = 'relative';
    messageElement.appendChild(button);
    
    this.injectedElements.set(messageElement, button);
  }

  /**
   * Inject proposal generation button
   */
  injectProposalButton(inputElement) {
    const container = this.createButtonContainer();
    const button = this.createAIButton('Generate Proposal', 'proposal');
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.handleProposalGeneration(inputElement);
    });

    container.appendChild(button);
    this.insertButtonContainer(inputElement, container);
    
    this.injectedElements.set(inputElement, container);
  }

  /**
   * Inject copy brief button
   */
  injectCopyBriefButton() {
    const existingButton = document.querySelector('.aifiverr-copy-brief');
    if (existingButton) return;

    const button = this.createAIButton('Copy Brief for AI', 'brief');
    button.classList.add('aifiverr-copy-brief');
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.handleBriefCopy();
    });

    // Find a good place to insert the button
    const targetContainer = document.querySelector('.brief-header, .project-header, h1, h2');
    if (targetContainer) {
      targetContainer.parentNode.insertBefore(button, targetContainer.nextSibling);
    } else {
      document.body.appendChild(button);
    }
  }

  /**
   * Inject floating AI widget
   */
  injectFloatingWidget() {
    if (this.floatingWidget) return;

    const widget = document.createElement('div');
    widget.className = 'aifiverr-floating-widget';
    widget.innerHTML = `
      <div class="widget-toggle">
        <span class="ai-icon">🤖</span>
      </div>
      <div class="widget-panel" style="display: none;">
        <div class="widget-header">
          <h3>AI Assistant</h3>
          <button class="close-btn">×</button>
        </div>
        <div class="widget-content">
          <div class="chat-container">
            <div class="messages"></div>
            <div class="input-container">
              <textarea placeholder="Ask AI anything about Fiverr..."></textarea>
              <button class="send-btn">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add styles
    Object.assign(widget.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '10000',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    document.body.appendChild(widget);
    this.floatingWidget = widget;

    // Add event listeners
    this.setupFloatingWidgetEvents();
  }

  /**
   * Setup floating widget events
   */
  setupFloatingWidgetEvents() {
    const toggle = this.floatingWidget.querySelector('.widget-toggle');
    const panel = this.floatingWidget.querySelector('.widget-panel');
    const closeBtn = this.floatingWidget.querySelector('.close-btn');
    const sendBtn = this.floatingWidget.querySelector('.send-btn');
    const textarea = this.floatingWidget.querySelector('textarea');

    toggle.addEventListener('click', () => {
      const isVisible = panel.style.display !== 'none';
      panel.style.display = isVisible ? 'none' : 'block';
    });

    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
    });

    sendBtn.addEventListener('click', () => {
      this.handleFloatingWidgetMessage();
    });

    textarea.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleFloatingWidgetMessage();
      }
    });
  }

  /**
   * Create AI button element
   */
  createAIButton(text, type, options = {}) {
    const button = document.createElement('button');
    button.className = `aifiverr-button aifiverr-${type}-button`;
    button.textContent = text;
    
    const baseStyles = {
      backgroundColor: '#1dbf73',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: options.small ? '4px 8px' : '8px 16px',
      fontSize: options.small ? '12px' : '14px',
      fontWeight: '600',
      cursor: 'pointer',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };

    Object.assign(button.style, baseStyles);

    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#19a463';
      button.style.transform = 'translateY(-1px)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '#1dbf73';
      button.style.transform = 'translateY(0)';
    });

    return button;
  }

  /**
   * Create button container
   */
  createButtonContainer() {
    const container = document.createElement('div');
    container.className = 'aifiverr-button-container';
    
    Object.assign(container.style, {
      display: 'flex',
      gap: '8px',
      margin: '8px 0',
      alignItems: 'center'
    });

    return container;
  }

  /**
   * Insert button container near input element
   */
  insertButtonContainer(inputElement, container) {
    // Try to find the best place to insert
    const parent = inputElement.parentNode;
    
    if (parent) {
      // Insert after the input element
      parent.insertBefore(container, inputElement.nextSibling);
    } else {
      // Fallback: append to body
      document.body.appendChild(container);
    }
  }

  /**
   * Handle chat generation
   */
  async handleChatGeneration(inputElement) {
    try {
      showTooltip('Generating reply...', inputElement);
      
      // Get conversation context
      const conversationData = await fiverrExtractor.extractConversation();
      const context = conversationData ? fiverrExtractor.getConversationSummary(conversationData) : '';
      
      // Get or create session
      const session = await sessionManager.getOrCreateSession(window.location.href);
      
      // Generate reply using AI
      const reply = await this.generateAIReply(context, session);
      
      if (reply) {
        inputElement.value = reply;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      removeTooltip();
    } catch (error) {
      console.error('Chat generation failed:', error);
      showTooltip('Failed to generate reply', inputElement);
      setTimeout(removeTooltip, 3000);
    }
  }

  /**
   * Handle message analysis
   */
  async handleMessageAnalysis(messageElement) {
    try {
      const messageData = fiverrExtractor.parseMessageElement(messageElement);
      if (!messageData) return;

      showTooltip('Analyzing message...', messageElement);
      
      // Analyze message with AI
      const analysis = await this.analyzeMessage(messageData.content);
      
      if (analysis) {
        this.showAnalysisPopup(analysis, messageElement);
      }
      
      removeTooltip();
    } catch (error) {
      console.error('Message analysis failed:', error);
      showTooltip('Analysis failed', messageElement);
      setTimeout(removeTooltip, 3000);
    }
  }

  /**
   * Handle proposal generation
   */
  async handleProposalGeneration(inputElement) {
    try {
      showTooltip('Generating proposal...', inputElement);
      
      // Extract brief details if available
      const briefData = fiverrExtractor.extractBriefDetails();
      
      // Generate proposal using AI
      const proposal = await this.generateAIProposal(briefData);
      
      if (proposal) {
        inputElement.value = proposal;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      removeTooltip();
    } catch (error) {
      console.error('Proposal generation failed:', error);
      showTooltip('Failed to generate proposal', inputElement);
      setTimeout(removeTooltip, 3000);
    }
  }

  /**
   * Handle brief copy
   */
  async handleBriefCopy() {
    try {
      const briefData = fiverrExtractor.extractBriefDetails();
      if (!briefData) {
        showTooltip('No brief data found', document.body);
        return;
      }

      const briefText = this.formatBriefForCopy(briefData);
      await copyToClipboard(briefText);
      
      showTooltip('Brief copied to clipboard!', document.body);
      setTimeout(removeTooltip, 2000);
    } catch (error) {
      console.error('Brief copy failed:', error);
      showTooltip('Failed to copy brief', document.body);
      setTimeout(removeTooltip, 3000);
    }
  }

  /**
   * Handle floating widget messages
   */
  async handleFloatingWidgetMessage() {
    const textarea = this.floatingWidget.querySelector('textarea');
    const message = textarea.value.trim();
    
    if (!message) return;

    // Add user message to chat
    this.addMessageToWidget('user', message);
    textarea.value = '';

    try {
      // Get AI response
      const response = await this.getAIResponse(message);
      this.addMessageToWidget('assistant', response);
    } catch (error) {
      console.error('AI response failed:', error);
      this.addMessageToWidget('assistant', 'Sorry, I encountered an error. Please try again.');
    }
  }

  /**
   * Add message to floating widget
   */
  addMessageToWidget(role, content) {
    const messagesContainer = this.floatingWidget.querySelector('.messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.textContent = content;
    
    Object.assign(messageDiv.style, {
      padding: '8px 12px',
      margin: '4px 0',
      borderRadius: '8px',
      backgroundColor: role === 'user' ? '#1dbf73' : '#f5f5f5',
      color: role === 'user' ? 'white' : 'black',
      alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
      maxWidth: '80%'
    });

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Check if element is a message element
   */
  isMessageElement(element) {
    const messageSelectors = [
      '[data-testid*="message"]',
      '.message-bubble',
      '.chat-message',
      '.conversation-message'
    ];

    return messageSelectors.some(selector => {
      try {
        return element.matches(selector);
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Start monitoring for new elements
   */
  startMonitoring() {
    setInterval(() => {
      fiverrDetector.detectAllElements();
    }, 5000); // Check every 5 seconds
  }

  /**
   * AI integration methods
   */
  async generateAIReply(context, session) {
    try {
      // Extract conversation data and username
      const conversationData = await fiverrExtractor.extractConversation();
      const username = fiverrExtractor.extractUsernameFromUrl();

      // Prepare context variables for prompt processing
      const contextVars = {
        conversation: context || (conversationData ? fiverrExtractor.conversationToContext(conversationData) : ''),
        username: username || 'Client'
      };

      // Use knowledge base manager to process the professional reply prompt
      let prompt;
      try {
        prompt = await knowledgeBaseManager.processPrompt('professional_initial_reply', contextVars);
      } catch (error) {
        console.warn('Professional reply prompt not found, using fallback:', error);
        // Fallback to basic prompt if the structured prompt is not available
        prompt = 'Generate a professional reply for this Fiverr conversation';
        if (context) {
          prompt += `\n\nConversation context:\n${context}`;
        }
        prompt += '\n\nPlease generate an appropriate, professional response that addresses the conversation context.';
      }

      const response = await geminiClient.generateChatReply(session, prompt);
      return response.response;
    } catch (error) {
      console.error('AI reply generation failed:', error);
      throw new Error('Failed to generate AI reply');
    }
  }

  async analyzeMessage(content) {
    try {
      const analysis = await geminiClient.analyzeMessage(content);
      return analysis;
    } catch (error) {
      console.error('Message analysis failed:', error);
      throw new Error('Failed to analyze message');
    }
  }

  async generateAIProposal(briefData) {
    try {
      // Extract username and conversation context
      const username = fiverrExtractor.extractUsernameFromUrl();
      const conversationData = await fiverrExtractor.extractConversation();

      // Prepare context variables for prompt processing
      const contextVars = {
        username: username || 'Client',
        conversation: conversationData ? fiverrExtractor.conversationToContext(conversationData) : '',
        proposal: briefData ? this.formatBriefData(briefData) : 'No brief data available'
      };

      // Use knowledge base manager to process the project proposal prompt
      let prompt;
      try {
        prompt = await knowledgeBaseManager.processPrompt('project_proposal', contextVars);
      } catch (error) {
        console.warn('Project proposal prompt not found, using fallback:', error);
        // Fallback to gemini client's proposal generation
        const knowledgeBase = await storageManager.getKnowledgeBase();
        return await geminiClient.generateProposal(briefData, knowledgeBase);
      }

      // Generate proposal using the processed prompt
      const response = await geminiClient.generateContent(prompt);
      return response.text;
    } catch (error) {
      console.error('AI proposal generation failed:', error);
      throw new Error('Failed to generate AI proposal');
    }
  }

  /**
   * Format brief data for prompt context
   */
  formatBriefData(briefData) {
    if (!briefData) return 'No brief data available';

    let formatted = '';
    if (briefData.title) formatted += `Title: ${briefData.title}\n`;
    if (briefData.description) formatted += `Description: ${briefData.description}\n`;
    if (briefData.overview) formatted += `Brief Overview: ${briefData.overview}\n`;
    if (briefData.requirements?.length) formatted += `Requirements: ${briefData.requirements.join(', ')}\n`;
    if (briefData.budget) formatted += `Budget: ${briefData.budget}\n`;
    if (briefData.deadline) formatted += `Deadline: ${briefData.deadline}\n`;
    if (briefData.skills?.length) formatted += `Skills needed: ${briefData.skills.join(', ')}\n`;

    return formatted || 'No specific brief details available';
  }

  async getAIResponse(message) {
    try {
      // Get or create a session for the floating widget
      const session = await sessionManager.getOrCreateSession('floating_widget');

      const response = await geminiClient.generateChatReply(session, message);
      return response.response;
    } catch (error) {
      console.error('AI response failed:', error);
      throw new Error('Failed to get AI response');
    }
  }

  /**
   * Format brief data for copying
   */
  formatBriefForCopy(briefData) {
    let text = '';
    
    if (briefData.title) text += `Title: ${briefData.title}\n\n`;
    if (briefData.description) text += `Description: ${briefData.description}\n\n`;
    if (briefData.requirements?.length) text += `Requirements: ${briefData.requirements.join(', ')}\n\n`;
    if (briefData.budget) text += `Budget: ${briefData.budget}\n\n`;
    if (briefData.deadline) text += `Deadline: ${briefData.deadline}\n\n`;
    if (briefData.skills?.length) text += `Skills: ${briefData.skills.join(', ')}\n\n`;
    
    return text.trim();
  }

  /**
   * Show analysis popup
   */
  showAnalysisPopup(analysis, targetElement) {
    const popup = document.createElement('div');
    popup.className = 'aifiverr-analysis-popup';
    popup.innerHTML = `
      <div class="popup-header">
        <h4>Message Analysis</h4>
        <button class="close-btn">×</button>
      </div>
      <div class="popup-content">
        ${analysis}
      </div>
    `;

    // Style the popup
    Object.assign(popup.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      maxWidth: '400px',
      zIndex: '10001',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    });

    document.body.appendChild(popup);

    // Close button functionality
    popup.querySelector('.close-btn').addEventListener('click', () => {
      popup.remove();
    });

    // Auto-close after 10 seconds
    setTimeout(() => {
      if (popup.parentNode) {
        popup.remove();
      }
    }, 10000);
  }

  /**
   * Cleanup injected elements
   */
  cleanup() {
    this.injectedElements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    this.injectedElements.clear();

    if (this.floatingWidget && this.floatingWidget.parentNode) {
      this.floatingWidget.parentNode.removeChild(this.floatingWidget);
      this.floatingWidget = null;
    }
  }
}

// Create global injector instance
window.fiverrInjector = new FiverrInjector();
