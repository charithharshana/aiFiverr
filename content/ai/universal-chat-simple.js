/**
 * AI Assistance Chat Implementation
 * Advanced AI assistant with streaming support and conversation history
 * Replaces the old AI assistant with improved features and better integration
 */

class AIAssistanceChat {
  constructor() {
    this.isVisible = false;
    this.container = null;
    this.triggerButton = null;
    this.messages = [];
    this.isStreaming = false;
    this.apiKey = null;
    
    this.init();
  }

  async init() {
    console.log('AI Assistance: Initializing...');

    // Get API key
    await this.loadApiKey();

    // Initialize settings
    await this.initializeSettings();

    // Create UI
    this.createUI();

    // Set up events
    this.setupEvents();

    console.log('AI Assistance: Initialized successfully');
  }

  async loadApiKey() {
    try {
      // Wait for extension initialization
      await this.waitForExtensionInit();

      // Try to get from existing API key manager
      if (window.apiKeyManager && window.apiKeyManager.initialized) {
        const keyData = window.apiKeyManager.getKeyForSession('default');
        if (keyData && keyData.key) {
          this.apiKey = keyData.key;
          console.log('AI Assistance: API key loaded from key manager');
          return;
        }
      }

      // Try to get from storage manager
      if (window.storageManager) {
        const settings = await window.storageManager.getSettings();
        if (settings && settings.apiKeys && settings.apiKeys.length > 0) {
          this.apiKey = settings.apiKeys[0]; // Use first available key
          console.log('AI Assistance: API key loaded from settings');
          return;
        }
      }

      // Try Chrome storage for direct API key
      if (chrome.storage) {
        const result = await chrome.storage.local.get(['GOOGLE_API_KEY', 'apiKeys']);

        // Check for direct Google API key
        if (result.GOOGLE_API_KEY) {
          this.apiKey = result.GOOGLE_API_KEY;
          console.log('AI Assistance: API key loaded from direct storage');
          return;
        }

        // Check for API keys array
        if (result.apiKeys && result.apiKeys.length > 0) {
          this.apiKey = result.apiKeys[0];
          console.log('AI Assistance: API key loaded from apiKeys array');
          return;
        }
      }

      // Try localStorage as fallback
      const localKey = localStorage.getItem('GOOGLE_API_KEY');
      if (localKey) {
        this.apiKey = localKey;
        console.log('AI Assistance: API key loaded from localStorage');
        return;
      }

      console.warn('AI Assistance: No API key found in any storage location');
    } catch (error) {
      console.error('AI Assistance: Failed to load API key:', error);
    }
  }

  async waitForExtensionInit() {
    // Wait for extension components to initialize
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait

    while (attempts < maxAttempts) {
      if (window.storageManager || window.apiKeyManager) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  createUI() {
    // Remove old UI if exists
    const existing = document.getElementById('ai-assistance-container');
    if (existing) existing.remove();

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'ai-assistance-container';
    this.container.innerHTML = `
      <div class="ai-assistance-window" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 500px;
        height: 700px;
        background: #ffffff;
        border: 1px solid #e1e5e9;
        border-radius: 16px;
        display: none;
        flex-direction: column;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
      ">
        <div class="chat-header" style="
          background: #ffffff;
          padding: 16px 20px;
          border-bottom: 1px solid #e1e5e9;
          border-radius: 16px 16px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h3 style="margin: 0; color: #1dbf73; font-size: 18px; font-weight: 600;">AI Assistant</h3>
          <div style="display: flex; gap: 8px;">
            <button class="clear-btn" style="
              background: none;
              border: none;
              color: #6c757d;
              cursor: pointer;
              font-size: 16px;
              padding: 6px;
              border-radius: 6px;
              transition: background-color 0.2s;
            " title="Clear chat">🗑️</button>
            <button class="close-btn" style="
              background: none;
              border: none;
              color: #6c757d;
              cursor: pointer;
              font-size: 20px;
              padding: 6px;
              border-radius: 6px;
              transition: background-color 0.2s;
            ">×</button>
          </div>
        </div>
        
        <div class="messages-container" style="
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #ffffff;
          max-height: 530px;
        ">
          <div class="welcome-message" style="
            background: #f8f9fa;
            padding: 16px;
            border-radius: 12px;
            color: #495057;
            margin-bottom: 20px;
            border: 1px solid #e9ecef;
          ">
            Welcome to AI Assistance!
          </div>
        </div>

        <!-- Prompt Management Panel -->
        <div class="prompt-panel" style="
          display: none;
          background: #f8f9fa;
          border-top: 1px solid #e1e5e9;
          padding: 16px 20px;
          max-height: 200px;
          overflow-y: auto;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; color: #495057; font-size: 14px; font-weight: 600;">Quick Prompts</h4>
            <button class="add-prompt-btn" style="
              background: #1dbf73;
              border: none;
              border-radius: 6px;
              color: white;
              cursor: pointer;
              padding: 4px 8px;
              font-size: 12px;
            ">+ Add</button>
          </div>
          <div class="prompt-list"></div>
        </div>

        <div class="input-container" style="
          padding: 20px;
          background: #ffffff;
          border-top: 1px solid #e1e5e9;
          border-radius: 0 0 16px 16px;
        ">
          <div style="display: flex; gap: 12px; align-items: flex-end;">
            <div style="flex: 1;">
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button class="prompts-btn" style="
                  background: #f8f9fa;
                  border: 1px solid #e1e5e9;
                  border-radius: 6px;
                  color: #495057;
                  cursor: pointer;
                  padding: 6px 10px;
                  font-size: 12px;
                  transition: all 0.2s;
                " title="Quick Prompts">📝</button>
                <button class="attach-btn" style="
                  background: #f8f9fa;
                  border: 1px solid #e1e5e9;
                  border-radius: 6px;
                  color: #495057;
                  cursor: pointer;
                  padding: 6px 10px;
                  font-size: 12px;
                  transition: all 0.2s;
                " title="Attach File">📎</button>
                <button class="settings-btn" style="
                  background: #f8f9fa;
                  border: 1px solid #e1e5e9;
                  border-radius: 6px;
                  color: #495057;
                  cursor: pointer;
                  padding: 6px 10px;
                  font-size: 12px;
                  transition: all 0.2s;
                " title="Settings">⚙️</button>
                <button class="abort-btn" style="
                  background: #dc3545;
                  border: 1px solid #dc3545;
                  border-radius: 6px;
                  color: white;
                  cursor: pointer;
                  padding: 6px 10px;
                  font-size: 12px;
                  transition: all 0.2s;
                  display: none;
                " title="Stop Generation">⏹️</button>
              </div>
              <textarea class="message-input" placeholder="Type your message..." style="
                width: 100%;
                background: #ffffff;
                border: 2px solid #e1e5e9;
                border-radius: 12px;
                padding: 12px 16px;
                color: #495057;
                font-size: 14px;
                resize: none;
                min-height: 20px;
                max-height: 120px;
                font-family: inherit;
                transition: border-color 0.2s;
                box-sizing: border-box;
              "></textarea>
            </div>
            <button class="send-btn" style="
              background: #1dbf73;
              border: none;
              border-radius: 12px;
              color: white;
              cursor: pointer;
              padding: 12px 16px;
              font-size: 16px;
              transition: background-color 0.2s;
              min-width: 48px;
              height: 48px;
            ">➤</button>
          </div>
        </div>
      </div>
    `;

    // Create trigger button - styled like message box icon
    this.triggerButton = document.createElement('button');
    this.triggerButton.innerHTML = '💬';
    this.triggerButton.title = 'AI Assistance';
    this.triggerButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
      opacity: 0.7;
      z-index: 9999;
    `;

    // Add hover effects for trigger button
    this.triggerButton.addEventListener('mouseenter', () => {
      this.triggerButton.style.opacity = '1';
      this.triggerButton.style.transform = 'scale(1.1)';
    });

    this.triggerButton.addEventListener('mouseleave', () => {
      this.triggerButton.style.opacity = '0.7';
      this.triggerButton.style.transform = 'scale(1)';
    });

    document.body.appendChild(this.container);
    document.body.appendChild(this.triggerButton);
  }

  setupEvents() {
    // Trigger button
    this.triggerButton.addEventListener('click', () => this.toggle());

    // Close button
    const closeBtn = this.container.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => this.hide());

    // Clear button
    const clearBtn = this.container.querySelector('.clear-btn');
    clearBtn.addEventListener('click', () => this.clearChat());

    // Send button
    const sendBtn = this.container.querySelector('.send-btn');
    sendBtn.addEventListener('click', () => this.sendMessage());

    // Trigger button
    this.triggerButton.addEventListener('click', () => this.show());

    // Prompts button
    const promptsBtn = this.container.querySelector('.prompts-btn');
    promptsBtn.addEventListener('click', () => this.togglePromptPanel());

    // Attach button
    const attachBtn = this.container.querySelector('.attach-btn');
    attachBtn.addEventListener('click', () => this.handleFileAttachment());

    // Settings button
    const settingsBtn = this.container.querySelector('.settings-btn');
    settingsBtn.addEventListener('click', () => this.showModelSettings());

    // Add prompt button
    const addPromptBtn = this.container.querySelector('.add-prompt-btn');
    addPromptBtn.addEventListener('click', () => this.addNewPrompt());

    // Abort button
    const abortBtn = this.container.querySelector('.abort-btn');
    abortBtn.addEventListener('click', () => this.abortRequest());

    // Enter key
    const input = this.container.querySelector('.message-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Focus styling
    input.addEventListener('focus', () => {
      input.style.borderColor = '#007bff';
    });

    input.addEventListener('blur', () => {
      input.style.borderColor = '#e1e5e9';
    });
  }

  async sendMessage() {
    const input = this.container.querySelector('.message-input');
    const message = input.value.trim();

    if (!message || this.isStreaming) return;

    // Try to reload API key if not available
    if (!this.apiKey) {
      await this.loadApiKey();
    }

    if (!this.apiKey) {
      this.addMessage('system', 'No API key found. Please set your Google API key in the extension settings and refresh the page.');
      return;
    }

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Add user message
    this.addMessage('user', message);

    // Add loading message
    const loadingId = this.addMessage('assistant', 'Thinking...');

    try {
      this.isStreaming = true;

      // Show abort button
      const abortBtn = this.container.querySelector('.abort-btn');
      abortBtn.style.display = 'block';

      // Add abort controller for request cancellation
      this.currentAbortController = new AbortController();

      // Call Gemini API with streaming
      await this.callGeminiAPIStreaming(message, loadingId);

    } catch (error) {
      console.error('AI Assistance: Chat error:', error);
      let errorMessage = 'Sorry, I encountered an error. Please try again.';

      if (error.name === 'AbortError') {
        errorMessage = 'Request was cancelled.';
      } else if (error.message.includes('API key')) {
        errorMessage = 'API key issue. Please check your settings and try again.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later or check your API key.';
      }

      this.updateMessage(loadingId, errorMessage);
    } finally {
      this.isStreaming = false;
      this.currentAbortController = null;

      // Hide abort button
      const abortBtn = this.container.querySelector('.abort-btn');
      abortBtn.style.display = 'none';
    }
  }

  async callGeminiAPI(message) {
    // Build conversation history for context
    const contents = [];

    // Add conversation history (last 10 messages for context)
    const recentMessages = this.messages.slice(-10);
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }]
        });
      }
    }

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const modelName = this.modelSettings?.model || 'gemini-2.5-flash-preview-05-20';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: contents,
      generationConfig: {
        temperature: this.modelSettings?.temperature || 0.7,
        maxOutputTokens: this.modelSettings?.maxTokens || 4096,
        topP: 0.8,
        topK: 40
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(`API Error: ${errorMessage}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('No valid response generated. Please try again.');
    }

    const responseText = data.candidates[0].content.parts[0].text;

    // Store message in history
    this.messages.push({ role: 'user', content: message });
    this.messages.push({ role: 'assistant', content: responseText });

    return responseText;
  }

  async callGeminiAPIStreaming(message, messageId) {
    // Build conversation history for context
    const contents = [];

    // Add system prompt if available
    if (this.modelSettings?.systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: `System: ${this.modelSettings.systemPrompt}` }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'I understand. I will follow these instructions.' }]
      });
    }

    // Add conversation history (last 10 messages for context)
    const recentMessages = this.messages.slice(-10);
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }]
        });
      }
    }

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const modelName = this.modelSettings?.model || 'gemini-2.5-flash-preview-05-20';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${this.apiKey}`;

    const body = {
      contents: contents,
      generationConfig: {
        temperature: this.modelSettings?.temperature || 0.7,
        maxOutputTokens: this.modelSettings?.maxTokens || 4096,
        topP: 0.8,
        topK: 40
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: this.currentAbortController?.signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(`API Error: ${errorMessage}`);
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const newText = data.candidates[0].content.parts[0].text;
                fullResponse += newText;
                this.updateMessage(messageId, fullResponse);
              }

              // Track token usage
              if (data.usageMetadata) {
                inputTokens = data.usageMetadata.promptTokenCount || 0;
                outputTokens = data.usageMetadata.candidatesTokenCount || 0;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Store message in history
    this.messages.push({ role: 'user', content: message });
    this.messages.push({ role: 'assistant', content: fullResponse });

    // Add token usage info
    if (inputTokens > 0 || outputTokens > 0) {
      this.addTokenUsageInfo(inputTokens, outputTokens);
    }

    return fullResponse;
  }

  addTokenUsageInfo(inputTokens, outputTokens) {
    const totalTokens = inputTokens + outputTokens;
    const cost = this.calculateCost(inputTokens, outputTokens);

    const usageDiv = document.createElement('div');
    usageDiv.style.cssText = `
      margin: 8px 20px;
      padding: 8px 12px;
      background: #e3f2fd;
      border: 1px solid #bbdefb;
      border-radius: 8px;
      font-size: 11px;
      color: #1565c0;
      text-align: center;
    `;

    usageDiv.innerHTML = `
      📊 Tokens: ${inputTokens} in + ${outputTokens} out = ${totalTokens} total |
      💰 Cost: ~$${cost.toFixed(6)}
    `;

    const messagesContainer = this.container.querySelector('.messages-container');
    messagesContainer.appendChild(usageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  calculateCost(inputTokens, outputTokens) {
    // Gemini pricing (approximate)
    const inputCostPer1K = 0.00015; // $0.00015 per 1K input tokens
    const outputCostPer1K = 0.0006; // $0.0006 per 1K output tokens

    const inputCost = (inputTokens / 1000) * inputCostPer1K;
    const outputCost = (outputTokens / 1000) * outputCostPer1K;

    return inputCost + outputCost;
  }

  // Abort current request
  abortRequest() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.addMessage('system', 'Request cancelled.');
    }
  }

  addMessage(role, content) {
    const messagesContainer = this.container.querySelector('.messages-container');
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.style.cssText = `
      margin-bottom: 16px;
      padding: 16px;
      border-radius: 12px;
      ${role === 'user' ?
        'background: #1dbf73; color: #fff; margin-left: 20%; border: 1px solid #19a463;' :
        role === 'system' ?
        'background: #f8f9fa; color: #6c757d; border: 1px solid #e9ecef;' :
        'background: #ffffff; color: #333; border: 1px solid #e1e5e9; box-shadow: 0 1px 3px rgba(0,0,0,0.1);'
      }
    `;

    const copyMessageHandler = (e) => {
      e.preventDefault();
      const messageWrapper = e.currentTarget.closest('.message-wrapper');
      const messageContent = messageWrapper.querySelector('.message-content');
      const textContent = messageContent.textContent || messageContent.innerText;

      navigator.clipboard.writeText(textContent).then(() => {
        // Show copy status
        this.showCopyStatus(messageWrapper);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    };

    messageDiv.innerHTML = `
      <div class="message-wrapper">
        <div style="font-size: 12px; opacity: 0.8; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600;">${role === 'user' ? 'You' : role === 'system' ? 'System' : 'AI Assistant'}</span>
          ${role !== 'system' ? `
            <div class="copy-status" style="font-size: 11px; color: #28a745; opacity: 0; transition: opacity 0.3s;">
              Copied!
            </div>
          ` : ''}
        </div>
        <div class="message-content" style="line-height: 1.5; cursor: pointer;" title="Click to copy message">${this.formatMessage(content)}</div>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);

    // Add click to copy functionality for message content
    const messageContent = messageDiv.querySelector('.message-content');
    if (messageContent && role !== 'system') {
      messageContent.addEventListener('click', copyMessageHandler);
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageId;
  }

  showCopyStatus(messageWrapper) {
    const copyStatus = messageWrapper.querySelector('.copy-status');
    if (copyStatus) {
      copyStatus.style.opacity = '1';
      setTimeout(() => {
        copyStatus.style.opacity = '0';
      }, 2000);
    }
  }

  updateMessage(messageId, content) {
    const messageDiv = document.getElementById(messageId);
    if (messageDiv) {
      const contentDiv = messageDiv.querySelector('.message-content');
      contentDiv.innerHTML = this.formatMessage(content);
    }
  }

  formatMessage(content) {
    // First, handle JSON and XML parsing
    content = this.parseStructuredData(content);

    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background: #f8f9fa; color: #e83e8c; padding: 2px 6px; border-radius: 4px; border: 1px solid #e9ecef;">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background: #f8f9fa; padding: 12px; border-radius: 8px; overflow-x: auto; border: 1px solid #e9ecef; margin: 8px 0;"><code style="color: #495057;">$1</code></pre>');
  }

  parseStructuredData(content) {
    // JSON Parser
    content = content.replace(/```json\n([\s\S]*?)\n```/g, (match, jsonStr) => {
      try {
        const parsed = JSON.parse(jsonStr);
        const formatted = JSON.stringify(parsed, null, 2);
        return `<div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; margin: 8px 0; overflow: hidden;">
          <div style="background: #e9ecef; padding: 8px 12px; font-weight: 600; color: #495057; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
            📄 JSON Data
            <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent)" style="background: #007bff; border: none; border-radius: 4px; color: white; cursor: pointer; padding: 2px 6px; font-size: 10px;">Copy</button>
          </div>
          <pre style="margin: 0; padding: 12px; overflow-x: auto; background: #ffffff;"><code style="color: #495057;">${formatted}</code></pre>
        </div>`;
      } catch (e) {
        return match; // Return original if parsing fails
      }
    });

    // XML Parser
    content = content.replace(/```xml\n([\s\S]*?)\n```/g, (match, xmlStr) => {
      try {
        // Basic XML formatting
        const formatted = xmlStr
          .replace(/></g, '>\n<')
          .split('\n')
          .map(line => line.trim())
          .filter(line => line)
          .map((line, index, arr) => {
            const depth = line.split('<').length - line.split('</').length;
            const indent = '  '.repeat(Math.max(0, index - depth));
            return indent + line;
          })
          .join('\n');

        return `<div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; margin: 8px 0; overflow: hidden;">
          <div style="background: #e9ecef; padding: 8px 12px; font-weight: 600; color: #495057; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
            🏷️ XML Data
            <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent)" style="background: #007bff; border: none; border-radius: 4px; color: white; cursor: pointer; padding: 2px 6px; font-size: 10px;">Copy</button>
          </div>
          <pre style="margin: 0; padding: 12px; overflow-x: auto; background: #ffffff;"><code style="color: #495057;">${formatted}</code></pre>
        </div>`;
      } catch (e) {
        return match; // Return original if parsing fails
      }
    });

    return content;
  }



  clearChat() {
    const messagesContainer = this.container.querySelector('.messages-container');
    messagesContainer.innerHTML = '';
    this.messages = [];
  }

  show() {
    this.isVisible = true;
    this.container.querySelector('.ai-assistance-window').style.display = 'flex';
    this.triggerButton.style.display = 'none';

    // Focus input
    setTimeout(() => {
      this.container.querySelector('.message-input').focus();
    }, 100);
  }

  hide() {
    this.isVisible = false;
    this.container.querySelector('.ai-assistance-window').style.display = 'none';
    this.triggerButton.style.display = 'block';
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  // Prompt Management System
  togglePromptPanel() {
    const promptPanel = this.container.querySelector('.prompt-panel');
    const isVisible = promptPanel.style.display !== 'none';
    promptPanel.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
      this.loadPrompts();
    }
  }

  async loadPrompts() {
    try {
      const result = await chrome.storage.local.get('aiAssistancePrompts');
      this.prompts = result.aiAssistancePrompts || [];
      this.renderPrompts();
    } catch (error) {
      console.error('Failed to load prompts:', error);
      this.prompts = [];
    }
  }

  renderPrompts() {
    const promptList = this.container.querySelector('.prompt-list');
    promptList.innerHTML = '';

    this.prompts.forEach((prompt, index) => {
      const promptDiv = document.createElement('div');
      promptDiv.style.cssText = `
        background: #ffffff;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 8px 12px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      promptDiv.innerHTML = `
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 12px; color: #495057; margin-bottom: 2px;">${prompt.title}</div>
          <div style="font-size: 11px; color: #6c757d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${prompt.content}</div>
        </div>
        <div style="display: flex; gap: 4px;">
          <button class="use-prompt-btn" style="background: #007bff; border: none; border-radius: 4px; color: white; cursor: pointer; padding: 2px 6px; font-size: 10px;">Use</button>
          <button class="edit-prompt-btn" style="background: #6c757d; border: none; border-radius: 4px; color: white; cursor: pointer; padding: 2px 6px; font-size: 10px;">Edit</button>
          <button class="delete-prompt-btn" style="background: #dc3545; border: none; border-radius: 4px; color: white; cursor: pointer; padding: 2px 6px; font-size: 10px;">×</button>
        </div>
      `;

      // Event listeners
      promptDiv.querySelector('.use-prompt-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.usePrompt(prompt.content);
      });

      promptDiv.querySelector('.edit-prompt-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.editPrompt(index);
      });

      promptDiv.querySelector('.delete-prompt-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deletePrompt(index);
      });

      promptList.appendChild(promptDiv);
    });
  }

  usePrompt(content) {
    const input = this.container.querySelector('.message-input');
    input.value = content;
    input.focus();
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    this.togglePromptPanel(); // Close panel
  }

  async addNewPrompt() {
    const title = prompt('Enter prompt title:');
    if (!title) return;

    const content = prompt('Enter prompt content:');
    if (!content) return;

    this.prompts.push({ title, content });
    await this.savePrompts();
    this.renderPrompts();
  }

  async editPrompt(index) {
    const prompt = this.prompts[index];
    const newTitle = window.prompt('Edit prompt title:', prompt.title);
    if (newTitle === null) return;

    const newContent = window.prompt('Edit prompt content:', prompt.content);
    if (newContent === null) return;

    this.prompts[index] = { title: newTitle, content: newContent };
    await this.savePrompts();
    this.renderPrompts();
  }

  async deletePrompt(index) {
    if (confirm('Delete this prompt?')) {
      this.prompts.splice(index, 1);
      await this.savePrompts();
      this.renderPrompts();
    }
  }

  async savePrompts() {
    try {
      await chrome.storage.local.set({ aiAssistancePrompts: this.prompts });
    } catch (error) {
      console.error('Failed to save prompts:', error);
    }
  }

  // File Attachment System
  handleFileAttachment() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*'; // Accept all file types for Gemini
    input.multiple = true;

    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => this.processFile(file));
    };

    input.click();
  }

  async processFile(file) {
    try {
      const text = await this.readFileAsText(file);
      const messageInput = this.container.querySelector('.message-input');
      const currentValue = messageInput.value;
      const fileContent = `\n\n[File: ${file.name}]\n${text}\n[End of ${file.name}]\n\n`;
      messageInput.value = currentValue + fileContent;
      messageInput.style.height = 'auto';
      messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';

      this.addMessage('system', `File attached: ${file.name} (${file.size} bytes)`);
    } catch (error) {
      this.addMessage('system', `Failed to read file: ${file.name} - ${error.message}`);
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Model Settings
  showModelSettings() {
    const settingsHtml = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                  background: white; border: 1px solid #e1e5e9; border-radius: 12px;
                  padding: 24px; z-index: 10001; box-shadow: 0 12px 48px rgba(0,0,0,0.15);
                  min-width: 300px;">
        <h3 style="margin: 0 0 16px 0; color: #495057;">Model Settings</h3>

        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #495057;">Temperature:</label>
          <input type="range" id="temperature-slider" min="0" max="1" step="0.1" value="0.7"
                 style="width: 100%; margin-bottom: 4px;">
          <span id="temperature-value" style="font-size: 12px; color: #6c757d;">0.7</span>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #495057;">Max Tokens:</label>
          <input type="number" id="max-tokens" value="65536" min="1" max="65536"
                 style="width: 100%; padding: 8px; border: 1px solid #e1e5e9; border-radius: 6px;">
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #495057;">Model:</label>
          <select id="model-select" style="width: 100%; padding: 8px; border: 1px solid #e1e5e9; border-radius: 6px;">
            <option value="gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash (Preview)</option>
            <option value="gemini-2.5-pro-preview-05-20">Gemini 2.5 Pro (Preview)</option>
          </select>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #495057;">System Prompt:</label>
          <textarea id="system-prompt" placeholder="Enter system prompt (optional)" style="
            width: 100%; height: 60px; padding: 8px; border: 1px solid #e1e5e9; border-radius: 6px;
            resize: vertical; font-family: inherit; font-size: 12px;
          "></textarea>
        </div>

        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="cancel-settings" style="background: #6c757d; border: none; border-radius: 6px;
                                              color: white; cursor: pointer; padding: 8px 16px;">Cancel</button>
          <button id="save-settings" style="background: #007bff; border: none; border-radius: 6px;
                                           color: white; cursor: pointer; padding: 8px 16px;">Save</button>
        </div>
        <button id="close-settings" style="position: absolute; top: 8px; right: 8px; background: none;
                                          border: none; font-size: 20px; cursor: pointer; color: #6c757d;">×</button>
      </div>
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                  background: rgba(0,0,0,0.5); z-index: 10000;" id="settings-overlay"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', settingsHtml);

    // Load current settings
    this.loadModelSettings();

    // Event listeners
    document.getElementById('temperature-slider').addEventListener('input', (e) => {
      document.getElementById('temperature-value').textContent = e.target.value;
    });

    document.getElementById('save-settings').addEventListener('click', () => {
      this.saveModelSettings();
      this.closeModelSettings();
    });

    document.getElementById('cancel-settings').addEventListener('click', () => {
      this.closeModelSettings();
    });

    document.getElementById('close-settings').addEventListener('click', () => {
      this.closeModelSettings();
    });

    document.getElementById('settings-overlay').addEventListener('click', () => {
      this.closeModelSettings();
    });
  }

  async loadModelSettings() {
    try {
      const result = await chrome.storage.local.get('aiAssistanceModelSettings');
      const settings = result.aiAssistanceModelSettings || {
        temperature: 0.7,
        maxTokens: 65536,
        model: 'gemini-2.5-flash-preview-05-20',
        systemPrompt: ''
      };

      document.getElementById('temperature-slider').value = settings.temperature;
      document.getElementById('temperature-value').textContent = settings.temperature;
      document.getElementById('max-tokens').value = settings.maxTokens;
      document.getElementById('model-select').value = settings.model;
      document.getElementById('system-prompt').value = settings.systemPrompt || '';

      this.modelSettings = settings;
    } catch (error) {
      console.error('Failed to load model settings:', error);
    }
  }

  async saveModelSettings() {
    const settings = {
      temperature: parseFloat(document.getElementById('temperature-slider').value),
      maxTokens: parseInt(document.getElementById('max-tokens').value),
      model: document.getElementById('model-select').value,
      systemPrompt: document.getElementById('system-prompt').value
    };

    try {
      await chrome.storage.local.set({ aiAssistanceModelSettings: settings });
      this.modelSettings = settings;
      this.addMessage('system', 'Model settings saved successfully.');
    } catch (error) {
      console.error('Failed to save model settings:', error);
      this.addMessage('system', 'Failed to save model settings.');
    }
  }

  closeModelSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    const settingsDiv = overlay ? overlay.previousElementSibling : null;
    if (settingsDiv && settingsDiv.parentNode) {
      settingsDiv.parentNode.removeChild(settingsDiv);
    }
  }

  // Initialize default settings
  async initializeSettings() {
    try {
      const result = await chrome.storage.local.get('aiAssistanceModelSettings');
      this.modelSettings = result.aiAssistanceModelSettings || {
        temperature: 0.7,
        maxTokens: 4096,
        model: 'gemini-2.5-flash-preview-05-20',
        systemPrompt: ''
      };
    } catch (error) {
      console.error('Failed to initialize settings:', error);
      this.modelSettings = {
        temperature: 0.7,
        maxTokens: 4096,
        model: 'gemini-2.5-flash-preview-05-20',
        systemPrompt: ''
      };
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistanceChat = new AIAssistanceChat();
  });
} else {
  window.aiAssistanceChat = new AIAssistanceChat();
}

// Export for global access
window.AIAssistanceChat = AIAssistanceChat;

// Initialize the chat system
document.addEventListener('DOMContentLoaded', () => {
  window.simpleUniversalChat = new AIAssistanceChat();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.simpleUniversalChat = new AIAssistanceChat();
  });
} else {
  window.simpleUniversalChat = new AIAssistanceChat();
}
