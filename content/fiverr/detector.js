/**
 * Fiverr DOM Detector
 * Detects and monitors Fiverr page elements for AI integration
 */

class FiverrDetector {
  constructor() {
    this.observers = new Map();
    this.detectedElements = new Map();
    this.pageType = this.detectPageType();
    this.init();
  }

  init() {
    // Start monitoring for dynamic content
    this.startObserving();
    
    // Initial detection
    this.detectAllElements();
    
    // Re-detect on navigation
    this.monitorNavigation();
  }

  /**
   * Detect current Fiverr page type
   */
  detectPageType() {
    const url = window.location.href;
    
    if (url.includes('/inbox/')) {
      return 'conversation';
    } else if (url.includes('/briefs/')) {
      return 'brief';
    } else if (url.includes('/create_offer') || url.includes('/proposals/')) {
      return 'proposal';
    } else if (url.includes('/gigs/')) {
      return 'gig';
    } else {
      return 'other';
    }
  }

  /**
   * Start observing DOM changes
   */
  startObserving() {
    const observer = new MutationObserver((mutations) => {
      let shouldRedetect = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain relevant elements
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (this.isRelevantElement(node)) {
                shouldRedetect = true;
              }
            }
          });
        }
      });
      
      if (shouldRedetect) {
        // Debounce re-detection
        clearTimeout(this.redetectTimeout);
        this.redetectTimeout = setTimeout(() => {
          this.detectAllElements();
        }, 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.set('main', observer);
  }

  /**
   * Check if element is relevant for AI integration
   */
  isRelevantElement(element) {
    const relevantSelectors = [
      // Chat elements
      '[data-testid*="chat"]',
      '[data-testid*="message"]',
      '.chat-input',
      '.message-input',
      '.conversation-input',
      
      // Proposal elements
      '[data-testid*="proposal"]',
      '[data-testid*="offer"]',
      '.proposal-input',
      '.offer-description',
      
      // Brief elements
      '[data-testid*="brief"]',
      '.brief-description',
      
      // General input elements
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]'
    ];

    return relevantSelectors.some(selector => {
      try {
        return element.matches(selector) || element.querySelector(selector);
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Detect all relevant elements on the page
   */
  detectAllElements() {
    this.detectChatElements();
    this.detectProposalElements();
    this.detectBriefElements();
    this.detectInputElements();
    
    // Notify about detected elements
    this.notifyDetection();
  }

  /**
   * Detect chat-related elements
   */
  detectChatElements() {
    const chatSelectors = [
      // Message containers
      '[data-testid*="message"]',
      '.message-bubble',
      '.chat-message',
      '.conversation-message',
      
      // Input areas
      '[data-testid="chat-input"]',
      '[data-testid*="message-input"]',
      '.chat-input',
      '.message-input',
      '.conversation-input',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="reply"]',
      
      // Send buttons
      '[data-testid*="send"]',
      'button[type="submit"]',
      '.send-button',
      '.message-send'
    ];

    const elements = this.findElements(chatSelectors);
    this.detectedElements.set('chat', elements);
    
    return elements;
  }

  /**
   * Detect proposal-related elements
   */
  detectProposalElements() {
    const proposalSelectors = [
      // Proposal inputs
      '[data-testid*="proposal"]',
      '[data-testid*="offer"]',
      '.proposal-input',
      '.offer-description',
      'textarea[placeholder*="proposal"]',
      'textarea[placeholder*="offer"]',
      'textarea[placeholder*="describe"]',
      
      // Brief copy buttons
      '.brief-copy',
      '[data-testid*="copy"]',
      'button[title*="copy"]'
    ];

    const elements = this.findElements(proposalSelectors);
    this.detectedElements.set('proposal', elements);
    
    return elements;
  }

  /**
   * Detect brief-related elements
   */
  detectBriefElements() {
    const briefSelectors = [
      // Brief content
      '[data-testid*="brief"]',
      '.brief-description',
      '.brief-content',
      '.project-description',
      
      // Brief details
      '.brief-details',
      '.project-details',
      '.brief-requirements'
    ];

    const elements = this.findElements(briefSelectors);
    this.detectedElements.set('brief', elements);
    
    return elements;
  }

  /**
   * Detect general input elements
   */
  detectInputElements() {
    const inputSelectors = [
      'textarea:not([data-aifiverr-processed])',
      'input[type="text"]:not([data-aifiverr-processed])',
      '[contenteditable="true"]:not([data-aifiverr-processed])'
    ];

    const elements = this.findElements(inputSelectors);
    
    // Filter out elements that are too small or hidden
    const validElements = elements.filter(el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      
      return rect.width > 50 && 
             rect.height > 20 && 
             style.display !== 'none' && 
             style.visibility !== 'hidden';
    });

    this.detectedElements.set('inputs', validElements);
    
    return validElements;
  }

  /**
   * Find elements using multiple selectors
   */
  findElements(selectors) {
    const elements = [];
    
    selectors.forEach(selector => {
      try {
        const found = document.querySelectorAll(selector);
        elements.push(...Array.from(found));
      } catch (e) {
        console.warn('Invalid selector:', selector, e);
      }
    });

    // Remove duplicates
    return [...new Set(elements)];
  }

  /**
   * Get detected elements by type
   */
  getElements(type) {
    return this.detectedElements.get(type) || [];
  }

  /**
   * Get all detected elements
   */
  getAllElements() {
    const all = {};
    this.detectedElements.forEach((elements, type) => {
      all[type] = elements;
    });
    return all;
  }

  /**
   * Check if element is a Fiverr chat input
   */
  isChatInput(element) {
    if (!element) return false;
    
    const chatInputSelectors = [
      '[data-testid="chat-input"]',
      '[data-testid*="message-input"]',
      '.chat-input',
      '.message-input',
      '.conversation-input'
    ];

    return chatInputSelectors.some(selector => {
      try {
        return element.matches(selector);
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Check if element is a proposal input
   */
  isProposalInput(element) {
    if (!element) return false;
    
    const proposalInputSelectors = [
      '[data-testid*="proposal"]',
      '[data-testid*="offer"]',
      '.proposal-input',
      '.offer-description'
    ];

    return proposalInputSelectors.some(selector => {
      try {
        return element.matches(selector);
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Monitor navigation changes
   */
  monitorNavigation() {
    let currentUrl = window.location.href;
    
    const checkNavigation = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.pageType = this.detectPageType();
        
        // Re-detect elements after navigation
        setTimeout(() => {
          this.detectAllElements();
        }, 1000);
      }
    };

    // Check for navigation changes
    setInterval(checkNavigation, 1000);
    
    // Listen for popstate events
    window.addEventListener('popstate', () => {
      setTimeout(checkNavigation, 100);
    });
  }

  /**
   * Notify about detected elements
   */
  notifyDetection() {
    const elementCounts = {};
    this.detectedElements.forEach((elements, type) => {
      elementCounts[type] = elements.length;
    });

    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'ELEMENTS_DETECTED',
      pageType: this.pageType,
      elementCounts,
      url: window.location.href
    });

    // Dispatch custom event for other scripts
    window.dispatchEvent(new CustomEvent('aifiverr:elementsDetected', {
      detail: {
        pageType: this.pageType,
        elements: this.getAllElements()
      }
    }));
  }

  /**
   * Mark element as processed
   */
  markAsProcessed(element) {
    if (element) {
      element.setAttribute('data-aifiverr-processed', 'true');
    }
  }

  /**
   * Check if element is already processed
   */
  isProcessed(element) {
    return element && element.hasAttribute('data-aifiverr-processed');
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
    this.detectedElements.clear();
  }
}

// Create global detector instance
window.fiverrDetector = new FiverrDetector();
