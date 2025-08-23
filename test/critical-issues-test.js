/**
 * Critical Issues Test - Authentication and File Attachment
 * Tests the two critical issues reported by the user
 */

class CriticalIssuesTest {
  constructor() {
    this.testResults = [];
    this.authTestPassed = false;
    this.fileTestPassed = false;
  }

  /**
   * Run all critical issue tests
   */
  async runAllTests() {
    console.log('=== aiFiverr Critical Issues Test Started ===');
    
    try {
      // Test 1: Authentication persistence
      await this.testAuthenticationPersistence();
      
      // Test 2: File attachment with geminiUri
      await this.testFileAttachmentFlow();
      
      // Test 3: Complete user flow
      await this.testCompleteUserFlow();
      
      this.displayResults();
      
    } catch (error) {
      console.error('aiFiverr Test: Critical test failed:', error);
      this.addTestResult('Critical Test Suite', false, error.message);
    }
  }

  /**
   * Test authentication persistence and connection issues
   */
  async testAuthenticationPersistence() {
    console.log('=== Testing Authentication Persistence ===');
    
    try {
      // Test background script connection
      const connectionTest = await this.testBackgroundConnection();
      this.addTestResult('Background Script Connection', connectionTest.success, connectionTest.message);
      
      if (!connectionTest.success) {
        return;
      }
      
      // Test authentication status
      const authStatus = await this.testAuthenticationStatus();
      this.addTestResult('Authentication Status Check', authStatus.success, authStatus.message);
      
      // Test token retrieval
      const tokenTest = await this.testTokenRetrieval();
      this.addTestResult('Token Retrieval', tokenTest.success, tokenTest.message);
      
      this.authTestPassed = authStatus.success && tokenTest.success;
      
    } catch (error) {
      console.error('aiFiverr Test: Authentication test failed:', error);
      this.addTestResult('Authentication Test', false, error.message);
    }
  }

  /**
   * Test file attachment flow and geminiUri generation
   */
  async testFileAttachmentFlow() {
    console.log('=== Testing File Attachment Flow ===');
    
    try {
      // Test knowledge base manager availability
      if (!window.knowledgeBaseManager) {
        this.addTestResult('Knowledge Base Manager', false, 'Knowledge base manager not available');
        return;
      }
      
      // Test getting available files
      const availableFiles = window.knowledgeBaseManager.getAllAvailableFileReferences();
      this.addTestResult('Available Files Check', availableFiles.length > 0, `Found ${availableFiles.length} files`);
      
      if (availableFiles.length === 0) {
        this.addTestResult('File Attachment Test', false, 'No files available for testing');
        return;
      }
      
      // Test resolving files with geminiUri
      const testFiles = availableFiles.slice(0, 3); // Test first 3 files
      const resolvedFiles = await window.knowledgeBaseManager.resolveKnowledgeBaseFiles(testFiles);
      
      const filesWithGeminiUri = resolvedFiles.filter(file => file.geminiUri);
      const hasAllGeminiUris = filesWithGeminiUri.length === resolvedFiles.length;
      
      this.addTestResult(
        'File Resolution with geminiUri',
        hasAllGeminiUris,
        `Resolved ${resolvedFiles.length} files, ${filesWithGeminiUri.length} have geminiUri`
      );
      
      // Test API request construction
      if (resolvedFiles.length > 0) {
        const apiRequestTest = await this.testAPIRequestConstruction(resolvedFiles);
        this.addTestResult('API Request Construction', apiRequestTest.success, apiRequestTest.message);
      }
      
      this.fileTestPassed = hasAllGeminiUris && resolvedFiles.length > 0;
      
    } catch (error) {
      console.error('aiFiverr Test: File attachment test failed:', error);
      this.addTestResult('File Attachment Test', false, error.message);
    }
  }

  /**
   * Test complete user flow from text selection to AI response
   */
  async testCompleteUserFlow() {
    console.log('=== Testing Complete User Flow ===');
    
    try {
      if (!this.authTestPassed) {
        this.addTestResult('Complete User Flow', false, 'Authentication test failed - cannot proceed');
        return;
      }
      
      if (!this.fileTestPassed) {
        this.addTestResult('Complete User Flow', false, 'File attachment test failed - cannot proceed');
        return;
      }
      
      // Test prompt processing
      const promptTest = await this.testPromptProcessing();
      this.addTestResult('Prompt Processing', promptTest.success, promptTest.message);
      
      // Test Gemini client availability
      const geminiClientTest = this.testGeminiClient();
      this.addTestResult('Gemini Client', geminiClientTest.success, geminiClientTest.message);
      
      const completeFlowSuccess = promptTest.success && geminiClientTest.success;
      this.addTestResult('Complete User Flow', completeFlowSuccess, 
        completeFlowSuccess ? 'All components working' : 'Some components failed');
      
    } catch (error) {
      console.error('aiFiverr Test: Complete user flow test failed:', error);
      this.addTestResult('Complete User Flow', false, error.message);
    }
  }

  /**
   * Test background script connection
   */
  async testBackgroundConnection() {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response) => {
          if (chrome.runtime.lastError) {
            if (chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
              reject(new Error('Background script not responding - "Receiving end does not exist"'));
            } else {
              reject(new Error(chrome.runtime.lastError.message));
            }
          } else {
            resolve(response);
          }
        });
      });
      
      return { success: true, message: 'Background script connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Test authentication status
   */
  async testAuthenticationStatus() {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'GOOGLE_AUTH_STATUS' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (response && response.success) {
        return { 
          success: response.isAuthenticated, 
          message: response.isAuthenticated ? 
            `Authenticated as ${response.user?.email || 'unknown'}` : 
            'Not authenticated'
        };
      } else {
        return { success: false, message: response?.error || 'Auth status check failed' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Test token retrieval
   */
  async testTokenRetrieval() {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'GOOGLE_AUTH_TOKEN' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (response && response.success && response.token) {
        return { success: true, message: 'Token retrieved successfully' };
      } else {
        return { success: false, message: response?.error || 'No token available' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Test API request construction with files
   */
  async testAPIRequestConstruction(files) {
    try {
      if (!window.geminiClient) {
        return { success: false, message: 'Gemini client not available' };
      }
      
      const testPrompt = 'Test prompt for API request construction';
      const requestBody = window.geminiClient.buildRequestBody(testPrompt, {
        knowledgeBaseFiles: files
      });
      
      const hasFileData = requestBody.contents[0]?.parts?.some(part => part.fileData);
      const fileDataCount = requestBody.contents[0]?.parts?.filter(part => part.fileData)?.length || 0;
      
      return {
        success: hasFileData,
        message: `Request body constructed with ${fileDataCount} file attachments`
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Test prompt processing
   */
  async testPromptProcessing() {
    try {
      if (!window.knowledgeBaseManager) {
        return { success: false, message: 'Knowledge base manager not available' };
      }
      
      const result = await window.knowledgeBaseManager.processPrompt('summary', {
        conversation: 'Test conversation',
        username: 'TestUser'
      });
      
      const hasPrompt = !!(result && (typeof result === 'string' || result.prompt));
      const hasFiles = !!(result && result.knowledgeBaseFiles && result.knowledgeBaseFiles.length > 0);
      
      return {
        success: hasPrompt,
        message: `Prompt processed: ${hasPrompt}, Files attached: ${hasFiles}`
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Test Gemini client
   */
  testGeminiClient() {
    if (!window.geminiClient) {
      return { success: false, message: 'Gemini client not available' };
    }
    
    return { success: true, message: 'Gemini client available' };
  }

  /**
   * Add test result
   */
  addTestResult(testName, success, message) {
    this.testResults.push({
      name: testName,
      success,
      message,
      timestamp: new Date().toISOString()
    });
    
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`aiFiverr Test: ${status} - ${testName}: ${message}`);
  }

  /**
   * Display test results
   */
  displayResults() {
    console.log('=== aiFiverr Critical Issues Test Results ===');
    
    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    
    console.log(`Overall: ${passed}/${total} tests passed`);
    
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.message}`);
    });
    
    // Summary of critical issues
    console.log('\n=== Critical Issues Status ===');
    console.log(`Authentication Issue: ${this.authTestPassed ? '✅ FIXED' : '❌ NOT FIXED'}`);
    console.log(`File Attachment Issue: ${this.fileTestPassed ? '✅ FIXED' : '❌ NOT FIXED'}`);
    
    if (this.authTestPassed && this.fileTestPassed) {
      console.log('🎉 Both critical issues appear to be resolved!');
    } else {
      console.log('⚠️  Critical issues still need attention');
    }
  }
}

// Auto-run test when loaded
if (typeof window !== 'undefined') {
  window.criticalIssuesTest = new CriticalIssuesTest();
  
  // Run test after a short delay to ensure all components are loaded
  setTimeout(() => {
    window.criticalIssuesTest.runAllTests();
  }, 2000);
}
