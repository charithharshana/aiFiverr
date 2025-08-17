// Keep track of active tabs with content scripts
let activeTabsWithContentScript = new Set();

// Track ongoing processes
let ongoingProcesses = {
    contacts: new Map(),  // tabId -> status
    conversations: new Map()  // tabId -> status
};

// Listen for navigation to Fiverr pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('fiverr.com')) {
    // Inject content script
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).then(() => {
      activeTabsWithContentScript.add(tabId);
    }).catch(err => console.error('Failed to inject content script:', err));
  }
});

// Remove tab from tracking when closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabsWithContentScript.delete(tabId);
  ongoingProcesses.contacts.delete(tabId);
  ongoingProcesses.conversations.delete(tabId);
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : (request.tabId || null);

  if (request.type === 'INIT_POPUP') {
    // Inject content script when popup is opened
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (tab.url.includes('fiverr.com')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
        } catch (error) {
          console.error('Failed to inject content script:', error);
        }
      }
    });
  }

  // Track process status updates
  else if (request.type === 'CONTACTS_PROGRESS' || request.type === 'EXTRACTION_PROGRESS') {
    if (tabId) {
      const processType = request.type === 'CONTACTS_PROGRESS' ? 'contacts' : 'conversations';
      ongoingProcesses[processType].set(tabId, {
        status: 'running',
        progress: request.message,
        timestamp: Date.now()
      });
    }
  }
  // Handle process completion
  else if (request.type === 'CONTACTS_FETCHED' || request.type === 'CONVERSATION_EXTRACTED') {
    if (tabId) {
      const processType = request.type === 'CONTACTS_FETCHED' ? 'contacts' : 'conversations';
      ongoingProcesses[processType].set(tabId, {
        status: 'completed',
        message: request.message,
        timestamp: Date.now()
      });
    }
  }
  // Handle errors
  else if (request.type === 'EXTRACTION_ERROR') {
    if (tabId) {
      ongoingProcesses.conversations.set(tabId, {
        status: 'error',
        error: request.error,
        timestamp: Date.now()
      });
    }
  }
  // Handle popup requesting status
  else if (request.type === 'GET_PROCESS_STATUS') {
    if (tabId) {
      const status = {
        contacts: ongoingProcesses.contacts.get(tabId),
        conversations: ongoingProcesses.conversations.get(tabId)
      };
      sendResponse(status);
      return true; // Keep message channel open for async response
    }
  }
  // Forward process requests to content script
  else if (['EXTRACT_CONVERSATION', 'FETCH_ALL_CONTACTS'].includes(request.type)) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.url.includes('fiverr.com')) {
        // Initialize process tracking
        const processType = request.type === 'FETCH_ALL_CONTACTS' ? 'contacts' : 'conversations';
        ongoingProcesses[processType].set(tab.id, {
          status: 'starting',
          timestamp: Date.now()
        });
        
        chrome.tabs.sendMessage(tab.id, { ...request, tabId: tab.id });
      }
    });
  }
  // Forward other messages to content script
  else if (['EXTRACT_CONVERSATION', 'FETCH_ALL_CONTACTS'].includes(request.type)) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.url.includes('fiverr.com')) {
        chrome.tabs.sendMessage(tab.id, request);
      }
    });
  }
});
