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
        prompt: `Go through this initial requirement

{conversation}

Write an appropriate initial reply under 2500 characters using below information

I am a freelancer who works on Fiverr

Use my background: {{bio}}
My services: {{services}}
Additional info: {{custom1}}

Portfolio: {{portfolio}}

Rules:
- Greet the client personally
- Show you understand their request
- Mention relevant experience or service
- Add relevant portfolio links which match to clients requirement
- Suggest next steps
- Keep it friendly and professional
- No markdown formatting, no explanations.`
      },
      'project_summary': {
        name: 'Project Summary',
        description: 'Analyze conversation and extract key details into a structured, concise summary',
        prompt: `Summarize this project:

{conversation}

Extract all important information like Budget, Timeline, Next Steps etc..

Need a well formatted reply under 3000 characters, no markdown formatting, no explanations.`
      },
      'follow_up_message': {
        name: 'Follow-up Message',
        description: 'Draft a concise and effective follow-up message to a client based on conversation history',
        prompt: `Write a follow-up message based on this conversation:

{conversation}

Purpose: {{custom1}}
My availability: {{custom2}}

Make it:
- Friendly and professional
- Reference something specific from our conversation
- Include clear next steps
- Mention availability if provided
- No markdown formatting, no explanations.`
      },
      'project_proposal': {
        name: 'Project Proposal',
        description: 'Transform raw notes into a clear, professional, and persuasive project proposal message',
        prompt: `Create a project proposal based on Conversation:

{conversation}

I am a freelancer who works on Fiverr

Use my background: {{bio}}
My services: {{services}}
Additional info: {{custom1}}

Portfolio: {{portfolio}}

Structure:
1. Personal greeting
2. Project understanding summary
3. Proposal details (scope, timeline, price)
4. Why I'm the right fit
5. Relevant portfolio examples/links
6. Clear next steps

Need a well formatted reply under 3000 characters, no markdown formatting, no explanations.`
      },
      'translate_message': {
        name: 'Translate Message',
        description: 'Translate message to specified language and explain it',
        prompt: `Translate this message to {{language}} and explain it along with the original language:

{conversation}

Write a well formatted reply. Provide only the final translated text, no explanations.`
      },
      'improve_and_translate': {
        name: 'Improve and Translate Message',
        description: 'Improve message and translate it to English',
        prompt: `Improve this message and translate it to English:

{conversation}

I am a freelancer who works on Fiverr, use this as a reference and add relevant information about me:

Use my background: {{bio}}
My services: {{services}}
Additional info: {{custom1}}

Portfolio: {{portfolio}}

Write a well formatted reply. no explanations.`
      },
      'improve_message': {
        name: 'Improve Message',
        description: 'Improve message quality, clarity, and impact',
        prompt: `Improve this message

{conversation} - could i know the correct things here? (the text we copied from Fiverr)

This is my history: {conversation}

Make it:
- Grammatically correct
- Clear and concise
- More {{custom1}} in tone
- Keep the same meaning

Write a well formatted reply, no explanations.`
      },
      'translate_message': {
        name: 'Translate Message',
        description: 'Translate a message to a specified language while maintaining context and tone',
        prompt: `Translate this message to {language}: {message}

Context: {conversation}

Keep the same tone and meaning. Provide only the translation.`
      },
      'summarize_message': {
        name: 'Summarize Message',
        description: 'Create a concise summary of a message highlighting key points',
        prompt: `Summarize this message: {message}

Context: {conversation}

Include:
- Main points
- Action items
- Key details

Format as bullet points. Keep it concise.`
      },
      'detailed_response': {
        name: 'Detailed Response',
        description: 'Generate a comprehensive, detailed response to a message or inquiry',
        prompt: `Create a detailed response to: {message}

Context: {conversation}
My expertise: {{services}}
My background: {{bio}}

Make it:
- Comprehensive and thorough
- Professional but approachable
- Include specific examples
- Provide actionable next steps
- Address all their points

Use plain text formatting.`
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
   * Get all prompts (default + custom)
   */
  getAllPrompts() {
    const defaultPrompts = this.getDefaultPrompts();
    const customPrompts = Object.fromEntries(this.customPrompts);
    return { ...defaultPrompts, ...customPrompts };
  }

  /**
   * Get default prompts (without saving them as custom)
   */
  getDefaultPrompts() {
    return {
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

**Generate a reply that:**
1.  **Addresses them by name** using {username}
2.  **Shows understanding** of their project based on {conversation}
3.  **Demonstrates expertise** by referencing relevant experience from {{bio}}
4.  **Highlights relevant services** from {{services}} that match their needs
5.  **Builds credibility** with a specific example or link from {{portfolio}}
6.  **Includes any custom context** from {{custom1}} if provided
7.  **Ends with a clear call-to-action** (e.g., "Would you like to discuss this further?" or "I'd be happy to provide a detailed proposal")

**Keep the tone:**
- Professional yet approachable
- Confident but not pushy
- Personalized to their specific needs
- Concise (aim for 3-4 short paragraphs)

Use plain text only, no markdown formatting.`
      },
      'project_summary': {
        name: 'Project Summary',
        description: 'Analyze conversation and extract key details into a structured, concise summary',
        prompt: `Analyze this Fiverr conversation and create a structured project summary: {conversation}

**Extract and organize these details:**

*   **Client Information:**
    *   Username: {username}
    *   Communication style and tone
    *   Apparent experience level with similar projects

*   **Project Overview:**
    *   Main goal or objective
    *   Type of work requested
    *   Industry or niche (if mentioned)

*   **Specific Requirements:**
    *   Detailed list of what they want delivered
    *   Technical specifications or preferences
    *   Style, format, or quality expectations

*   **Timeline & Budget:**
    *   Mentioned deadlines or urgency level
    *   Budget range or pricing discussions
    *   Flexibility on timing or scope

*   **Key Decisions Made:** A bulleted list of important agreements or changes confirmed.
*   **Budget & Pricing:** Any mention of financial agreements. State "Not discussed" if absent.
*   **Deadlines & Timeline:** Any specific dates or time frames mentioned. State "Not discussed" if absent.
*   **Next Action Items:** What needs to be done next, and by whom.

Use plain text only, no markdown formatting.`
      },
      'follow_up_message': {
        name: 'Follow-up Message',
        description: 'Draft a concise and effective follow-up message to a client based on conversation history',
        prompt: `Write a follow-up message based on this conversation: {conversation}

Purpose: {{custom1}}
My availability: {{custom2}}

Make it:
- Friendly and professional
- Reference something specific from our conversation
- Include clear next steps
- Mention availability if provided
- No markdown formatting`
      },
      'project_proposal': {
        name: 'Project Proposal',
        description: 'Transform raw notes into a clear, professional, and persuasive project proposal message',
        prompt: `Create a project proposal for {username} based on:

Conversation: {conversation}
Proposal details: {proposal}
My background: {{bio}}
Portfolio: {{portfolio}}

Structure:
1. Personal greeting
2. Project understanding summary
3. Proposal details (scope, timeline, price)
4. Why I'm the right fit
5. Relevant portfolio example
6. Clear next steps

Use plain text, no markdown formatting.`
      },
      'translate_and_explain': {
        name: 'Translate and Explain Message',
        description: 'Translate text and provide a simple explanation of its content',
        prompt: `Translate this message to {{language}} and explain it: {conversation}

Format your response as:

EXPLANATION:
Main goal: [What they want]
Key points: [Important details]
Tone: [Formal/informal/urgent/etc]

TRANSLATION:
[Full translation in {{language}}]

Use plain text only.`
      },
      'refine_and_translate': {
        name: 'Refine and Translate My Message',
        description: 'Refine draft message for clarity and professionalism, then translate to requested language',
        prompt: `Improve this message and translate it to {{language}}: {conversation}

Steps:
1. Fix grammar and make it more professional
2. Translate the improved version to {{language}}

Provide only the final translated text, no explanations.`
      },
      'refine_message': {
        name: 'Refine My Message (No Translation)',
        description: 'Refine draft message to improve quality, clarity, and impact without translation',
        prompt: `Improve this message to be {{custom1}}: {conversation}

Make it:
- Grammatically correct
- Clear and concise
- More {{custom1}} in tone
- Keep the same meaning

Provide only the improved message, no explanations.`
      }
    };
  }

  /**
   * Process prompt with variables and context
   */
  processPrompt(promptKey, context = {}) {
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
      // Determine optimal context type based on prompt
      const contextType = this.determineOptimalContextType(promptKey);

      // Extract context from current Fiverr page
      const context = await this.extractFiverrContext(contextType);

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
