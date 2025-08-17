/**
 * Fiverr Content Extractor
 * Extracts conversation data and context from Fiverr pages
 * Based on fiverr-conversation-extractor patterns
 */

class FiverrExtractor {
  constructor() {
    this.conversationCache = new Map();
    this.extractionInProgress = false;
  }

  /**
   * Extract conversation data from current page
   */
  async extractConversation() {
    if (this.extractionInProgress) {
      return null;
    }

    this.extractionInProgress = true;

    try {
      const username = this.extractUsernameFromUrl();
      if (!username) {
        throw new Error('Could not extract username from URL');
      }

      // Check cache first
      if (this.conversationCache.has(username)) {
        const cached = this.conversationCache.get(username);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes cache
          return cached.data;
        }
      }

      const conversationData = await this.fetchConversationData(username);
      
      // Cache the result
      this.conversationCache.set(username, {
        data: conversationData,
        timestamp: Date.now()
      });

      return conversationData;
    } catch (error) {
      console.error('Conversation extraction failed:', error);
      return null;
    } finally {
      this.extractionInProgress = false;
    }
  }

  /**
   * Extract username from current URL
   */
  extractUsernameFromUrl() {
    const url = window.location.href;
    const match = url.match(/\/inbox\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Fetch conversation data from Fiverr API
   */
  async fetchConversationData(username) {
    try {
      let allMessages = [];
      let lastPage = false;
      let timestamp = null;
      let batchNumber = 1;
      let conversationId = null;

      while (!lastPage && batchNumber <= 10) { // Limit to 10 batches for safety
        const url = timestamp 
          ? `https://www.fiverr.com/inbox/contacts/${username}/conversation?timestamp=${timestamp}`
          : `https://www.fiverr.com/inbox/contacts/${username}/conversation`;

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch conversation: ${response.status}`);
        }

        const data = await response.json();
        
        if (!conversationId) {
          conversationId = data.conversationId;
        }

        // Process messages
        const processedMessages = await Promise.all(data.messages.map(async message => ({
          ...message,
          formattedTime: this.formatDate(message.createdAt),
          attachments: await Promise.all((message.attachments || []).map(async attachment => ({
            filename: attachment.file_name,
            downloadUrl: attachment.download_url,
            fileSize: attachment.file_size,
            contentType: attachment.content_type,
            created_at: attachment.created_at || message.createdAt,
            formattedTime: this.formatDate(attachment.created_at || message.createdAt)
          }))),
          repliedToMessage: message.repliedToMessage ? {
            ...message.repliedToMessage,
            formattedTime: this.formatDate(message.repliedToMessage.createdAt)
          } : null
        })));

        allMessages = [...allMessages, ...processedMessages];
        lastPage = data.lastPage;

        if (!lastPage && processedMessages.length > 0) {
          timestamp = Math.min(...processedMessages.map(m => m.createdAt));
        }

        batchNumber++;
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return {
        conversationId,
        username,
        messages: allMessages.sort((a, b) => a.createdAt - b.createdAt),
        extractedAt: Date.now()
      };
    } catch (error) {
      console.error('Failed to fetch conversation data:', error);
      throw error;
    }
  }

  /**
   * Extract visible messages from DOM
   */
  extractVisibleMessages() {
    const messages = [];
    
    const messageSelectors = [
      '[data-testid*="message"]',
      '.message-bubble',
      '.chat-message',
      '.conversation-message'
    ];

    messageSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const messageData = this.parseMessageElement(element);
        if (messageData) {
          messages.push(messageData);
        }
      });
    });

    return messages;
  }

  /**
   * Parse individual message element
   */
  parseMessageElement(element) {
    try {
      const textContent = element.textContent?.trim();
      if (!textContent) return null;

      // Try to determine sender
      const isOutgoing = element.closest('[data-testid*="outgoing"]') || 
                        element.classList.contains('outgoing') ||
                        element.classList.contains('sent');

      // Extract timestamp if available
      const timeElement = element.querySelector('[data-testid*="time"], .timestamp, .message-time');
      const timestamp = timeElement ? timeElement.textContent.trim() : null;

      return {
        content: textContent,
        isOutgoing,
        timestamp,
        element,
        extractedAt: Date.now()
      };
    } catch (error) {
      console.error('Failed to parse message element:', error);
      return null;
    }
  }

  /**
   * Extract brief/project details
   */
  extractBriefDetails() {
    if (!isFiverrBriefPage()) return null;

    try {
      const briefData = {
        title: this.extractBriefTitle(),
        description: this.extractBriefDescription(),
        requirements: this.extractBriefRequirements(),
        budget: this.extractBriefBudget(),
        deadline: this.extractBriefDeadline(),
        skills: this.extractBriefSkills(),
        extractedAt: Date.now()
      };

      return briefData;
    } catch (error) {
      console.error('Failed to extract brief details:', error);
      return null;
    }
  }

  /**
   * Extract brief title
   */
  extractBriefTitle() {
    const selectors = [
      '[data-testid*="title"]',
      '.brief-title',
      '.project-title',
      'h1',
      'h2'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return null;
  }

  /**
   * Extract brief description
   */
  extractBriefDescription() {
    const selectors = [
      '[data-testid*="description"]',
      '.brief-description',
      '.project-description',
      '.brief-content'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return null;
  }

  /**
   * Extract brief requirements
   */
  extractBriefRequirements() {
    const selectors = [
      '[data-testid*="requirements"]',
      '.brief-requirements',
      '.project-requirements'
    ];

    const requirements = [];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const text = element.textContent.trim();
        if (text && !requirements.includes(text)) {
          requirements.push(text);
        }
      });
    });

    return requirements;
  }

  /**
   * Extract brief budget
   */
  extractBriefBudget() {
    const selectors = [
      '[data-testid*="budget"]',
      '.brief-budget',
      '.project-budget'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        const budgetMatch = text.match(/\$[\d,]+/);
        if (budgetMatch) {
          return budgetMatch[0];
        }
      }
    }

    return null;
  }

  /**
   * Extract brief deadline
   */
  extractBriefDeadline() {
    const selectors = [
      '[data-testid*="deadline"]',
      '.brief-deadline',
      '.project-deadline'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return null;
  }

  /**
   * Extract brief skills
   */
  extractBriefSkills() {
    const selectors = [
      '[data-testid*="skills"]',
      '.brief-skills',
      '.project-skills',
      '.skill-tag'
    ];

    const skills = [];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const text = element.textContent.trim();
        if (text && !skills.includes(text)) {
          skills.push(text);
        }
      });
    });

    return skills;
  }

  /**
   * Format date for display
   */
  formatDate(timestamp) {
    try {
      const date = new Date(parseInt(timestamp));
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const time = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true 
      });
      
      return `${day}/${month}/${year}, ${time}`;
    } catch (error) {
      return 'Unknown time';
    }
  }

  /**
   * Convert conversation to context string
   */
  conversationToContext(conversationData) {
    if (!conversationData || !conversationData.messages) {
      return '';
    }

    let context = `Conversation with ${conversationData.username}:\n\n`;
    
    conversationData.messages.forEach(message => {
      const sender = message.sender || 'Unknown';
      const time = message.formattedTime || 'Unknown time';
      
      context += `${sender} (${time}):\n${message.body}\n\n`;
      
      if (message.attachments && message.attachments.length > 0) {
        context += 'Attachments:\n';
        message.attachments.forEach(attachment => {
          context += `- ${attachment.filename}\n`;
        });
        context += '\n';
      }
    });

    return context;
  }

  /**
   * Get conversation summary for AI context
   */
  getConversationSummary(conversationData, maxLength = 2000) {
    const fullContext = this.conversationToContext(conversationData);
    
    if (fullContext.length <= maxLength) {
      return fullContext;
    }

    // Take the most recent messages that fit within the limit
    let summary = `Conversation with ${conversationData.username} (recent messages):\n\n`;
    let currentLength = summary.length;
    
    for (let i = conversationData.messages.length - 1; i >= 0; i--) {
      const message = conversationData.messages[i];
      const messageText = `${message.sender}: ${message.body}\n\n`;
      
      if (currentLength + messageText.length > maxLength) {
        break;
      }
      
      summary = summary + messageText;
      currentLength += messageText.length;
    }

    return summary;
  }

  /**
   * Clear conversation cache
   */
  clearCache() {
    this.conversationCache.clear();
  }
}

// Create global extractor instance
window.fiverrExtractor = new FiverrExtractor();
