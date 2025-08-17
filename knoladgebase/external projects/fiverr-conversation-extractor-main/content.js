// Function to extract username from URL
function extractUsername(url) {
  // Only extract username from specific inbox URL format
  const match = url.match(/^https:\/\/www\.fiverr\.com\/inbox\/([^\/\?]+)$/);
  return match ? match[1] : null;
}

// Helper function to format date according to user preference
async function formatDate(timestamp) {
  const date = new Date(parseInt(timestamp));
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  
  // Get user's preferred format from storage, default to DD/MM/YYYY
  return new Promise((resolve) => {
    chrome.storage.local.get(['dateFormat'], function(result) {
      const format = result.dateFormat || 'DD/MM/YYYY';
      
      let dateStr;
      switch(format) {
        case 'MM/DD/YYYY':
          dateStr = `${month}/${day}/${year}`;
          break;
        case 'YYYY/MM/DD':
          dateStr = `${year}/${month}/${day}`;
          break;
        case 'DD-MM-YYYY':
          dateStr = `${day}-${month}-${year}`;
          break;
        default: // DD/MM/YYYY
          dateStr = `${day}/${month}/${year}`;
      }
      
      resolve(`${dateStr}, ${time}`);
    });
  });
}

// Function to convert conversation to markdown
async function convertToMarkdown(data) {
  // Get the other user's username from the first message
  let otherUsername = '';
  if (data.messages && data.messages.length > 0) {
    const firstMessage = data.messages[0];
    // Get the username that's not the current user
    if (firstMessage.sender === data.username) {
      otherUsername = firstMessage.recipient;
    } else {
      otherUsername = firstMessage.sender;
    }
  }

  let markdown = `# Conversation with ${otherUsername}\n\n`;
  
  // Process messages sequentially to maintain order
  for (const message of data.messages) {
    // Convert Unix timestamp to formatted date using user's preferred format
    const timestamp = await formatDate(message.createdAt);
    const sender = message.sender || 'Unknown';
    
    markdown += `### ${sender} (${timestamp})\n`;
    
    // Show replied-to message if exists
    if (message.repliedToMessage) {
      const repliedMsg = message.repliedToMessage;
      const repliedTime = await formatDate(repliedMsg.createdAt);
      markdown += `> Replying to ${repliedMsg.sender} (${repliedTime}):\n`;
      markdown += `> ${repliedMsg.body.replace(/\n/g, '\n> ')}\n\n`;
    }
    
    // Add message text
    if (message.body) {
      markdown += `${message.body}\n`;
    }
    
    // Add attachments if any
    if (message.attachments && message.attachments.length > 0) {
      markdown += '\n**Attachments:**\n';
      for (const attachment of message.attachments) {
        // Check if attachment has required fields
        if (attachment && typeof attachment === 'object') {
          const fileName = attachment.file_name || attachment.filename || 'Unnamed File';
          const fileSize = attachment.file_size || attachment.fileSize || 0;
          const attachmentTime = attachment.created_at ? ` (uploaded on ${await formatDate(attachment.created_at)})` : '';
          markdown += `- ${fileName} (${formatFileSize(fileSize)})${attachmentTime}\n`;
        } else {
          markdown += `- File attachment (size unknown)\n`;
        }
      }
    }
    
    markdown += '\n---\n\n';
  }
  
  return markdown;
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return 'size unknown';
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Function to fetch all contacts recursively
async function fetchAllContacts() {
  let allContacts = [];
  let oldestTimestamp = null;
  let batchNumber = 1;
  
  // Clear existing contacts at the start of fetch
  chrome.storage.local.set({ 
    allContacts: [],
    lastContactsFetch: Date.now()
  });
  
  async function fetchContactsBatch(olderThan = null) {
    try {
      const url = olderThan 
        ? `https://www.fiverr.com/inbox/contacts?older_than=${olderThan}`
        : 'https://www.fiverr.com/inbox/contacts';
      
      console.log(`Fetching batch ${batchNumber}...`);
      chrome.runtime.sendMessage({
        type: 'CONTACTS_PROGRESS',
        message: `Fetching batch ${batchNumber}...`
      });

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.status} ${response.statusText}`);
      }

      const contacts = await response.json();
      
      if (!contacts || contacts.length === 0) {
        console.log('No more contacts found.');
        chrome.runtime.sendMessage({
          type: 'CONTACTS_PROGRESS',
          message: 'No more contacts found.'
        });
        return null;
      }
      
      // Add contacts to our collection
      allContacts = [...allContacts, ...contacts];
      
      // Update storage with current total
      chrome.storage.local.set({ 
        allContacts: allContacts,
        lastContactsFetch: Date.now()
      });
      
      // Find the oldest timestamp
      const timestamps = contacts.map(c => c.recentMessageDate);
      oldestTimestamp = Math.min(...timestamps);
      
      console.log(`Batch ${batchNumber}: Found ${contacts.length} contacts (Total: ${allContacts.length})`);
      chrome.runtime.sendMessage({
        type: 'CONTACTS_PROGRESS',
        message: `Batch ${batchNumber}: Found ${contacts.length} contacts (Total: ${allContacts.length})`,
        totalContacts: allContacts.length
      });

      batchNumber++;
      return oldestTimestamp;
    } catch (error) {
      console.error('Error fetching contacts:', error);
      chrome.runtime.sendMessage({
        type: 'CONTACTS_PROGRESS',
        message: `Error in batch ${batchNumber}: ${error.message}`,
        isError: true
      });
      return null;
    }
  }
  
  // First batch
  let nextTimestamp = await fetchContactsBatch();
  
  // Keep fetching while we have older messages
  while (nextTimestamp) {
    // Add a small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
    nextTimestamp = await fetchContactsBatch(nextTimestamp);
  }

  // Send final results
  chrome.runtime.sendMessage({
    type: 'CONTACTS_FETCHED',
    data: allContacts,
    message: `Completed! Total contacts found: ${allContacts.length}`
  });
  
  return allContacts;
}

// Function to fetch conversation data with pagination
async function fetchConversation(username) {
  try {
    let allMessages = [];
    let lastPage = false;
    let timestamp = null;
    let batchNumber = 1;
    let conversationId = null;

    while (!lastPage) {
      // Notify about batch progress
      chrome.runtime.sendMessage({
        type: 'EXTRACTION_PROGRESS',
        message: `Fetching message batch ${batchNumber}...`
      });

      // Build URL with timestamp if not first batch
      const url = timestamp 
        ? `https://www.fiverr.com/inbox/contacts/${username}/conversation?timestamp=${timestamp}`
        : `https://www.fiverr.com/inbox/contacts/${username}/conversation`;

      const conversationResponse = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!conversationResponse.ok) {
        throw new Error(`Failed to fetch conversation: ${conversationResponse.status} ${conversationResponse.statusText}`);
      }

      const data = await conversationResponse.json();
      
      // Store conversation ID from first batch
      if (!conversationId) {
        conversationId = data.conversationId;
      }

      // Process messages in this batch
      const processedMessages = await Promise.all(data.messages.map(async message => ({
        ...message,
        formattedTime: await formatDate(message.createdAt),
        attachments: await Promise.all((message.attachments || []).map(async attachment => ({
          filename: attachment.file_name,
          downloadUrl: attachment.download_url,
          fileSize: attachment.file_size,
          contentType: attachment.content_type,
          created_at: attachment.created_at || message.createdAt,
          formattedTime: await formatDate(attachment.created_at || message.createdAt)
        }))),
        repliedToMessage: message.repliedToMessage ? {
          ...message.repliedToMessage,
          formattedTime: await formatDate(message.repliedToMessage.createdAt)
        } : null
      })));

      // Add messages to our collection
      allMessages = [...allMessages, ...processedMessages];

      // Update lastPage status
      lastPage = data.lastPage;

      // If not last page, get timestamp for next batch
      if (!lastPage && processedMessages.length > 0) {
        // Use the oldest message's timestamp for next batch
        timestamp = Math.min(...processedMessages.map(m => m.createdAt));
      }

      // Increment batch number
      batchNumber++;

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Create final processed data
    const processedData = {
      conversationId: conversationId,
      messages: allMessages.sort((a, b) => a.createdAt - b.createdAt)
    };

    // Generate markdown with the current date format
    const markdown = await convertToMarkdown(processedData);

    // Store the complete conversation data
    chrome.storage.local.set({ 
      conversationData: processedData,
      markdownContent: markdown,
      jsonContent: processedData
    });

    // Notify popup about completion with username
    chrome.runtime.sendMessage({
      type: 'CONVERSATION_EXTRACTED',
      data: processedData,
      message: `Conversation with ${username} extracted successfully!`
    });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    chrome.runtime.sendMessage({
      type: 'EXTRACTION_ERROR',
      error: error.message
    });
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_CONVERSATION') {
    // Get username from storage instead of URL
    chrome.storage.local.get(['currentUsername'], function(result) {
      if (result.currentUsername) {
        fetchConversation(result.currentUsername);
      } else {
        chrome.runtime.sendMessage({
          type: 'EXTRACTION_ERROR',
          error: 'No username found for conversation extraction.'
        });
      }
    });
  } else if (request.type === 'FETCH_ALL_CONTACTS') {
    fetchAllContacts();
  }
});
