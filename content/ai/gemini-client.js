/**
 * Gemini AI Client
 * Handles communication with Google's Gemini API with streaming support
 */

class GeminiClient {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-2.5-flash';
    this.requestQueue = [];
    this.isProcessing = false;
    this.init();
  }

  async init() {
    try {
      // Check if extension context is valid
      if (!chrome.runtime?.id) {
        console.warn('Gemini client: Extension context invalidated, using defaults');
        this.model = 'gemini-2.5-flash';
        this.initialized = true;
        return;
      }

      // Load settings
      const settings = await storageManager.getSettings();
      this.model = settings.defaultModel || 'gemini-2.5-flash';
      this.initialized = true;
    } catch (error) {
      console.error('Gemini client init error:', error);
      this.model = 'gemini-2.5-flash';
      this.initialized = true;
    }
  }

  /**
   * Get API key with fallback to background script
   */
  async getApiKey(sessionId) {
    try {
      // Try local API key manager first
      if (window.apiKeyManager && window.apiKeyManager.initialized) {
        const keyData = window.apiKeyManager.getKeyForSession(sessionId);
        if (keyData) {
          return keyData;
        }
      }

      // Fallback to background script
      return await this.getApiKeyFromBackground();
    } catch (error) {
      console.error('Failed to get API key:', error);
      return null;
    }
  }

  /**
   * Get API key from background script
   */
  async getApiKeyFromBackground() {
    return new Promise((resolve) => {
      try {
        if (!chrome.runtime?.id) {
          console.warn('Extension context invalidated, cannot get API key');
          resolve(null);
          return;
        }

        chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('Background API key error:', chrome.runtime.lastError.message);
            resolve(null);
          } else if (response?.success && response?.data) {
            resolve(response.data);
          } else {
            resolve(null);
          }
        });
      } catch (error) {
        console.warn('Failed to get API key from background:', error.message);
        resolve(null);
      }
    });
  }

  /**
   * Mark key as successful
   */
  markKeySuccess(keyIndex) {
    try {
      if (window.apiKeyManager && window.apiKeyManager.initialized) {
        window.apiKeyManager.markKeySuccess(keyIndex);
      } else {
        // Notify background script
        this.notifyBackgroundKeyStatus(keyIndex, true);
      }
    } catch (error) {
      console.warn('Failed to mark key success:', error);
    }
  }

  /**
   * Mark key as failed
   */
  markKeyFailure(keyIndex, error) {
    try {
      if (window.apiKeyManager && window.apiKeyManager.initialized) {
        window.apiKeyManager.markKeyFailure(keyIndex, error);
      } else {
        // Notify background script
        this.notifyBackgroundKeyStatus(keyIndex, false, error);
      }
    } catch (error) {
      console.warn('Failed to mark key failure:', error);
    }
  }

  /**
   * Log key status locally (no background communication)
   */
  notifyBackgroundKeyStatus(keyIndex, success, error = null) {
    // Just log locally - no background script communication needed
    console.log(`aiFiverr: API Key ${keyIndex} status:`, success ? 'SUCCESS' : 'FAILED', error?.message || '');
  }

  /**
   * Generate content using Gemini API
   */
  async generateContent(prompt, options = {}) {
    const keyData = await this.getApiKey(options.sessionId || 'default');

    if (!keyData) {
      throw new Error('No API key available');
    }

    try {
      const response = await this.makeRequest(keyData, prompt, options);

      // Mark key as successful
      this.markKeySuccess(keyData.index);

      return response;
    } catch (error) {
      // Mark key as failed
      this.markKeyFailure(keyData.index, error);
      throw error;
    }
  }

  /**
   * Generate streaming content
   */
  async generateStreamingContent(prompt, options = {}) {
    const keyData = await this.getApiKey(options.sessionId || 'default');

    if (!keyData) {
      throw new Error('No API key available');
    }

    try {
      const stream = await this.makeStreamingRequest(keyData, prompt, options);

      // Mark key as successful
      this.markKeySuccess(keyData.index);

      return stream;
    } catch (error) {
      // Mark key as failed
      this.markKeyFailure(keyData.index, error);
      throw error;
    }
  }

  /**
   * Make API request
   */
  async makeRequest(keyData, prompt, options = {}) {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${keyData.key}`;
    
    const requestBody = this.buildRequestBody(prompt, options);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated');
    }

    const candidate = data.candidates[0];
    
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Response blocked by safety filters');
    }

    return {
      text: candidate.content?.parts?.[0]?.text || '',
      finishReason: candidate.finishReason,
      safetyRatings: candidate.safetyRatings,
      usageMetadata: data.usageMetadata
    };
  }

  /**
   * Make streaming API request
   */
  async makeStreamingRequest(keyData, prompt, options = {}) {
    const url = `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${keyData.key}`;
    
    const requestBody = this.buildRequestBody(prompt, options);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Streaming request failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return this.createStreamReader(response);
  }

  /**
   * Build request body for API
   */
  buildRequestBody(prompt, options = {}) {
    const body = {
      contents: [],
      generationConfig: {
        temperature: options.temperature || 0.7,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxTokens || 2048,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };

    // Handle different prompt types
    if (typeof prompt === 'string') {
      const parts = [{ text: prompt }];

      // Add knowledge base files if provided
      if (options.knowledgeBaseFiles && options.knowledgeBaseFiles.length > 0) {
        console.log('aiFiverr Gemini: Processing knowledge base files:', options.knowledgeBaseFiles);

        let filesAdded = 0;
        let filesSkipped = 0;

        options.knowledgeBaseFiles.forEach(file => {
          console.log('aiFiverr Gemini: Processing file:', {
            name: file.name,
            mimeType: file.mimeType,
            geminiUri: file.geminiUri,
            hasGeminiUri: !!file.geminiUri
          });

          if (file.geminiUri) {
            const filePart = {
              fileData: {
                mimeType: file.mimeType || 'application/octet-stream',
                fileUri: file.geminiUri
              }
            };
            parts.push(filePart);
            filesAdded++;
            console.log('aiFiverr Gemini: Added file to request:', file.name, file.geminiUri, filePart);
          } else {
            filesSkipped++;
            console.warn('aiFiverr Gemini: Skipping file without geminiUri:', {
              name: file.name,
              id: file.id,
              driveFileId: file.driveFileId,
              mimeType: file.mimeType
            });
          }
        });

        console.log(`aiFiverr Gemini: File attachment summary - Added: ${filesAdded}, Skipped: ${filesSkipped}, Total parts: ${parts.length}`);
      } else {
        console.log('aiFiverr Gemini: No knowledge base files provided in options');
      }

      body.contents.push({
        role: 'user',
        parts: parts
      });
    } else if (Array.isArray(prompt)) {
      // Conversation history
      body.contents = prompt;
    } else if (prompt.messages) {
      // Session format
      body.contents = prompt.messages;
    }

    // Add system instruction if provided
    if (options.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: options.systemInstruction }]
      };
    }

    // Log final request structure for debugging
    console.log('aiFiverr Gemini: Final API request body structure:', {
      contentsCount: body.contents.length,
      hasSystemInstruction: !!body.systemInstruction,
      firstContentParts: body.contents[0]?.parts?.length || 0,
      fileDataParts: body.contents[0]?.parts?.filter(p => p.fileData)?.length || 0,
      textParts: body.contents[0]?.parts?.filter(p => p.text)?.length || 0
    });

    // Log file data parts specifically
    const fileDataParts = body.contents[0]?.parts?.filter(p => p.fileData) || [];
    if (fileDataParts.length > 0) {
      console.log('aiFiverr Gemini: File data parts in request:', fileDataParts.map(p => ({
        mimeType: p.fileData.mimeType,
        fileUri: p.fileData.fileUri
      })));
    }

    return body;
  }

  /**
   * Create stream reader for streaming responses
   */
  async createStreamReader(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    return {
      async *[Symbol.asyncIterator]() {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6); // Remove 'data: ' prefix
                  const data = JSON.parse(jsonStr);
                  
                  if (data.candidates && data.candidates[0]) {
                    const candidate = data.candidates[0];
                    const text = candidate.content?.parts?.[0]?.text || '';
                    
                    if (text) {
                      yield {
                        text,
                        finishReason: candidate.finishReason,
                        delta: text
                      };
                    }
                  }
                } catch (parseError) {
                  console.warn('Failed to parse streaming chunk:', parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    };
  }

  /**
   * Generate chat reply with conversation context
   */
  async generateChatReply(session, userMessage, options = {}) {
    console.log('=== aiFiverr Gemini API Request Started ===');
    console.log('aiFiverr Gemini: Session ID:', session.id);
    console.log('aiFiverr Gemini: User message length:', userMessage.length);
    console.log('aiFiverr Gemini: User message preview:', userMessage.substring(0, 200) + '...');
    console.log('aiFiverr Gemini: Options provided:', {
      hasKnowledgeBaseFiles: !!(options.knowledgeBaseFiles && options.knowledgeBaseFiles.length > 0),
      knowledgeBaseFilesCount: options.knowledgeBaseFiles?.length || 0,
      hasSystemInstruction: !!options.systemInstruction,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    });

    // Add user message to session
    session.addMessage('user', userMessage);

    // Get conversation context
    const messages = session.getMessagesForAPI();
    console.log('aiFiverr Gemini: Conversation context messages:', messages.length);
    
    // Add Fiverr context if available
    let systemInstruction = options.systemInstruction || this.getDefaultSystemInstruction();
    
    if (session.metadata.fiverrContext) {
      systemInstruction += `\n\nFiverr Context: ${session.metadata.fiverrContext}`;
    }

    try {
      const response = await this.generateContent(messages, {
        ...options,
        sessionId: session.sessionId,
        systemInstruction
      });

      // Add AI response to session
      const aiMessage = session.addMessage('assistant', response.text);
      
      // Save session
      await session.save();
      
      return {
        message: aiMessage,
        response: response.text,
        metadata: {
          finishReason: response.finishReason,
          usageMetadata: response.usageMetadata
        }
      };
    } catch (error) {
      console.error('Chat reply generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate streaming chat reply
   */
  async generateStreamingChatReply(session, userMessage, options = {}) {
    // Add user message to session
    session.addMessage('user', userMessage);
    
    // Get conversation context
    const messages = session.getMessagesForAPI();
    
    // Add Fiverr context if available
    let systemInstruction = options.systemInstruction || this.getDefaultSystemInstruction();
    
    if (session.metadata.fiverrContext) {
      systemInstruction += `\n\nFiverr Context: ${session.metadata.fiverrContext}`;
    }

    try {
      const stream = await this.generateStreamingContent(messages, {
        ...options,
        sessionId: session.sessionId,
        systemInstruction
      });

      let fullResponse = '';
      
      return {
        async *[Symbol.asyncIterator]() {
          for await (const chunk of stream) {
            fullResponse += chunk.text;
            yield chunk;
          }
          
          // Add complete AI response to session
          session.addMessage('assistant', fullResponse);
          await session.save();
        }
      };
    } catch (error) {
      console.error('Streaming chat reply generation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze message content
   */
  async analyzeMessage(content, options = {}) {
    const prompt = `Analyze the following message for tone, intent, and key points. Provide a brief analysis:

Message: "${content}"

Please provide:
1. Tone (professional, casual, urgent, etc.)
2. Intent (question, request, complaint, etc.)
3. Key points or requirements
4. Suggested response approach`;

    try {
      const response = await this.generateContent(prompt, options);
      return response.text;
    } catch (error) {
      console.error('Message analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate proposal based on brief data
   */
  async generateProposal(briefData, knowledgeBase = {}, options = {}) {
    let prompt = 'Generate a professional Fiverr proposal based on the following project brief:\n\n';
    
    if (briefData) {
      if (briefData.title) prompt += `Title: ${briefData.title}\n`;
      if (briefData.description) prompt += `Description: ${briefData.description}\n`;
      if (briefData.requirements?.length) prompt += `Requirements: ${briefData.requirements.join(', ')}\n`;
      if (briefData.budget) prompt += `Budget: ${briefData.budget}\n`;
      if (briefData.deadline) prompt += `Deadline: ${briefData.deadline}\n`;
      if (briefData.skills?.length) prompt += `Skills needed: ${briefData.skills.join(', ')}\n`;
    }

    prompt += '\n\nPlease create a compelling proposal that:\n';
    prompt += '1. Addresses the client\'s specific needs\n';
    prompt += '2. Highlights relevant experience and skills\n';
    prompt += '3. Provides a clear approach to the project\n';
    prompt += '4. Maintains a professional yet personable tone\n';

    // Add knowledge base information
    if (Object.keys(knowledgeBase).length > 0) {
      prompt += '\n\nUse the following information about the freelancer:\n';
      Object.entries(knowledgeBase).forEach(([key, value]) => {
        prompt += `${key}: ${value}\n`;
      });
    }

    try {
      const response = await this.generateContent(prompt, options);
      return response.text;
    } catch (error) {
      console.error('Proposal generation failed:', error);
      throw error;
    }
  }

  /**
   * Get default system instruction
   */
  getDefaultSystemInstruction() {
    return `You are an AI assistant helping with Fiverr communications. You should:
1. Be professional and helpful
2. Understand the context of freelance work and client relationships
3. Provide clear, actionable responses
4. Maintain appropriate tone for business communications
5. Help with proposals, messages, and project discussions
6. Be concise but thorough in your responses`;
  }

  /**
   * Summarize conversation
   */
  async summarizeConversation(conversationData, options = {}) {
    const prompt = `Summarize the following Fiverr conversation, highlighting key points, decisions, and action items:

${conversationData}

Please provide:
1. Brief overview of the conversation
2. Key decisions made
3. Action items or next steps
4. Important deadlines or requirements mentioned`;

    try {
      const response = await this.generateContent(prompt, options);
      return response.text;
    } catch (error) {
      console.error('Conversation summarization failed:', error);
      throw error;
    }
  }

  /**
   * Extract key information from text
   */
  async extractKeyInfo(text, options = {}) {
    const prompt = `Extract key information from the following text:

${text}

Please identify:
1. Important requirements or specifications
2. Deadlines or time constraints
3. Budget or pricing information
4. Contact information or next steps
5. Any specific preferences or constraints`;

    try {
      const response = await this.generateContent(prompt, options);
      return response.text;
    } catch (error) {
      console.error('Key information extraction failed:', error);
      throw error;
    }
  }

  /**
   * Check API key validity
   */
  async validateApiKey(apiKey) {
    try {
      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: 'Hello' }]
          }],
          generationConfig: {
            maxOutputTokens: 10
          }
        })
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(apiKey) {
    try {
      const url = `${this.baseUrl}/models?key=${apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }
}

// Create global Gemini client - but only when explicitly called
function initializeGeminiClient() {
  if (!window.geminiClient) {
    window.geminiClient = new GeminiClient();
    console.log('aiFiverr: Gemini Client created');
  }
  return window.geminiClient;
}

// Export the initialization function but DO NOT auto-initialize
window.initializeGeminiClient = initializeGeminiClient;

// REMOVED AUTO-INITIALIZATION - This was causing the Gemini client to load on every website
// The Gemini client should only be initialized when explicitly called by the main extension
