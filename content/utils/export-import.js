/**
 * Export/Import Manager
 * Handles comprehensive data export/import for cross-browser compatibility
 */

class ExportImportManager {
  constructor() {
    this.supportedFormats = ['json', 'csv', 'markdown'];
    this.exportVersion = '1.0.0';
  }

  /**
   * Export all data
   */
  async exportAllData(format = 'json') {
    try {
      const exportData = {
        version: this.exportVersion,
        timestamp: Date.now(),
        exportedAt: new Date().toISOString(),
        format: format,
        data: {}
      };

      // Export sessions
      exportData.data.sessions = await this.exportSessions();
      
      // Export settings
      exportData.data.settings = await this.exportSettings();
      
      // Export knowledge base
      exportData.data.knowledgeBase = await this.exportKnowledgeBase();
      
      // Export API keys (encrypted)
      exportData.data.apiKeys = await this.exportApiKeys();
      
      // Export statistics
      exportData.data.statistics = await this.exportStatistics();

      return this.formatExportData(exportData, format);
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export data');
    }
  }

  /**
   * Export sessions only
   */
  async exportSessions(format = 'json') {
    try {
      const sessions = await sessionManager.getAllSessions();
      const exportData = {
        version: this.exportVersion,
        timestamp: Date.now(),
        type: 'sessions',
        sessions: sessions.map(session => session.export())
      };

      return this.formatExportData(exportData, format);
    } catch (error) {
      console.error('Session export failed:', error);
      throw new Error('Failed to export sessions');
    }
  }

  /**
   * Export settings
   */
  async exportSettings() {
    try {
      const settings = await storageManager.getSettings();
      return {
        ...settings,
        exportedAt: Date.now()
      };
    } catch (error) {
      console.error('Settings export failed:', error);
      return {};
    }
  }

  /**
   * Export knowledge base
   */
  async exportKnowledgeBase() {
    try {
      const knowledgeBase = await storageManager.getKnowledgeBase();
      return {
        items: knowledgeBase,
        exportedAt: Date.now()
      };
    } catch (error) {
      console.error('Knowledge base export failed:', error);
      return { items: {} };
    }
  }

  /**
   * Export API keys (with basic encryption)
   */
  async exportApiKeys() {
    try {
      const settings = await storageManager.getSettings();
      const apiKeys = settings.apiKeys || [];
      
      // Basic obfuscation for security
      const obfuscatedKeys = apiKeys.map(key => this.obfuscateApiKey(key));
      
      return {
        keys: obfuscatedKeys,
        count: apiKeys.length,
        exportedAt: Date.now()
      };
    } catch (error) {
      console.error('API keys export failed:', error);
      return { keys: [], count: 0 };
    }
  }

  /**
   * Export usage statistics
   */
  async exportStatistics() {
    try {
      const keyStats = apiKeyManager.getKeyStats();
      const sessions = await sessionManager.getAllSessions();
      
      const sessionStats = {
        totalSessions: sessions.length,
        totalMessages: sessions.reduce((sum, s) => sum + s.metadata.messageCount, 0),
        averageSessionLength: sessions.length > 0 ? 
          sessions.reduce((sum, s) => sum + s.metadata.messageCount, 0) / sessions.length : 0
      };

      return {
        apiKeys: keyStats,
        sessions: sessionStats,
        exportedAt: Date.now()
      };
    } catch (error) {
      console.error('Statistics export failed:', error);
      return {};
    }
  }

  /**
   * Format export data based on format
   */
  formatExportData(data, format) {
    switch (format.toLowerCase()) {
      case 'json':
        return {
          content: JSON.stringify(data, null, 2),
          filename: `aifiverr-export-${Date.now()}.json`,
          mimeType: 'application/json'
        };
      
      case 'csv':
        return this.formatAsCSV(data);
      
      case 'markdown':
        return this.formatAsMarkdown(data);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Format data as CSV
   */
  formatAsCSV(data) {
    let csv = '';
    
    // Export sessions as CSV
    if (data.data?.sessions) {
      csv += 'Session Export\n';
      csv += 'Session ID,Title,Created,Last Updated,Message Count,Total Characters\n';
      
      data.data.sessions.forEach(session => {
        const stats = this.calculateSessionStats(session);
        csv += `"${session.sessionId}","${session.metadata.title}","${new Date(session.metadata.created).toISOString()}","${new Date(session.metadata.lastUpdated).toISOString()}",${session.metadata.messageCount},${stats.totalCharacters}\n`;
      });
      
      csv += '\n\nMessages Export\n';
      csv += 'Session ID,Role,Content,Timestamp\n';
      
      data.data.sessions.forEach(session => {
        session.messages.forEach(message => {
          csv += `"${session.sessionId}","${message.role}","${message.content.replace(/"/g, '""')}","${new Date(message.timestamp).toISOString()}"\n`;
        });
      });
    }

    return {
      content: csv,
      filename: `aifiverr-export-${Date.now()}.csv`,
      mimeType: 'text/csv'
    };
  }

  /**
   * Format data as Markdown
   */
  formatAsMarkdown(data) {
    let markdown = `# aiFiverr Export\n\n`;
    markdown += `**Exported:** ${new Date(data.timestamp).toLocaleString()}\n`;
    markdown += `**Version:** ${data.version}\n\n`;

    // Export sessions
    if (data.data?.sessions) {
      markdown += `## Chat Sessions (${data.data.sessions.length})\n\n`;
      
      data.data.sessions.forEach(session => {
        markdown += `### ${session.metadata.title}\n\n`;
        markdown += `- **Created:** ${new Date(session.metadata.created).toLocaleString()}\n`;
        markdown += `- **Last Updated:** ${new Date(session.metadata.lastUpdated).toLocaleString()}\n`;
        markdown += `- **Messages:** ${session.metadata.messageCount}\n\n`;
        
        if (session.messages && session.messages.length > 0) {
          markdown += `#### Conversation\n\n`;
          session.messages.forEach(message => {
            const time = new Date(message.timestamp).toLocaleString();
            markdown += `**${message.role}** (${time}):\n${message.content}\n\n`;
          });
        }
        
        markdown += `---\n\n`;
      });
    }

    // Export knowledge base
    if (data.data?.knowledgeBase?.items) {
      markdown += `## Knowledge Base\n\n`;
      Object.entries(data.data.knowledgeBase.items).forEach(([key, value]) => {
        markdown += `- **${key}:** ${value}\n`;
      });
      markdown += `\n`;
    }

    return {
      content: markdown,
      filename: `aifiverr-export-${Date.now()}.md`,
      mimeType: 'text/markdown'
    };
  }

  /**
   * Import data from file
   */
  async importData(fileContent, options = {}) {
    try {
      let importData;
      
      // Try to parse as JSON
      try {
        importData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error('Invalid import file format. Please provide a valid JSON export file.');
      }

      // Validate import data
      if (!this.validateImportData(importData)) {
        throw new Error('Invalid import data structure');
      }

      // Check version compatibility
      if (!this.isVersionCompatible(importData.version)) {
        if (!options.forceImport) {
          throw new Error(`Incompatible export version: ${importData.version}. Current version: ${this.exportVersion}`);
        }
      }

      const results = {
        sessions: 0,
        settings: false,
        knowledgeBase: false,
        apiKeys: 0,
        errors: []
      };

      // Import sessions
      if (importData.data?.sessions) {
        try {
          results.sessions = await this.importSessions(importData.data.sessions);
        } catch (error) {
          results.errors.push(`Session import failed: ${error.message}`);
        }
      }

      // Import settings
      if (importData.data?.settings) {
        try {
          await this.importSettings(importData.data.settings);
          results.settings = true;
        } catch (error) {
          results.errors.push(`Settings import failed: ${error.message}`);
        }
      }

      // Import knowledge base
      if (importData.data?.knowledgeBase) {
        try {
          await this.importKnowledgeBase(importData.data.knowledgeBase);
          results.knowledgeBase = true;
        } catch (error) {
          results.errors.push(`Knowledge base import failed: ${error.message}`);
        }
      }

      // Import API keys
      if (importData.data?.apiKeys && options.importApiKeys) {
        try {
          results.apiKeys = await this.importApiKeys(importData.data.apiKeys);
        } catch (error) {
          results.errors.push(`API keys import failed: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  /**
   * Import sessions
   */
  async importSessions(sessionsData) {
    let importedCount = 0;
    
    for (const sessionData of sessionsData) {
      try {
        const session = new ChatSession(sessionData.sessionId);
        session.messages = sessionData.messages || [];
        session.context = sessionData.context || '';
        session.metadata = sessionData.metadata || {};
        
        await session.save();
        importedCount++;
      } catch (error) {
        console.error(`Failed to import session ${sessionData.sessionId}:`, error);
      }
    }
    
    return importedCount;
  }

  /**
   * Import settings
   */
  async importSettings(settingsData) {
    // Merge with existing settings, preserving API keys unless explicitly importing
    const currentSettings = await storageManager.getSettings();
    const mergedSettings = {
      ...currentSettings,
      ...settingsData,
      apiKeys: currentSettings.apiKeys // Preserve existing API keys
    };
    
    await storageManager.saveSettings(mergedSettings);
  }

  /**
   * Import knowledge base
   */
  async importKnowledgeBase(knowledgeBaseData) {
    if (knowledgeBaseData.items) {
      await storageManager.saveKnowledgeBase(knowledgeBaseData.items);
    }
  }

  /**
   * Import API keys
   */
  async importApiKeys(apiKeysData) {
    if (!apiKeysData.keys || !Array.isArray(apiKeysData.keys)) {
      return 0;
    }
    
    // Deobfuscate keys
    const deobfuscatedKeys = apiKeysData.keys.map(key => this.deobfuscateApiKey(key));
    
    // Update API keys
    await apiKeyManager.updateKeys(deobfuscatedKeys);
    
    return deobfuscatedKeys.length;
  }

  /**
   * Validate import data structure
   */
  validateImportData(data) {
    return data && 
           typeof data === 'object' && 
           data.version && 
           data.data && 
           typeof data.data === 'object';
  }

  /**
   * Check version compatibility
   */
  isVersionCompatible(version) {
    // For now, accept all versions starting with "1."
    return version && version.startsWith('1.');
  }

  /**
   * Basic API key obfuscation
   */
  obfuscateApiKey(key) {
    if (!key || key.length < 8) return key;
    
    const start = key.substring(0, 4);
    const end = key.substring(key.length - 4);
    const middle = '*'.repeat(key.length - 8);
    
    return start + middle + end;
  }

  /**
   * Basic API key deobfuscation (placeholder - in real implementation, use proper encryption)
   */
  deobfuscateApiKey(obfuscatedKey) {
    // In a real implementation, this would decrypt properly encrypted keys
    // For now, return as-is since we're just doing basic obfuscation
    return obfuscatedKey;
  }

  /**
   * Calculate session statistics
   */
  calculateSessionStats(session) {
    const totalCharacters = session.messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const userMessages = session.messages.filter(msg => msg.role === 'user').length;
    const assistantMessages = session.messages.filter(msg => msg.role === 'assistant').length;
    
    return {
      totalCharacters,
      userMessages,
      assistantMessages,
      averageMessageLength: session.messages.length > 0 ? totalCharacters / session.messages.length : 0
    };
  }

  /**
   * Download export data as file
   */
  downloadExport(exportData) {
    const blob = new Blob([exportData.content], { type: exportData.mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = exportData.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Read file content
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

// Create global export/import manager
window.exportImportManager = new ExportImportManager();
