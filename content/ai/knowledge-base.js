/**
 * Knowledge Base Manager
 * Handles custom prompts, variables, and reusable content for AI interactions
 */

class KnowledgeBaseManager {
  constructor() {
    this.variables = new Map();
    this.customPrompts = new Map();
    this.templates = new Map();
    this.init();
  }

  async init() {
    await this.loadKnowledgeBase();
    await this.loadCustomPrompts();
    await this.loadTemplates();
  }

  /**
   * Load knowledge base variables from storage
   */
  async loadKnowledgeBase() {
    try {
      const data = await storageManager.getKnowledgeBase();
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
      const result = await storageManager.get('customPrompts');
      const prompts = result.customPrompts || {};
      
      this.customPrompts.clear();
      Object.entries(prompts).forEach(([key, prompt]) => {
        this.customPrompts.set(key, prompt);
      });

      // Add default prompts if none exist
      if (this.customPrompts.size === 0) {
        this.addDefaultPrompts();
      }
    } catch (error) {
      console.error('Failed to load custom prompts:', error);
    }
  }

  /**
   * Load templates from storage
   */
  async loadTemplates() {
    try {
      const result = await storageManager.get('templates');
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
   * Add default prompts
   */
  addDefaultPrompts() {
    const defaultPrompts = {
      'professional_reply': {
        name: 'Professional Reply',
        description: 'Generate a professional response to client messages',
        prompt: `Generate a professional and friendly reply to the following message. Use my bio: {{bio}} and mention relevant services: {{services}} if appropriate. Maintain a helpful and solution-oriented tone.

Message: {message}

Please provide a response that:
1. Acknowledges the client's message
2. Addresses their specific needs or questions
3. Offers clear next steps or solutions
4. Maintains professionalism while being personable`
      },
      'proposal_generator': {
        name: 'Proposal Generator',
        description: 'Create compelling proposals for project briefs',
        prompt: `Create a compelling Fiverr proposal based on the project brief below. Use my background: {{bio}} and highlight relevant experience: {{experience}}.

Project Brief: {brief}

Structure the proposal with:
1. A personalized greeting that shows I understand their needs
2. Brief explanation of my relevant experience and skills
3. Clear approach to solving their problem
4. Timeline and deliverables
5. Professional closing with next steps

Make it engaging and show genuine interest in their project.`
      },
      'message_analyzer': {
        name: 'Message Analyzer',
        description: 'Analyze client messages for tone, intent, and key points',
        prompt: `Analyze the following client message and provide insights:

Message: {message}

Please analyze:
1. **Tone**: (professional, casual, urgent, frustrated, excited, etc.)
2. **Intent**: (inquiry, complaint, request, feedback, etc.)
3. **Key Points**: Main requirements or concerns mentioned
4. **Urgency Level**: How quickly they need a response
5. **Suggested Response Approach**: How to best respond to this message

Provide actionable insights for crafting an appropriate response.`
      },
      'conversation_summarizer': {
        name: 'Conversation Summarizer',
        description: 'Summarize long conversations into key points',
        prompt: `Summarize the following Fiverr conversation, highlighting the most important information:

Conversation: {conversation}

Please provide:
1. **Project Overview**: What the client needs
2. **Key Decisions**: Important agreements or changes
3. **Action Items**: What needs to be done next
4. **Deadlines**: Any time-sensitive items
5. **Budget/Pricing**: Financial discussions
6. **Client Preferences**: Specific requirements or preferences mentioned

Keep the summary concise but comprehensive.`
      }
    };

    Object.entries(defaultPrompts).forEach(([key, prompt]) => {
      this.customPrompts.set(key, prompt);
    });

    this.saveCustomPrompts();
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
   * Process prompt with variables and context
   */
  processPrompt(promptKey, context = {}) {
    const prompt = this.getCustomPrompt(promptKey);
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

    return processedPrompt;
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
   * Process template with variables
   */
  processTemplate(templateKey, variables = {}) {
    const template = this.getTemplate(templateKey);
    if (!template) {
      throw new Error(`Template '${templateKey}' not found`);
    }

    let processedContent = template.content;

    // Replace knowledge base variables
    processedContent = this.replaceVariables(processedContent);

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
      const data = Object.fromEntries(this.variables);
      await storageManager.saveKnowledgeBase(data);
    } catch (error) {
      console.error('Failed to save knowledge base:', error);
    }
  }

  /**
   * Save custom prompts to storage
   */
  async saveCustomPrompts() {
    try {
      const data = Object.fromEntries(this.customPrompts);
      await storageManager.set({ customPrompts: data });
    } catch (error) {
      console.error('Failed to save custom prompts:', error);
    }
  }

  /**
   * Save templates to storage
   */
  async saveTemplates() {
    try {
      const data = Object.fromEntries(this.templates);
      await storageManager.set({ templates: data });
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
}

// Create global knowledge base manager
window.knowledgeBaseManager = new KnowledgeBaseManager();
