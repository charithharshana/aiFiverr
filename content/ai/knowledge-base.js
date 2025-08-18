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
      'professional_initial_reply': {
        name: 'Professional Initial Reply',
        description: 'Generate a professional, friendly, and concise reply to a potential client\'s initial message',
        prompt: `You are an expert freelance assistant. Your goal is to generate a professional, friendly, and concise reply to a potential client's initial message.

**Analyze this context:**
*   **Client's Message:** {conversation}
*   **Client's Username:** {username}
*   **My Professional Bio:** {{bio}}
*   **My Services:** {{services}}
*   **My Portfolio:** {{portfolio}}
*   **Custom Information:** {{custom1}}

**Based on the context, generate a reply that:**
1. Greets the client by their {username}.
2. Acknowledges and shows understanding of their core request from the {conversation}.
3. Intelligently incorporates a relevant point from my {{bio}} or mentions a specific service from {{services}} that fits their need. Do not just list them.
4. Suggests a clear next step (e.g., asking a key question, suggesting a call).
5. Maintains a helpful, confident, and professional tone.
6. Provides the reply directly, without any extra explanations.`
      },
      'project_summary': {
        name: 'Project Summary',
        description: 'Analyze conversation and extract key details into a structured, concise summary',
        prompt: `You are a project management assistant. Analyze the following conversation and extract the key details into a structured, concise summary.

**Conversation to Analyze:**
{conversation}

**Generate the summary using this exact format:**
*   **Project Overview:** A one-sentence summary of the client's primary goal.
*   **Key Deliverables:** A bulleted list of the specific items the client expects.
*   **Client Preferences:** A bulleted list of specific instructions or requirements mentioned.
*   **Key Decisions Made:** A bulleted list of important agreements or changes confirmed.
*   **Budget & Pricing:** Any mention of financial agreements. State "Not discussed" if absent.
*   **Deadlines & Timeline:** Any specific dates or time frames mentioned. State "Not discussed" if absent.
*   **Next Action Items:** What needs to be done next, and by whom.`
      },
      'follow_up_message': {
        name: 'Follow-up Message',
        description: 'Draft a concise and effective follow-up message to a client based on conversation history',
        prompt: `You are a professional freelance communicator. Your goal is to draft a concise and effective follow-up message to a client based on our conversation history.

**Use this project context:**
*   **Conversation History:** {conversation}
*   **Purpose of this follow-up:** {{custom1}}
*   **My availability or updates:** {{custom2}}

**Draft a follow-up message that:**
1. Is friendly and professional.
2. Directly addresses the purpose described in {{custom1}}.
3. Briefly references a specific part of the project from the {conversation} to show context.
4. Includes a clear, simple call to action.
5. If provided, briefly mentions my availability or updates from {{custom2}}.
6. Provides the reply directly, without any extra explanations.`
      },
      'project_proposal': {
        name: 'Project Proposal',
        description: 'Transform raw notes into a clear, professional, and persuasive project proposal message',
        prompt: `You are a skilled proposal writer. Your task is to transform my raw notes into a clear, professional, and persuasive project proposal message for a client.

**Analyze this information:**
*   **Client's Username:** {username}
*   **Conversation History:** {conversation}
*   **My Proposal Notes (Scope, Timeline, Price):** {proposal}
*   **My Professional Bio:** {{bio}}
*   **Relevant Portfolio Links:** {{portfolio}}

**Generate a proposal message that follows this structure:**
1.  **Personalized Greeting:** Start with a friendly greeting to {username}.
2.  **Summary of Understanding:** Briefly state your understanding of their project goal, based on the {conversation}.
3.  **The Proposal:** Clearly present the information from the {proposal} notes, using clear headings like "Scope," "Timeline," and "Investment."
4.  **Why Me:** Subtly weave in a relevant point from your {{bio}} to build confidence.
5.  **Proof of Work:** Naturally include a link to a relevant project from your {{portfolio}}.
6.  **Clear Call to Action:** End with a clear next step, such as inviting them to ask questions or accept the offer.`
      },
      'translate_and_explain': {
        name: 'Translate and Explain Message',
        description: 'Translate text and provide a simple explanation of its content',
        prompt: `You are an expert multilingual assistant. Your task is to translate the given text and provide a simple explanation of its content.

**Analyze this information:**
*   **Text to Analyze:** {conversation}
*   **Translate to Language:** {language}

**Provide your response in the following structured format:**

**Simple Explanation (in English):**
*   **Main Goal:** What is the sender trying to achieve?
*   **Key Points:** What are the most important pieces of information or questions?
*   **Tone:** Is the sender formal, informal, happy, urgent?

---

**Full Translation (in {language}):**
[Provide the accurate and natural-sounding translation of the entire text here]`
      },
      'refine_and_translate': {
        name: 'Refine and Translate My Message',
        description: 'Refine draft message for clarity and professionalism, then translate to requested language',
        prompt: `You are an expert multilingual editor and translator. Your task is to first refine the provided draft message for clarity, professionalism, and grammar, and then translate the improved version into the requested language.

**Analyze this information:**
*   **My Draft Message:** {conversation}
*   **Translate to Language:** {language}

**Perform the following steps:**
1.  Silently review and refine the "My Draft Message" to make it more professional and effective. Correct all spelling and grammar mistakes.
2.  Provide a perfect translation of that REFINED message into the target {language}.

**Your output should ONLY be the final, translated text. Do not include the English version or any explanations.**`
      },
      'refine_message': {
        name: 'Refine My Message (No Translation)',
        description: 'Refine draft message to improve quality, clarity, and impact without translation',
        prompt: `You are an expert copy editor and communication coach. Your task is to refine the following draft message to improve its quality, clarity, and impact.

**Analyze this information:**
*   **My Draft Message:** {conversation}
*   **Desired Tone/Goal:** {{custom1}} (e.g., "more professional," "more friendly," "more persuasive," "more concise")

**Based on the instructions, refine the draft by:**
1. Correcting all spelling, grammar, and punctuation errors.
2. Improving clarity, flow, and conciseness.
3. Adjusting the tone to be more {{custom1}}.
4. Retaining the original core meaning of the message.

**Your output should ONLY be the final, refined message. Do not provide explanations or comments about the changes made.**`
      },
      'translate_message': {
        name: 'Translate Message',
        description: 'Translate a message to a specified language while maintaining context and tone',
        prompt: `You are a professional translator. Your task is to translate the following message accurately while preserving the original tone, context, and meaning.

**Message to translate:** {message}
**Target language:** {language}
**Original context:** {conversation}

**Translation guidelines:**
1. **Maintain the original tone** (formal, casual, friendly, professional, etc.)
2. **Preserve cultural context** and adapt idioms appropriately
3. **Keep technical terms** accurate and industry-appropriate
4. **Ensure natural flow** in the target language
5. **Maintain the same level of formality** as the original

Please provide only the translated text without additional explanations.`
      },
      'summarize_message': {
        name: 'Summarize Message',
        description: 'Create a concise summary of a message highlighting key points',
        prompt: `You are an expert at creating clear, concise summaries. Your task is to summarize the following message, extracting the most important information.

**Message to summarize:** {message}
**Context:** {conversation}

**Summary guidelines:**
1. **Extract key points** and main ideas
2. **Identify action items** or requests if any
3. **Maintain important details** while removing redundancy
4. **Keep the original tone** and intent
5. **Make it concise** but comprehensive

**Format:** Provide a bullet-point summary followed by a brief conclusion if needed.

Please create the summary now.`
      },
      'detailed_response': {
        name: 'Detailed Response',
        description: 'Generate a comprehensive, detailed response to a message or inquiry',
        prompt: `You are an expert communicator specializing in detailed, comprehensive responses. Your task is to create a thorough response that addresses all aspects of the inquiry.

**Message/Inquiry:** {message}
**Context:** {conversation}
**My expertise:** {{services}}
**My background:** {{bio}}

**Response guidelines:**
1. **Address all points** mentioned in the original message
2. **Provide detailed explanations** and examples where appropriate
3. **Show expertise** and knowledge in the subject matter
4. **Include actionable insights** or next steps
5. **Maintain professional tone** while being approachable
6. **Structure clearly** with headings or bullet points if needed

Please generate a comprehensive, detailed response now.`
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
   * Process prompt with automatic context extraction from Fiverr page
   */
  async processPromptWithFiverrContext(promptKey, additionalContext = {}) {
    try {
      // Extract context from current Fiverr page
      const context = await this.extractFiverrContext();

      // Merge with additional context
      const fullContext = { ...context, ...additionalContext };

      // Process the prompt
      return this.processPrompt(promptKey, fullContext);
    } catch (error) {
      console.error('Failed to process prompt with Fiverr context:', error);
      throw error;
    }
  }

  /**
   * Extract context variables from current Fiverr page
   */
  async extractFiverrContext() {
    const context = {};

    try {
      // Extract username from URL
      if (window.fiverrExtractor) {
        context.username = window.fiverrExtractor.extractUsernameFromUrl() || 'Client';

        // Extract conversation if available
        const conversationData = await window.fiverrExtractor.extractConversation();
        if (conversationData) {
          context.conversation = window.fiverrExtractor.conversationToContext(conversationData);
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
}

// Create global knowledge base manager
window.knowledgeBaseManager = new KnowledgeBaseManager();
