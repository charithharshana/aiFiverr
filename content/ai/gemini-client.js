/**
 * Gemini Client for aiFiverr Extension
 * Handles direct API calls to Google's Gemini API
 */

class GeminiClient {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.initialized = false;
    this.defaultModel = 'gemini-2.5-flash';
  }

  async init() {
    try {
      this.initialized = true;
      console.log('aiFiverr: Gemini Client initialized');
    } catch (error) {
      console.error('aiFiverr: Gemini Client initialization error:', error);
      this.initialized = true; // Still mark as initialized to prevent blocking
    }
  }

  /**
   * Get API key for Gemini API
   */
  async getApiKey() {
    try {
      if (window.apiKeyManager && window.apiKeyManager.initialized) {
        const keyData = window.apiKeyManager.getKeyForSession('gemini');
        if (keyData) {
          return keyData.key;
        }
      }

      // Fallback to background script
      const response = await chrome.runtime.sendMessage({ type: 'GET_API_KEY' });
      if (response?.success && response?.data) {
        return response.data.key;
      }

      throw new Error('No API key available');
    } catch (error) {
      console.error('aiFiverr Gemini: Failed to get API key:', error);
      throw error;
    }
  }

  /**
   * Get selected model from settings
   */
  async getSelectedModel() {
    try {
      if (window.storageManager && window.storageManager.initialized) {
        const settings = await window.storageManager.get('settings');
        return settings.settings?.selectedModel || settings.settings?.defaultModel || this.defaultModel;
      }

      // Fallback to chrome storage
      const result = await chrome.storage.local.get('settings');
      return result.settings?.selectedModel || result.settings?.defaultModel || this.defaultModel;
    } catch (error) {
      console.warn('aiFiverr Gemini: Failed to get model setting, using default:', error);
      return this.defaultModel;
    }
  }

  /**
   * Generate content using Gemini API
   */
  async generateContent(prompt, options = {}) {
    try {
      const apiKey = await this.getApiKey();
      const model = options.model || await this.getSelectedModel();

      console.log('aiFiverr Gemini: Generating content with model:', model);

      const contents = [{
        parts: [],
        role: "user"
      }];

      // Add knowledge base files first if provided
      if (options.knowledgeBaseFiles && options.knowledgeBaseFiles.length > 0) {
        for (const file of options.knowledgeBaseFiles) {
          if (file.geminiUri) {
            contents[0].parts.push({
              fileData: {
                fileUri: file.geminiUri,
                mimeType: file.mimeType || 'application/octet-stream'
              }
            });
          }
        }
        console.log('aiFiverr Gemini: Added', options.knowledgeBaseFiles.length, 'knowledge base files');
      }

      // Add text prompt
      contents[0].parts.push({
        text: prompt
      });

      const payload = {
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          candidateCount: 1
        }
      };

      const response = await fetch(`${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();

      if (!result.candidates || result.candidates.length === 0) {
        throw new Error('No response generated from Gemini API');
      }

      const text = result.candidates[0].content.parts[0].text;
      return {
        text: text,
        response: text // For compatibility
      };

    } catch (error) {
      console.error('aiFiverr Gemini: Generate content failed:', error);
      throw error;
    }
  }

  /**
   * Generate chat reply with session context
   */
  async generateChatReply(session, message, options = {}) {
    try {
      console.log('aiFiverr Gemini: Generating chat reply for session:', session?.id);

      const apiKey = await this.getApiKey();
      const model = options.model || await this.getSelectedModel();

      // Build conversation history
      const contents = [];

      if (session && session.messages && session.messages.length > 0) {
        // Add recent conversation history (last 10 messages for context)
        const recentMessages = session.messages.slice(-10);
        for (const msg of recentMessages) {
          if (msg.role === 'user') {
            contents.push({
              role: 'user',
              parts: [{ text: msg.content }]
            });
          } else if (msg.role === 'assistant' || msg.role === 'model') {
            contents.push({
              role: 'model',
              parts: [{ text: msg.content }]
            });
          }
        }
      }

      // Add current message
      const currentMessageParts = [];

      // Add knowledge base files first if provided
      if (options.knowledgeBaseFiles && options.knowledgeBaseFiles.length > 0) {
        for (const file of options.knowledgeBaseFiles) {
          if (file.geminiUri) {
            currentMessageParts.push({
              fileData: {
                fileUri: file.geminiUri,
                mimeType: file.mimeType || 'application/octet-stream'
              }
            });
          }
        }
        console.log('aiFiverr Gemini: Added', options.knowledgeBaseFiles.length, 'knowledge base files to chat');
      }

      // Add text message
      currentMessageParts.push({ text: message });

      contents.push({
        role: 'user',
        parts: currentMessageParts
      });

      const payload = {
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          candidateCount: 1
        }
      };

      const response = await fetch(`${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();

      if (!result.candidates || result.candidates.length === 0) {
        throw new Error('No response generated from Gemini API');
      }

      const responseText = result.candidates[0].content.parts[0].text;

      // Add to session if provided
      if (session && session.addMessage) {
        session.addMessage('user', message);
        session.addMessage('assistant', responseText);
      }

      return {
        response: responseText,
        text: responseText // For compatibility
      };

    } catch (error) {
      console.error('aiFiverr Gemini: Generate chat reply failed:', error);
      throw error;
    }
  }
}

// Initialize global instance
function initializeGeminiClient() {
  if (!window.geminiClient) {
    window.geminiClient = new GeminiClient();
    window.geminiClient.init();
    console.log('aiFiverr: Gemini Client created and initialized');
  }
  return window.geminiClient;
}

// Export the initialization function
window.initializeGeminiClient = initializeGeminiClient;