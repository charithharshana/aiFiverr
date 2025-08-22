/**
 * Knowledge Base Manager
 * Handles custom prompts, variables, and reusable content for AI interactions
 */

class KnowledgeBaseManager {
  constructor() {
    this.variables = new Map();
    this.customPrompts = new Map();
    this.templates = new Map();
    this.files = new Map(); // Store file references
    this.fileCache = new Map(); // Cache file data
    this.init();
  }

  async init() {
    await this.loadKnowledgeBase();
    await this.loadCustomPrompts();
    await this.loadTemplates();
    await this.loadKnowledgeBaseFiles();

    // Sync with Gemini Files API in background to avoid blocking initialization
    this.syncWithGeminiFilesInBackground();
  }

  /**
   * Sync with Gemini Files API in background without blocking initialization
   */
  syncWithGeminiFilesInBackground() {
    setTimeout(async () => {
      try {
        await this.syncWithGeminiFiles();
        console.log('aiFiverr KB: Background sync with Gemini Files completed');
      } catch (error) {
        console.warn('aiFiverr KB: Background sync with Gemini Files failed:', error);
      }
    }, 2000); // Wait 2 seconds after initialization
  }

  /**
   * Load knowledge base variables from storage
   */
  async loadKnowledgeBase() {
    try {
      if (!window.storageManager) {
        console.warn('aiFiverr KB: Storage manager not available, skipping knowledge base load');
        return;
      }

      const data = await window.storageManager.getKnowledgeBase();
      this.variables.clear();

      Object.entries(data).forEach(([key, value]) => {
        this.variables.set(key, value);
      });
    } catch (error) {
      console.error('Failed to load knowledge base:', error);
    }
  }

  /**
   * Load custom prompts from storage
   */
  async loadCustomPrompts() {
    try {
      if (!window.storageManager) {
        console.warn('aiFiverr KB: Storage manager not available, skipping custom prompts load');
        return;
      }

      const result = await window.storageManager.get('customPrompts');
      const prompts = result.customPrompts || {};

      this.customPrompts.clear();
      Object.entries(prompts).forEach(([key, prompt]) => {
        this.customPrompts.set(key, prompt);
      });

      // Don't automatically add default prompts as custom prompts
      // Users should explicitly save default prompts as custom if they want to edit them
    } catch (error) {
      console.error('Failed to load custom prompts:', error);
    }
  }

  /**
   * Load templates from storage
   */
  async loadTemplates() {
    try {
      if (!window.storageManager) {
        console.warn('aiFiverr KB: Storage manager not available, skipping templates load');
        return;
      }

      const result = await window.storageManager.get('templates');
      const templates = result.templates || {};

      this.templates.clear();
      Object.entries(templates).forEach(([key, template]) => {
        this.templates.set(key, template);
      });

      // Add default templates if none exist
      if (this.templates.size === 0) {
        this.addDefaultTemplates();
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  /**
   * Add default prompts (deprecated - now handled by prompt manager)
   */
  addDefaultPrompts() {
    // This method is deprecated - default prompts are now managed by the centralized prompt manager
    // Only add if prompt manager is not available (fallback)
    if (window.promptManager && window.promptManager.initialized) {
      console.log('aiFiverr KB: Skipping default prompts - using centralized prompt manager');
      return;
    }

    console.warn('aiFiverr KB: Prompt manager not available, using fallback default prompts');
    // Minimal fallback - the prompt manager should handle this
  }

  /**
   * Add default templates
   */
  addDefaultTemplates() {
    const defaultTemplates = {
      'project_kickoff': {
        name: 'Project Kickoff',
        description: 'Template for starting new projects',
        content: `Hi {{client_name}},

Thank you for choosing my services! I'm excited to work on your {{project_type}} project.

To get started, I'll need:
- {{requirements}}

Timeline:
- {{timeline}}

I'll keep you updated throughout the process and deliver high-quality work that exceeds your expectations.

Best regards,
{{my_name}}`
      },
      'revision_request': {
        name: 'Revision Request',
        description: 'Template for requesting revisions',
        content: `Hi {{client_name}},

Thank you for your feedback on the {{deliverable}}. I appreciate you taking the time to review it.

I understand you'd like the following changes:
- {{revision_points}}

I'll implement these revisions and have the updated version ready by {{revision_deadline}}.

If you have any additional feedback or questions, please let me know.

Best regards,
{{my_name}}`
      },
      'project_completion': {
        name: 'Project Completion',
        description: 'Template for project delivery',
        content: `Hi {{client_name}},

I'm pleased to deliver your completed {{project_type}} project!

Deliverables included:
- {{deliverables}}

Everything has been thoroughly tested and is ready for use. Please review and let me know if you need any adjustments.

I'd be grateful if you could leave a review of our collaboration. I'm also available for any future projects you might have.

Thank you for your business!

Best regards,
{{my_name}}`
      }
    };

    Object.entries(defaultTemplates).forEach(([key, template]) => {
      this.templates.set(key, template);
    });

    this.saveTemplates();
  }

  /**
   * Add or update knowledge base variable
   */
  async addVariable(key, value) {
    this.variables.set(key, value);
    await this.saveKnowledgeBase();
  }

  /**
   * Remove knowledge base variable
   */
  async removeVariable(key) {
    this.variables.delete(key);
    await this.saveKnowledgeBase();
  }

  /**
   * Get knowledge base variable
   */
  getVariable(key) {
    return this.variables.get(key) || '';
  }

  /**
   * Get all variables as object
   */
  getAllVariables() {
    return Object.fromEntries(this.variables);
  }

  /**
   * Replace variables in text
   */
  replaceVariables(text) {
    let result = text;

    this.variables.forEach((value, key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }

  /**
   * Replace file references in text
   */
  replaceFileReferences(text) {
    let processedText = text;

    // Replace file references with file information
    this.files.forEach((fileData, key) => {
      const regex = new RegExp(`{{file:${key}}}`, 'g');
      const fileInfo = this.formatFileReference(fileData);
      processedText = processedText.replace(regex, fileInfo);
    });

    return processedText;
  }

  /**
   * Format file reference for inclusion in text
   */
  formatFileReference(fileData) {
    let fileInfo = `[File: ${fileData.name}]`;

    if (fileData.mimeType) {
      fileInfo += `\nType: ${fileData.mimeType}`;
    }

    if (fileData.size) {
      fileInfo += `\nSize: ${this.formatFileSize(fileData.size)}`;
    }

    if (fileData.geminiUri) {
      fileInfo += `\nGemini URI: ${fileData.geminiUri}`;
    } else if (fileData.webViewLink) {
      fileInfo += `\nDrive Link: ${fileData.webViewLink}`;
    }

    fileInfo += '\n[End of file reference]';

    return fileInfo;
  }

  /**
   * Format file size in human readable format
   */
  formatFileSize(bytes) {
    // Handle undefined, null, or non-numeric values
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    // Ensure i is within bounds
    const sizeIndex = Math.min(i, sizes.length - 1);
    const size = Math.round(bytes / Math.pow(1024, sizeIndex) * 100) / 100;

    return size + ' ' + sizes[sizeIndex];
  }

  /**
   * Add or update custom prompt
   */
  async addCustomPrompt(key, prompt) {
    this.customPrompts.set(key, prompt);
    await this.saveCustomPrompts();
  }

  /**
   * Remove custom prompt
   */
  async removeCustomPrompt(key) {
    this.customPrompts.delete(key);
    await this.saveCustomPrompts();
  }

  /**
   * Get custom prompt
   */
  getCustomPrompt(key) {
    return this.customPrompts.get(key);
  }

  /**
   * Get all custom prompts
   */
  getAllCustomPrompts() {
    return Object.fromEntries(this.customPrompts);
  }

  /**
   * Get all prompts (delegates to prompt manager)
   */
  getAllPrompts() {
    // Use centralized prompt manager if available
    if (window.promptManager && window.promptManager.initialized) {
      return window.promptManager.getAllPrompts();
    }

    // Fallback to local prompts
    const defaultPrompts = this.getDefaultPrompts();
    const customPrompts = Object.fromEntries(this.customPrompts);
    return { ...defaultPrompts, ...customPrompts };
  }

  /**
   * Get default prompts (delegates to prompt manager)
   */
  getDefaultPrompts() {
    // Use centralized prompt manager if available
    if (window.promptManager && window.promptManager.initialized) {
      return window.promptManager.getDefaultPrompts();
    }

    // Fallback prompts if prompt manager not available
    return {
      'summary': {
        name: 'Summary',
        description: 'Summarize the conversation and extract key details like budget, timeline, and next steps',
        prompt: 'Please go through the attached documents.\n\nSummarize the conversation: {conversation}\n\nExtract key details like budget, timeline, and next steps. Write a clear summary. No markdown or explanations.',
        knowledgeBaseFiles: []
      },
      'follow_up': {
        name: 'Follow-up',
        description: 'Write a friendly and professional follow-up message based on conversation',
        prompt: 'Please go through the attached documents.\n\nWrite a friendly and professional follow-up message based on this conversation: {conversation}\n\nMention a specific detail we discussed and include clear next steps. No markdown or explanations.',
        knowledgeBaseFiles: []
      },
      'proposal': {
        name: 'Proposal',
        description: 'Create a Fiverr project proposal based on the conversation',
        prompt: 'Please go through the attached documents.\n\nCreate a Fiverr project proposal based on the conversation: {conversation}\n\nUse my bio: {bio}\n\nInclude a greeting, project summary, scope, price, why I\'m a good fit, and next steps. No markdown or explanations.',
        knowledgeBaseFiles: []
      },
      'translate': {
        name: 'Translate',
        description: 'Translate conversation into specified language',
        prompt: 'Please go through the attached documents.\n\nTranslate this conversation: {conversation}\n\nInto this language: {language}\n\nProvide only the translated text. No explanations.',
        knowledgeBaseFiles: []
      },
      'improve_translate': {
        name: 'Improve & Translate',
        description: 'Improve grammar and tone, then translate to English',
        prompt: 'Please go through the attached documents.\n\nImprove the grammar and tone of this message: {conversation}\n\nThen, translate the improved message to English. Use my bio: {bio} to add relevant details about me as a Fiverr freelancer. No explanations.',
        knowledgeBaseFiles: []
      },
      'improve': {
        name: 'Improve',
        description: 'Improve message grammar, clarity and professionalism',
        prompt: 'Please go through the attached documents.\n\nImprove this message: {conversation}\n\nMake it grammatically correct, clear, and professional, but keep the original meaning. No explanations.',
        knowledgeBaseFiles: []
      }
    };
  }

  /**
   * Process prompt with variables and context
   */
  async processPrompt(promptKey, context = {}) {
    // First try to get from custom prompts
    let prompt = this.getCustomPrompt(promptKey);

    // If not found in custom, try default prompts
    if (!prompt) {
      const defaultPrompts = this.getDefaultPrompts();
      prompt = defaultPrompts[promptKey];
    }

    if (!prompt) {
      throw new Error(`Prompt '${promptKey}' not found`);
    }

    let processedPrompt = prompt.prompt;

    // Replace knowledge base variables
    processedPrompt = this.replaceVariables(processedPrompt);

    // Replace context variables
    Object.entries(context).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      processedPrompt = processedPrompt.replace(regex, value);
    });

    // Resolve knowledge base files to full file data
    const resolvedFiles = await this.resolveKnowledgeBaseFiles(prompt.knowledgeBaseFiles || []);

    // Return both processed prompt and knowledge base files
    return {
      prompt: processedPrompt,
      knowledgeBaseFiles: resolvedFiles
    };
  }

  /**
   * Add or update template
   */
  async addTemplate(key, template) {
    this.templates.set(key, template);
    await this.saveTemplates();
  }

  /**
   * Remove template
   */
  async removeTemplate(key) {
    this.templates.delete(key);
    await this.saveTemplates();
  }

  /**
   * Get template
   */
  getTemplate(key) {
    return this.templates.get(key);
  }

  /**
   * Get all templates
   */
  getAllTemplates() {
    return Object.fromEntries(this.templates);
  }

  /**
   * Load knowledge base files from storage
   */
  async loadKnowledgeBaseFiles() {
    try {
      if (!window.storageManager) {
        console.warn('aiFiverr KB: Storage manager not available, skipping knowledge base files load');
        return;
      }

      const result = await window.storageManager.get('knowledgeBaseFiles');
      const files = result.knowledgeBaseFiles || {};

      this.files.clear();
      Object.entries(files).forEach(([key, fileData]) => {
        this.files.set(key, fileData);
      });

      console.log('aiFiverr KB: Loaded', this.files.size, 'file references');
    } catch (error) {
      console.error('Failed to load knowledge base files:', error);
    }
  }

  /**
   * Save knowledge base files to storage
   */
  async saveKnowledgeBaseFiles() {
    try {
      if (!window.storageManager) {
        console.warn('aiFiverr KB: Storage manager not available, skipping knowledge base files save');
        return;
      }

      const filesObject = Object.fromEntries(this.files);
      await window.storageManager.set({ knowledgeBaseFiles: filesObject });
    } catch (error) {
      console.error('Failed to save knowledge base files:', error);
    }
  }

  /**
   * Add file reference to knowledge base
   */
  async addFileReference(key, fileData) {
    this.files.set(key, {
      ...fileData,
      addedAt: new Date().toISOString(),
      type: 'file'
    });
    await this.saveKnowledgeBaseFiles();
  }

  /**
   * Remove file reference from knowledge base
   */
  async removeFileReference(key) {
    this.files.delete(key);
    this.fileCache.delete(key);
    await this.saveKnowledgeBaseFiles();
  }

  /**
   * Get file reference
   */
  getFileReference(key) {
    return this.files.get(key);
  }

  /**
   * Get all file references
   */
  getAllFileReferences() {
    return Object.fromEntries(this.files);
  }

  /**
   * Sync with Google Drive files
   */
  async syncWithGoogleDrive() {
    try {
      if (!window.googleDriveClient) {
        console.warn('aiFiverr KB: Google Drive client not available');
        return;
      }

      const driveFiles = await window.googleDriveClient.listKnowledgeBaseFiles();

      // Update file references with latest Drive data
      for (const driveFile of driveFiles) {
        const existingRef = Array.from(this.files.entries())
          .find(([key, data]) => data.driveId === driveFile.id);

        if (existingRef) {
          const [key, data] = existingRef;
          this.files.set(key, {
            ...data,
            ...driveFile,
            lastSynced: new Date().toISOString()
          });
        } else {
          // Add new file reference
          const key = this.generateFileKey(driveFile.name);
          await this.addFileReference(key, {
            driveId: driveFile.id,
            name: driveFile.name,
            mimeType: driveFile.mimeType,
            size: driveFile.size,
            webViewLink: driveFile.webViewLink,
            lastSynced: new Date().toISOString()
          });
        }
      }

      await this.saveKnowledgeBaseFiles();
      console.log('aiFiverr KB: Synced with Google Drive');

    } catch (error) {
      console.error('aiFiverr KB: Failed to sync with Google Drive:', error);
    }
  }

  /**
   * Sync with Gemini Files API
   */
  async syncWithGeminiFiles() {
    try {
      console.log('aiFiverr KB: Starting sync with merged knowledge base files...');

      // Get merged knowledge base files from background script (includes both Drive and Gemini data)
      const kbFilesResult = await this.getKnowledgeBaseFilesFromBackground();
      if (!kbFilesResult.success) {
        console.warn('aiFiverr KB: Failed to get knowledge base files from background:', kbFilesResult.error);
        return;
      }

      const kbFiles = kbFilesResult.data || [];
      console.log('aiFiverr KB: Syncing with', kbFiles.length, 'knowledge base files');

      // Update file references with merged data
      let updatedCount = 0;
      let newCount = 0;

      for (const kbFile of kbFiles) {
        const fileKey = this.generateFileKey(kbFile.name);
        const existingRef = this.files.get(fileKey);

        const updatedFileData = {
          name: kbFile.name,
          mimeType: kbFile.mimeType,
          size: kbFile.size,
          driveFileId: kbFile.driveFileId || kbFile.id,
          webViewLink: kbFile.webViewLink,
          createdTime: kbFile.createdTime,
          modifiedTime: kbFile.modifiedTime,
          // Gemini data
          geminiName: kbFile.geminiName,
          geminiUri: kbFile.geminiUri,
          geminiState: kbFile.geminiState,
          geminiMimeType: kbFile.geminiMimeType,
          // Sync metadata
          lastSynced: new Date().toISOString(),
          source: 'merged_sync'
        };

        if (existingRef) {
          // Update existing reference
          this.files.set(fileKey, {
            ...existingRef,
            ...updatedFileData
          });
          updatedCount++;
          console.log('aiFiverr KB: Updated file reference:', kbFile.name, 'geminiUri:', kbFile.geminiUri);
        } else {
          // Add new reference
          this.files.set(fileKey, {
            ...updatedFileData,
            addedAt: new Date().toISOString(),
            type: 'file'
          });
          newCount++;
          console.log('aiFiverr KB: Added new file reference:', kbFile.name, 'geminiUri:', kbFile.geminiUri);
        }
      }

      // Save updated file references
      if (updatedCount > 0 || newCount > 0) {
        await this.saveKnowledgeBaseFiles();
        console.log(`aiFiverr KB: Sync complete - Updated: ${updatedCount}, New: ${newCount}, Total: ${this.files.size}`);
      }
    } catch (error) {
      console.error('aiFiverr KB: Failed to sync with Gemini Files API:', error);
    }
  }

  /**
   * Get Gemini files from background script
   */
  async getGeminiFilesFromBackground() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_GEMINI_FILES' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  /**
   * Get knowledge base files from background script (merged Drive + Gemini data)
   */
  async getKnowledgeBaseFilesFromBackground() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_KNOWLEDGE_BASE_FILES' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('aiFiverr KB: Error getting files from background:', chrome.runtime.lastError.message);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('aiFiverr KB: Got files from background:', response);
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  /**
   * Upload a file to Gemini Files API
   */
  async uploadFileToGemini(fileData) {
    try {
      console.log('aiFiverr KB: Attempting to upload file to Gemini:', fileData.name);

      // Request file upload through background script
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'UPLOAD_FILE_TO_GEMINI',
          fileData: {
            driveFileId: fileData.driveFileId,
            name: fileData.name,
            mimeType: fileData.mimeType,
            displayName: fileData.name
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('aiFiverr KB: Error uploading file to Gemini:', chrome.runtime.lastError.message);
            resolve(null);
          } else if (response && response.success) {
            console.log('aiFiverr KB: File uploaded to Gemini successfully:', response.data);
            resolve({
              name: response.data.displayName,
              mimeType: response.data.mimeType,
              geminiUri: response.data.uri,
              geminiName: response.data.name,
              geminiState: response.data.state,
              size: response.data.sizeBytes
            });
          } else {
            console.error('aiFiverr KB: Failed to upload file to Gemini:', response?.error || 'Unknown error');
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('aiFiverr KB: Error in uploadFileToGemini:', error);
      return null;
    }
  }

  /**
   * Generate unique key for file
   */
  generateFileKey(fileName) {
    const baseName = fileName.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    let key = baseName;
    let counter = 1;

    while (this.files.has(key) || this.variables.has(key)) {
      key = `${baseName}_${counter}`;
      counter++;
    }

    return key;
  }

  /**
   * Process template with variables and files
   */
  processTemplate(templateKey, variables = {}) {
    const template = this.getTemplate(templateKey);
    if (!template) {
      throw new Error(`Template '${templateKey}' not found`);
    }

    let processedContent = template.content;

    // Replace knowledge base variables
    processedContent = this.replaceVariables(processedContent);

    // Replace file references
    processedContent = this.replaceFileReferences(processedContent);

    // Replace additional variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(regex, value);
    });

    return processedContent;
  }

  /**
   * Save knowledge base to storage
   */
  async saveKnowledgeBase() {
    try {
      if (!window.storageManager) {
        console.warn('aiFiverr KB: Storage manager not available, skipping knowledge base save');
        return;
      }

      const data = Object.fromEntries(this.variables);
      await window.storageManager.saveKnowledgeBase(data);

      // Also sync to Google Drive if authenticated
      await this.syncToGoogleDrive('variables', data);
    } catch (error) {
      console.error('Failed to save knowledge base:', error);
    }
  }

  /**
   * Save custom prompts to storage
   */
  async saveCustomPrompts() {
    try {
      if (!window.storageManager) {
        console.warn('aiFiverr KB: Storage manager not available, skipping custom prompts save');
        return;
      }

      const data = Object.fromEntries(this.customPrompts);
      await window.storageManager.set({ customPrompts: data });

      // Also sync to Google Drive if authenticated
      await this.syncToGoogleDrive('custom-prompts', data);
    } catch (error) {
      console.error('Failed to save custom prompts:', error);
    }
  }

  /**
   * Save templates to storage
   */
  async saveTemplates() {
    try {
      if (!window.storageManager) {
        console.warn('aiFiverr KB: Storage manager not available, skipping templates save');
        return;
      }

      const data = Object.fromEntries(this.templates);
      await window.storageManager.set({ templates: data });
    } catch (error) {
      console.error('Failed to save templates:', error);
    }
  }

  /**
   * Export knowledge base data
   */
  exportData() {
    return {
      variables: this.getAllVariables(),
      customPrompts: this.getAllCustomPrompts(),
      templates: this.getAllTemplates(),
      exportedAt: Date.now()
    };
  }

  /**
   * Import knowledge base data
   */
  async importData(data) {
    try {
      if (data.variables) {
        this.variables.clear();
        Object.entries(data.variables).forEach(([key, value]) => {
          this.variables.set(key, value);
        });
        await this.saveKnowledgeBase();
      }

      if (data.customPrompts) {
        this.customPrompts.clear();
        Object.entries(data.customPrompts).forEach(([key, prompt]) => {
          this.customPrompts.set(key, prompt);
        });
        await this.saveCustomPrompts();
      }

      if (data.templates) {
        this.templates.clear();
        Object.entries(data.templates).forEach(([key, template]) => {
          this.templates.set(key, template);
        });
        await this.saveTemplates();
      }

      return true;
    } catch (error) {
      console.error('Failed to import knowledge base data:', error);
      return false;
    }
  }

  /**
   * Search prompts and templates
   */
  search(query) {
    const results = {
      prompts: [],
      templates: []
    };

    const searchTerm = query.toLowerCase();

    // Search prompts
    this.customPrompts.forEach((prompt, key) => {
      if (prompt.name.toLowerCase().includes(searchTerm) ||
          prompt.description.toLowerCase().includes(searchTerm) ||
          prompt.prompt.toLowerCase().includes(searchTerm)) {
        results.prompts.push({ key, ...prompt });
      }
    });

    // Search templates
    this.templates.forEach((template, key) => {
      if (template.name.toLowerCase().includes(searchTerm) ||
          template.description.toLowerCase().includes(searchTerm) ||
          template.content.toLowerCase().includes(searchTerm)) {
        results.templates.push({ key, ...template });
      }
    });

    return results;
  }

  /**
   * Resolve knowledge base file IDs to full file data
   */
  async resolveKnowledgeBaseFiles(fileReferences) {
    console.log('aiFiverr KB: Resolving knowledge base files:', fileReferences);

    if (!fileReferences || fileReferences.length === 0) {
      console.log('aiFiverr KB: No file references provided');
      return [];
    }

    const resolvedFiles = [];

    for (const fileRef of fileReferences) {
      try {
        console.log('aiFiverr KB: Processing file reference:', fileRef);

        // If it's already a full file object with geminiUri, use it as is
        if (fileRef.geminiUri) {
          console.log('aiFiverr KB: File already has geminiUri:', fileRef.name, fileRef.geminiUri);
          resolvedFiles.push({
            id: fileRef.id || fileRef.driveFileId,
            name: fileRef.name,
            mimeType: fileRef.mimeType,
            geminiUri: fileRef.geminiUri,
            size: fileRef.size
          });
          continue;
        }

        // Try to find the file in our knowledge base by ID or name
        let fullFileData = null;

        // First try by ID (could be driveFileId or regular id)
        if (fileRef.id) {
          console.log('aiFiverr KB: Looking up file by ID:', fileRef.id);
          fullFileData = this.getFileReference(fileRef.id);
        }
        if (!fullFileData && fileRef.driveFileId) {
          console.log('aiFiverr KB: Looking up file by driveFileId:', fileRef.driveFileId);
          fullFileData = this.getFileReference(fileRef.driveFileId);
        }

        // If not found by ID, try by name
        if (!fullFileData && fileRef.name) {
          console.log('aiFiverr KB: Looking up file by name:', fileRef.name);
          const allFiles = this.getAllFileReferences();
          console.log('aiFiverr KB: Available files:', Object.keys(allFiles));
          fullFileData = Object.values(allFiles).find(file => file.name === fileRef.name);
        }

        console.log('aiFiverr KB: Found file data:', fullFileData);

        // If we found the full file data and it has geminiUri, add it
        if (fullFileData && fullFileData.geminiUri) {
          console.log('aiFiverr KB: File has geminiUri, adding to resolved files:', fullFileData.name, fullFileData.geminiUri);
          resolvedFiles.push({
            id: fileRef.id || fileRef.driveFileId || fullFileData.driveFileId,
            name: fullFileData.name,
            mimeType: fullFileData.mimeType,
            geminiUri: fullFileData.geminiUri,
            size: fullFileData.size
          });
        } else if (fullFileData) {
          // File exists but no geminiUri - try to get from background or sync
          console.warn('aiFiverr KB: File found but no geminiUri, attempting to sync:', fileRef.name);

          // Try to get updated file data from background
          const backgroundFiles = await this.getKnowledgeBaseFilesFromBackground();
          if (backgroundFiles.success && backgroundFiles.data) {
            const matchingFile = backgroundFiles.data.find(f =>
              f.name === fullFileData.name || f.driveFileId === fullFileData.driveFileId
            );

            if (matchingFile && matchingFile.geminiUri) {
              console.log('aiFiverr KB: Found geminiUri from background sync:', matchingFile.name, matchingFile.geminiUri);

              // Update local file reference
              const fileKey = this.generateFileKey(matchingFile.name);
              this.files.set(fileKey, {
                ...fullFileData,
                geminiUri: matchingFile.geminiUri,
                geminiName: matchingFile.geminiName,
                geminiState: matchingFile.geminiState
              });
              await this.saveKnowledgeBaseFiles();

              resolvedFiles.push({
                id: fileRef.id || fileRef.driveFileId || matchingFile.driveFileId,
                name: matchingFile.name,
                mimeType: matchingFile.mimeType,
                geminiUri: matchingFile.geminiUri,
                size: matchingFile.size
              });
            } else {
              console.warn('aiFiverr KB: File not found in background or missing geminiUri, attempting upload:', fileRef.name);

              // Try to upload file to Gemini if it has a driveFileId
              if (fullFileData.driveFileId) {
                try {
                  const uploadResult = await this.uploadFileToGemini(fullFileData);
                  if (uploadResult && uploadResult.geminiUri) {
                    console.log('aiFiverr KB: Successfully uploaded file to Gemini:', uploadResult.name, uploadResult.geminiUri);

                    // Update local file reference
                    const fileKey = this.generateFileKey(fullFileData.name);
                    this.files.set(fileKey, {
                      ...fullFileData,
                      geminiUri: uploadResult.geminiUri,
                      geminiName: uploadResult.geminiName,
                      geminiState: uploadResult.geminiState
                    });
                    await this.saveKnowledgeBaseFiles();

                    resolvedFiles.push({
                      id: fileRef.id || fileRef.driveFileId,
                      name: uploadResult.name,
                      mimeType: uploadResult.mimeType,
                      geminiUri: uploadResult.geminiUri,
                      size: uploadResult.size
                    });
                  } else {
                    console.warn('aiFiverr KB: Failed to upload file to Gemini:', fileRef.name);
                  }
                } catch (error) {
                  console.error('aiFiverr KB: Error uploading file to Gemini:', fileRef.name, error);
                }
              }
            }
          } else {
            console.warn('aiFiverr KB: Failed to get files from background, skipping file:', fileRef.name);
          }
        } else {
          console.warn('aiFiverr KB: Could not resolve file reference:', fileRef);
        }
      } catch (error) {
        console.error('aiFiverr KB: Error resolving file:', fileRef, error);
      }
    }

    console.log('aiFiverr KB: Resolved', resolvedFiles.length, 'files for API request:', resolvedFiles);
    return resolvedFiles;
  }

  /**
   * Process prompt with automatic context extraction from Fiverr page
   */
  async processPromptWithFiverrContext(promptKey, additionalContext = {}) {
    try {
      // Determine optimal context type based on prompt
      const contextType = this.determineOptimalContextType(promptKey);

      // Extract context from current Fiverr page
      const context = await this.extractFiverrContext(contextType);

      // Merge with additional context
      const fullContext = { ...context, ...additionalContext };

      // Process the prompt
      const result = this.processPrompt(promptKey, fullContext);

      // Return the processed prompt text for backward compatibility
      // but also include the knowledge base files
      if (typeof result === 'object' && result.prompt) {
        return result;
      } else {
        // Fallback for old format
        return { prompt: result, knowledgeBaseFiles: [] };
      }
    } catch (error) {
      console.error('Failed to process prompt with Fiverr context:', error);
      throw error;
    }
  }

  /**
   * Determine optimal context type based on prompt key
   */
  determineOptimalContextType(promptKey) {
    const contextMapping = {
      'project_proposal': 'project_focused',
      'brief_analysis': 'project_focused',
      'requirement_clarification': 'key_points',
      'follow_up': 'recent',
      'general_reply': 'recent',
      'summary': 'summary',
      'default': 'recent'
    };

    return contextMapping[promptKey] || contextMapping['default'];
  }

  /**
   * Extract context variables from current Fiverr page with intelligent context management
   */
  async extractFiverrContext(contextType = 'recent', maxLength = 4000) {
    const context = {};

    try {
      // Extract username from URL
      if (window.fiverrExtractor) {
        context.username = window.fiverrExtractor.extractUsernameFromUrl() || 'Client';

        // Extract conversation if available
        const conversationData = await window.fiverrExtractor.extractConversation();
        if (conversationData) {
          // Use intelligent context based on use case
          context.conversation = window.fiverrExtractor.getIntelligentContext(conversationData, contextType, maxLength);
          context.conversation_summary = window.fiverrExtractor.getConversationSummary(conversationData, 1500);
          context.conversation_count = conversationData.messages?.length || 0;
          context.conversation_last_message = conversationData.messages?.length > 0
            ? conversationData.messages[conversationData.messages.length - 1].body
            : 'No messages';

          // Add context metadata
          context.conversation_type = contextType;
          context.conversation_length = context.conversation.length;
          context.is_large_conversation = conversationData.messages?.length > 50;
        }

        // Extract brief details if on brief page
        const briefData = window.fiverrExtractor.extractBriefDetails();
        if (briefData) {
          // Format brief data for proposal context
          let proposalText = '';
          if (briefData.title) proposalText += `Title: ${briefData.title}\n`;
          if (briefData.description) proposalText += `Description: ${briefData.description}\n`;
          if (briefData.overview) proposalText += `Brief Overview: ${briefData.overview}\n`;
          if (briefData.requirements?.length) proposalText += `Requirements: ${briefData.requirements.join(', ')}\n`;
          if (briefData.budget) proposalText += `Budget: ${briefData.budget}\n`;
          if (briefData.deadline) proposalText += `Deadline: ${briefData.deadline}\n`;
          if (briefData.skills?.length) proposalText += `Skills needed: ${briefData.skills.join(', ')}\n`;

          context.proposal = proposalText || 'No specific brief details available';
        }
      }

      // Set default values for missing context
      if (!context.conversation) context.conversation = 'No conversation data available';
      if (!context.conversation_summary) context.conversation_summary = 'No conversation summary available';
      if (!context.conversation_count) context.conversation_count = 0;
      if (!context.conversation_last_message) context.conversation_last_message = 'No recent messages';
      if (!context.username) context.username = 'Client';
      if (!context.proposal) context.proposal = 'No proposal data available';

    } catch (error) {
      console.error('Failed to extract Fiverr context:', error);
      // Set fallback values
      context.conversation = 'No conversation data available';
      context.username = 'Client';
      context.proposal = 'No proposal data available';
    }

    return context;
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      variableCount: this.variables.size,
      promptCount: this.customPrompts.size,
      templateCount: this.templates.size,
      totalItems: this.variables.size + this.customPrompts.size + this.templates.size
    };
  }

  // Google Drive Integration Methods
  async uploadFileToGoogleDrive(file, fileName, description = '') {
    try {
      if (!window.googleAuthService || !window.googleAuthService.isUserAuthenticated()) {
        throw new Error('Google authentication required');
      }

      if (!window.googleDriveClient) {
        throw new Error('Google Drive client not available');
      }

      console.log('aiFiverr KB: Uploading file to Google Drive:', fileName);

      const result = await window.googleDriveClient.uploadFile(file, fileName, description);

      if (result.success) {
        // Store file reference in local knowledge base
        await this.addFileReference(result.fileId, {
          name: fileName,
          size: result.size,
          mimeType: result.mimeType,
          driveFileId: result.fileId,
          webViewLink: result.webViewLink,
          uploadedAt: new Date().toISOString(),
          source: 'google_drive'
        });

        console.log('aiFiverr KB: File uploaded successfully:', result.fileId);
        return result;
      } else {
        throw new Error('Upload failed');
      }

    } catch (error) {
      console.error('aiFiverr KB: Failed to upload file to Google Drive:', error);
      throw error;
    }
  }

  async listGoogleDriveFiles() {
    try {
      if (!window.googleAuthService || !window.googleAuthService.isUserAuthenticated()) {
        return [];
      }

      if (!window.googleDriveClient) {
        return [];
      }

      const files = await window.googleDriveClient.listKnowledgeBaseFiles();

      // Update local file references
      for (const file of files) {
        await this.addFileReference(file.id, {
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          driveFileId: file.id,
          webViewLink: file.webViewLink,
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime,
          source: 'google_drive'
        });
      }

      return files;

    } catch (error) {
      console.error('aiFiverr KB: Failed to list Google Drive files:', error);
      return [];
    }
  }

  async downloadFileFromGoogleDrive(fileId) {
    try {
      if (!window.googleAuthService || !window.googleAuthService.isUserAuthenticated()) {
        throw new Error('Google authentication required');
      }

      if (!window.googleDriveClient) {
        throw new Error('Google Drive client not available');
      }

      const blob = await window.googleDriveClient.downloadFile(fileId);
      return blob;

    } catch (error) {
      console.error('aiFiverr KB: Failed to download file from Google Drive:', error);
      throw error;
    }
  }

  async deleteFileFromGoogleDrive(fileId) {
    try {
      if (!window.googleAuthService || !window.googleAuthService.isUserAuthenticated()) {
        throw new Error('Google authentication required');
      }

      if (!window.googleDriveClient) {
        throw new Error('Google Drive client not available');
      }

      await window.googleDriveClient.deleteFile(fileId);

      // Remove from local file references
      await this.removeFileReference(fileId);

      console.log('aiFiverr KB: File deleted from Google Drive:', fileId);
      return { success: true };

    } catch (error) {
      console.error('aiFiverr KB: Failed to delete file from Google Drive:', error);
      throw error;
    }
  }

  async addFileReference(fileId, fileInfo) {
    try {
      if (!window.storageManager) {
        console.warn('aiFiverr KB: Storage manager not available, skipping add file reference');
        return;
      }

      const fileReferences = await window.storageManager.get('knowledgeBaseFiles') || {};
      fileReferences[fileId] = fileInfo;
      await window.storageManager.set({ knowledgeBaseFiles: fileReferences });
    } catch (error) {
      console.error('aiFiverr KB: Failed to add file reference:', error);
    }
  }

  async removeFileReference(fileId) {
    try {
      if (!window.storageManager) {
        console.warn('aiFiverr KB: Storage manager not available, skipping remove file reference');
        return;
      }

      const result = await window.storageManager.get('knowledgeBaseFiles');
      const fileReferences = result.knowledgeBaseFiles || {};
      delete fileReferences[fileId];
      await window.storageManager.set({ knowledgeBaseFiles: fileReferences });
    } catch (error) {
      console.error('aiFiverr KB: Failed to remove file reference:', error);
    }
  }

  async getFileReferences() {
    try {
      if (!window.storageManager) {
        console.warn('aiFiverr KB: Storage manager not available, returning empty file references');
        return {};
      }

      const result = await window.storageManager.get('knowledgeBaseFiles');
      return result.knowledgeBaseFiles || {};
    } catch (error) {
      console.error('aiFiverr KB: Failed to get file references:', error);
      return {};
    }
  }

  async syncWithGoogleDrive() {
    try {
      if (!window.googleAuthService || !window.googleAuthService.isUserAuthenticated()) {
        console.log('aiFiverr KB: Not authenticated, skipping Google Drive sync');
        return { success: false, reason: 'not_authenticated' };
      }

      console.log('aiFiverr KB: Syncing with Google Drive...');

      // Get files from Google Drive
      const driveFiles = await this.listGoogleDriveFiles();

      // Get local file references
      const localFiles = await this.getFileReferences();

      // Find files that exist in Drive but not locally
      const newFiles = driveFiles.filter(driveFile => !localFiles[driveFile.id]);

      // Find files that exist locally but not in Drive (deleted)
      const deletedFiles = Object.keys(localFiles).filter(fileId =>
        localFiles[fileId].source === 'google_drive' &&
        !driveFiles.find(driveFile => driveFile.id === fileId)
      );

      // Remove references to deleted files
      for (const fileId of deletedFiles) {
        await this.removeFileReference(fileId);
      }

      console.log('aiFiverr KB: Sync complete', {
        totalDriveFiles: driveFiles.length,
        newFiles: newFiles.length,
        deletedFiles: deletedFiles.length
      });

      return {
        success: true,
        totalFiles: driveFiles.length,
        newFiles: newFiles.length,
        deletedFiles: deletedFiles.length
      };

    } catch (error) {
      console.error('aiFiverr KB: Failed to sync with Google Drive:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get file content for processing (cached)
   */
  async getFileContent(key) {
    if (this.fileCache.has(key)) {
      return this.fileCache.get(key);
    }

    const fileRef = this.files.get(key);
    if (!fileRef) {
      throw new Error(`File reference '${key}' not found`);
    }

    try {
      let content = null;

      // Try to get content from Gemini first (if available)
      if (fileRef.geminiUri && window.geminiFilesClient) {
        // Gemini Files API doesn't provide direct content access
        // Content is handled by the API during generation
        content = `[Gemini File: ${fileRef.name}]`;
      } else if (fileRef.webViewLink && window.googleDriveClient) {
        // For text files, try to get content from Drive
        if (fileRef.mimeType && fileRef.mimeType.startsWith('text/')) {
          content = await this.fetchDriveFileContent(fileRef);
        } else {
          content = `[Binary File: ${fileRef.name}]`;
        }
      }

      if (content) {
        this.fileCache.set(key, content);
      }

      return content;

    } catch (error) {
      console.error(`Failed to get content for file '${key}':`, error);
      return `[Error loading file: ${fileRef.name}]`;
    }
  }

  /**
   * Fetch file content from Google Drive
   */
  async fetchDriveFileContent(fileRef) {
    try {
      const response = await fetch(fileRef.webViewLink);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Failed to fetch Drive file content:', error);
      return `[Unable to load content from: ${fileRef.name}]`;
    }
  }

  /**
   * Clear file cache
   */
  clearFileCache() {
    this.fileCache.clear();
  }

  /**
   * Get combined knowledge base data (variables + files)
   */
  getAllKnowledgeBaseData() {
    return {
      variables: Object.fromEntries(this.variables),
      files: Object.fromEntries(this.files),
      stats: {
        variableCount: this.variables.size,
        fileCount: this.files.size,
        cacheSize: this.fileCache.size
      }
    };
  }

  /**
   * Sync data to Google Drive
   */
  async syncToGoogleDrive(dataType, data) {
    try {
      // Check if Google Drive client is available and user is authenticated
      if (!window.googleDriveClient) {
        console.log('aiFiverr KB: Google Drive client not available for sync');
        return;
      }

      // Check if Google Auth service is available and user is authenticated
      if (!window.googleAuthService || !window.googleAuthService.isUserAuthenticated()) {
        console.log('aiFiverr KB: User not authenticated for Google Drive sync');
        return;
      }

      // Test connection to ensure everything is working
      const authResult = await window.googleDriveClient.testConnection();
      if (!authResult.success) {
        console.log('aiFiverr KB: Google Drive connection test failed:', authResult.error);
        return;
      }

      const fileName = `aifiverr-${dataType}.json`;
      const description = `aiFiverr ${dataType} data - automatically synced`;

      await window.googleDriveClient.saveDataFile(fileName, {
        type: dataType,
        timestamp: new Date().toISOString(),
        data: data
      }, description);

      console.log(`aiFiverr KB: Synced ${dataType} to Google Drive`);
    } catch (error) {
      console.warn(`aiFiverr KB: Failed to sync ${dataType} to Google Drive:`, error);
      // Don't throw error - sync is optional
    }
  }
}

// Create global knowledge base manager - but only when explicitly called
function initializeKnowledgeBaseManager() {
  if (!window.knowledgeBaseManager) {
    window.knowledgeBaseManager = new KnowledgeBaseManager();
    console.log('aiFiverr: Knowledge Base Manager created');
  }
  return window.knowledgeBaseManager;
}

// Export the initialization function but DO NOT auto-initialize
window.initializeKnowledgeBaseManager = initializeKnowledgeBaseManager;

// REMOVED AUTO-INITIALIZATION - This was causing the knowledge base manager to load on every website
// The knowledge base manager should only be initialized when explicitly called by the main extension
