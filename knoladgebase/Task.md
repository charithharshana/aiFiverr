## **Technical Documentation & Project Requirements: AI-Powered Fiverr Assistant Chrome Extension**

### **1. Project Overview**

The goal is to develop a Chrome browser extension that integrates with the Fiverr website to enhance user productivity. The extension will leverage the Google Gemini AI API to provide intelligent features directly within the Fiverr messaging inbox and the project brief/proposal creation workflow.

The core functionalities include:
1.  **In-Chat Message Analysis:** Summarize, translate, or rephrase individual messages within a conversation.
2.  **AI-Powered Reply Generation:** Draft context-aware replies based on the entire conversation history or refine user-typed text.
3.  **Automated Proposal Writing:** Generate complete proposals for Fiverr Briefs based on the project description.
4.  **Comprehensive User Configuration:** Allow users to manage their API keys, select AI models, and create their own custom prompts.

### **2. Core Technologies**

*   **Language:** JavaScript (ES6+), HTML5, CSS3
*   **Frameworks:** None required, but a simple framework like Preact or a utility library could be used for the popup UI if desired.
*   **Browser API:** Chrome Extension APIs (`chrome.storage`, `chrome.runtime`, `chrome.tabs`)
*   **External API:** Google Gemini API

### **3. Extension Architecture & File Structure**

The extension will be composed of three main parts: content scripts for interacting with the Fiverr pages, a background service worker for handling logic and API calls, and a popup for user settings.

```
/extension
|-- manifest.json
|-- /icons
|   |-- icon16.png
|   |-- icon48.png
|   |-- icon128.png
|-- /popup
|   |-- popup.html
|   |-- popup.js
|   |-- popup.css
|-- /scripts
|   |-- background.js         # Service Worker
|   |-- content_inbox.js      # For Fiverr Inbox page
|   |-- content_briefs.js     # For Fiverr Briefs page
|-- /assets
|   |-- loader.gif            # Loading indicator
|   |-- ai_icon.svg           # Icon for injected buttons
```

### **4. Manifest V3 (`manifest.json`)**

```json
{
  "manifest_version": 3,
  "name": "AI-Powered Fiverr Assistant",
  "version": "1.0",
  "description": "Enhances Fiverr messaging and proposal writing with Gemini AI.",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://*.fiverr.com/*"
  ],
  "background": {
    "service_worker": "scripts/background.js"
  },
  "content_scripts": [
    {
      "matches": ["*://www.fiverr.com/inbox/*", "*://www.fiverr.com/users/*/requests/*"],
      "js": ["scripts/content_inbox.js"],
      "css": ["css/injected_styles.css"]
    },
    {
      "matches": ["*://www.fiverr.com/briefs/overview/*", "*://www.fiverr.com/brief/response/*"],
      "js": ["scripts/content_briefs.js"],
      "css": ["css/injected_styles.css"]
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  },
  "icons": {
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["assets/*"],
      "matches": ["*://*.fiverr.com/*"]
    }
  ]
}
```

---

### **5. Detailed Feature Implementation**

#### **5.1. Feature: In-Chat Message Analysis & Transformation**

*   **Objective:** Inject a button on each received message that allows the user to process its content using a selected AI prompt.
*   **Target Page:** Fiverr Inbox (`*://www.fiverr.com/inbox/*`)
*   **DOM Injection (`content_inbox.js`):**
    1.  Use a `MutationObserver` to detect when new messages are loaded into the chat view.
    2.  For each message container (e.g., `div.message-bubble`), inject a small AI icon button next to or on the bubble.
    3.  When this AI icon is clicked, a context menu or dropdown should appear with a list of available custom prompts (e.g., "Summarize," "Translate," "Fix Grammar").
*   **Data Flow:**
    1.  When a prompt is selected from the menu, the script extracts the text content from the associated message bubble.
    2.  It sends a message to `background.js` containing: `{ action: "processMessage", text: "...", prompt: "..." }`.
    3.  The `background.js` script calls the Gemini API with the text and prompt.
    4.  Upon receiving the AI response, `background.js` sends it back to `content_inbox.js`.
*   **UI Update (`content_inbox.js`):**
    1.  The original message text within the bubble is replaced by the AI-generated response.
    2.  A toggle element (e.g., two small tabs labeled "Original" and "AI") must be created within the message bubble.
    3.  The user can click these tabs to switch between viewing the original text and the new AI-generated text. The state should be managed locally for that message.

#### **5.2. Feature: AI-Powered Reply Generation & Refinement**

*   **Objective:** Provide AI assistance for composing new messages.
*   **Target Page:** Fiverr Inbox (`*://www.fiverr.com/inbox/*`)
*   **Functionality A: Generate Full Reply**
    1.  **DOM Injection:** Inject an AI icon button inside or next to the main message input text area (`textarea`).
    2.  **Data Flow:**
        *   When clicked, `content_inbox.js` will traverse the DOM to scrape the entire conversation history (sender and message text for all visible messages).
        *   It will send a message to `background.js`: `{ action: "generateReply", history: "..." }`. The prompt for this action should be a specific, predefined "Generate Reply" prompt.
        *   `background.js` makes the API call.
        *   The AI-generated reply is sent back to the content script and is automatically populated into the `textarea`.
*   **Functionality B: Refine Selected Text**
    1.  **Trigger:** User selects text they have typed into the `textarea` and right-clicks.
    2.  **Logic:** The right-click context menu should show the available AI prompts ("Make Professional," "Fix Spelling," etc.).
    3.  **Data Flow:** Similar to 5.1, it sends the selected text and chosen prompt to the background script.
    4.  **UI Update:** The originally selected text in the `textarea` is replaced with the refined text from the AI.

#### **5.3. Feature: Automated Proposal Writing for Briefs**

*   **Objective:** Streamline the proposal writing process for Fiverr Briefs.
*   **Target Page 1:** Brief Overview (`*://www.fiverr.com/briefs/overview/*`)
    1.  **DOM Injection:** Add a "Copy Brief with AI Assistant" button near the top of the brief details.
    2.  **Action:** When clicked, `content_briefs.js` scrapes all relevant text from the brief (title, description, scope, goals, features, etc.), formats it into a clean string, and copies it to the user's clipboard. A visual confirmation ("Copied!") should be shown.
*   **Target Page 2:** Brief Response / Create an Offer (`*://www.fiverr.com/brief/response/*`)
    1.  **DOM Injection:** Add an "Generate Proposal with AI" button within the "Self Introduction" text area.
    2.  **Data Flow:**
        *   When clicked, the script sends a message to `background.js`: `{ action: "generateProposal", briefText: "..." }`. The `briefText` is retrieved from the clipboard.
        *   `background.js` uses a dedicated "Write Proposal" prompt and calls the Gemini API.
        *   The full, AI-generated proposal is returned and populated into the text area.

### **6. Popup Settings UI (`popup.html`, `popup.js`)**

The popup will be a multi-tabbed interface for configuration. Use `chrome.storage.sync` to save settings so they are available across the user's devices.

*   **Tab 1: General/API Configuration**
    *   **Gemini API Keys:** A `textarea` where users can paste multiple API keys (one per line).
    *   **API Key Rotation Logic (`background.js`):** The background script will store these keys in an array. For each API call, it will use the next key in the sequence (round-robin). `key_index = (key_index + 1) % keys.length;`. This distributes requests and avoids rate limits.
    *   **AI Model Selection:** A dropdown menu populated with default Gemini models (e.g., `gemini-1.5-flash-latest`, `gemini-1.5-pro-latest`). The selected value is saved as the default model.
    *   **Add Custom Model:** An input field and "Add" button to allow users to add other model IDs.
*   **Tab 2: Custom Prompts (Rewrite Modes)**
    *   Display a list of predefined prompts (e.g., "Humanize," "Professional Tone") with checkboxes to enable/disable them in the context menus.
    *   A section "Create Your Own Rewrite Mode" with two input fields:
        1.  `Mode Name:` (e.g., "Summarize for Client")
        2.  `Prompt Instructions:` (e.g., `Summarize the following text into three bullet points suitable for a client update: {{text}}`)
    *   An "Add Mode" button saves the new custom prompt to `chrome.storage`.
    *   The list of created custom prompts should be displayed below, with options to edit or delete each one.
*   **Tab 3: Stats**
    *   Display four boxes: "Total Rewrites," "Characters Processed," "Most Used Mode," and "Last Used."
    *   These values will be stored in `chrome.storage.local` and updated by `background.js` after each successful API call.
    *   Include a "Clear Stats" button.

### **7. Security & Best Practices**

*   **API Key Security:** Store API keys in `chrome.storage.local`. Never hardcode them into the extension's source code.
*   **Error Handling:** The background script must handle potential errors from the Gemini API (e.g., 429 Rate Limit Exceeded, 400 Bad Request, 401 Invalid Key) and communicate a user-friendly error message back to the content script to display.
*   **User Feedback:** Always provide visual feedback for actions, such as a loading spinner while waiting for the AI response and success/error notifications.
*   **DOM Element Selection:** Use robust, non-volatile selectors to target elements on Fiverr's pages to minimize breakage when Fiverr updates its website layout. Avoid relying on highly dynamic or generated class names.