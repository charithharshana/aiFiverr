## **Technical Documentation: AI-Powered Fiverr Assistant Chrome Extension**

### **1. Project Overview**

This document outlines the requirements for a Chrome browser extension designed to integrate with the Fiverr platform. The extension will leverage a Large Language Model (LLM) via the Google Gemini API to provide intelligent text-processing capabilities directly within the Fiverr user interface. The primary goal is to streamline communication and proposal creation for freelancers.

### **2. Core Features Breakdown**

The extension's functionality is divided into three main areas:
1.  **In-Chat AI Tools:** Enhancements directly within the Fiverr message stream.
2.  **Reply Box AI Assistant:** Tools for composing and refining outgoing messages.
3.  **Briefs & Proposal Automation:** Tools for quickly creating proposals for project briefs.
4.  **Configuration Popup:** A comprehensive settings panel for the user.

---

### **3. Detailed Functional Specification**

#### **Feature 1: In-Chat AI Tools (Message Analysis)**

*   **UI Alignment:**
    *   For every individual message bubble in a Fiverr conversation, an **AI icon button** will be dynamically injected.
    *   When an AI-generated response replaces the original message, a **toggle mechanism** (e.g., two tabs labeled "Original" and "AI") will appear within that same message bubble.

*   **Workflow and Logic:**
    1.  **Button Injection:** The extension's content script will monitor the chat DOM. As new messages appear, it will append the AI icon to each message container.
    2.  **User Action:** The user clicks the AI icon on a specific message.
    3.  **AI Processing:**
        *   The text content of that specific message is extracted.
        *   This text is sent to the LLM via the configured API, along with a user-defined prompt (e.g., "Summarize this message," "Translate to Spanish"). The prompt can be selected from a predefined list.
    4.  **Displaying Results:**
        *   The LLM's response (e.g., the summary) replaces the original text inside the message bubble.
        *   The "Original" / "AI" toggle is displayed. Clicking "Original" reveals the initial message text, and clicking "AI" shows the processed text again. This allows for easy comparison without losing the original context.

#### **Feature 2: Reply Box AI Assistant**

*   **UI Alignment:**
    *   An **AI icon button** will be injected within or adjacent to the main "Type a message..." text area at the bottom of the conversation.

*   **Workflow and Logic (Two distinct functions):**

    **A) Generate a Complete Reply from Conversation History:**
    1.  **User Action:** The user clicks the AI icon in the reply box *without selecting any text*.
    2.  **Context Scraping:** The extension's content script scans the entire visible conversation history, extracting all messages from both the user and the client.
    3.  **AI Processing:** The entire scraped conversation is sent to the LLM with a specific prompt like: "Based on the following conversation history, draft a suitable and professional reply."
    4.  **Output:** The generated reply from the LLM is automatically populated into the "Type a message..." text area, ready for the user to review, edit, and send.

    **B) Refine User-Typed Text:**
    1.  **User Action:** The user types a message into the text area, **selects a portion or all of the text**, and then clicks the AI icon.
    2.  **AI Processing:** Only the selected text is sent to the LLM, along with a custom prompt (e.g., "Make this sound more professional," "Fix grammar and spelling").
    3.  **Output:** The LLM's refined response replaces the originally selected text within the text area.

#### **Feature 3: Briefs & Proposal Automation**

*   **UI Alignment (Multi-page process):**
    *   **On the Fiverr Briefs Page:** A prominent **"Copy Brief" button** is added to the brief overview panel.
    *   **On the "Create an offer" Page:** A **"Generate AI Proposal" button** is injected into the "Self Introduction" text box.

*   **Workflow and Logic:**
    1.  **Step 1 (Copying Context):** On the brief page, the user clicks the "Copy Brief" button. The extension scrapes all the project details (description, scope, goals, etc.) and copies this information to the system clipboard.
    2.  **Step 2 (Navigating):** The user clicks Fiverr's native "Create Offer" button.
    3.  **Step 3 (Generating Proposal):** On the "Create an offer" page, the user clicks the injected "Generate AI Proposal" button.
    4.  **AI Processing:** The extension retrieves the project details from the clipboard and sends them to the LLM with a dedicated prompt like: "Write a compelling and professional project proposal based on the following client brief. Introduce myself and express my suitability for the job."
    5.  **Output:** The complete, AI-generated proposal is automatically filled into the "Self Introduction" text box. The user's only remaining task is to click "Next: Add your offer."

#### **Feature 4: Configuration Popup (Extension Settings)**

*   **UI Alignment:**
    *   Accessible by clicking the extension icon in the Chrome toolbar. The UI is organized into tabs: `General`, `Modes`, `Custom`, `Stats`, `Help`, and `Advanced`.

*   **Tab-by-Tab Functionality:**

    *   **Advanced Tab (API & Model Configuration):**
        *   **API Configuration:** A field for the user to input their **Gemini API Key**.
        *   **AI Model Selection:** A dropdown to choose the active AI model (e.g., Gemini 2.5 Flash).
        *   **Max Text Length:** An input to set the maximum token limit for responses.
        *   **API Keys Management (as seen in the second settings example):** A larger text area to input **multiple Gemini API keys**. The system must automatically rotate through these keys for consecutive requests to avoid hitting rate limits on a single key.
        *   **Custom Model Management:** An input field to add custom model IDs (e.g., `gemini-1.5-pro`) and a list of currently managed models with options to edit or remove them.

    *   **Modes & Custom Tabs (Prompt Management):**
        *   **Modes:** A screen showing a list of pre-built prompts ("Humanize," "Fix Grammar," "Professional Tone," etc.). The user can enable or disable these using checkboxes. These enabled modes will appear in the context menus in the Fiverr inbox.
        *   **Custom Rewrite Modes:** A dedicated section for users to create their own prompts. It requires:
            *   **Mode Name:** A user-friendly name for the prompt.
            *   **Prompt Instructions:** The actual prompt text to be sent to the LLM.

    *   **Stats Tab (Usage Analytics):**
        *   Displays key usage metrics: "Total Rewrites," "Characters Processed," "Most Used Mode," and "Last Used."
        *   Includes a "Refresh" button and a "Clear Stats" button.

    *   **Help Tab (Documentation):**
        *   Provides "Getting Started" instructions, a list of keyboard shortcuts, and explanations of the different AI models.

---
This document provides a complete technical and functional specification based on your video demonstration, ready to be used as a detailed prompt for the development of the extension.