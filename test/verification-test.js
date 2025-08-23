/**
 * Verification Test for aiFiverr Extension Fixes
 * Tests the complete flow from file upload to API request with attached files
 */

class VerificationTest {
  constructor() {
    this.testResults = [];
    this.testFiles = [
      { name: 'test-prompt.txt', content: 'This is a test prompt file for verification.', type: 'text/plain' },
      { name: 'test-data.csv', content: 'name,value\ntest1,100\ntest2,200', type: 'text/csv' },
      { name: 'test-code.py', content: 'print("Hello from Python test file")', type: 'text/x-python' }
    ];
  }

  /**
   * Run all verification tests
   */
  async runAllTests() {
    console.log('=== aiFiverr Extension Verification Tests Started ===');
    
    try {
      // Test 1: Check if all required managers are available
      await this.testManagerAvailability();
      
      // Test 2: Test file type support
      await this.testFileTypeSupport();
      
      // Test 3: Test authentication persistence
      await this.testAuthenticationPersistence();
      
      // Test 4: Test knowledge base file resolution
      await this.testKnowledgeBaseFileResolution();
      
      // Test 5: Test complete text selection flow
      await this.testTextSelectionFlow();
      
      // Test 6: Test API request construction
      await this.testAPIRequestConstruction();
      
      this.printTestResults();
      
    } catch (error) {
      console.error('aiFiverr Test: Verification tests failed:', error);
      this.addTestResult('Overall Test Suite', false, error.message);
    }
  }

  /**
   * Test if all required managers are available
   */
  async testManagerAvailability() {
    console.log('aiFiverr Test: Testing manager availability...');
    
    const requiredManagers = [
      'storageManager',
      'sessionManager',
      'knowledgeBaseManager',
      'geminiClient',
      'promptManager',
      'googleAuthService'
    ];
    
    let allAvailable = true;
    const missingManagers = [];
    
    for (const manager of requiredManagers) {
      if (!window[manager]) {
        allAvailable = false;
        missingManagers.push(manager);
      }
    }
    
    this.addTestResult(
      'Manager Availability',
      allAvailable,
      allAvailable ? 'All required managers are available' : `Missing managers: ${missingManagers.join(', ')}`
    );
  }

  /**
   * Test file type support
   */
  async testFileTypeSupport() {
    console.log('aiFiverr Test: Testing file type support...');
    
    if (!window.geminiFilesClient) {
      this.addTestResult('File Type Support', false, 'GeminiFilesClient not available');
      return;
    }
    
    const testFileTypes = [
      { ext: 'txt', mime: 'text/plain' },
      { ext: 'pdf', mime: 'application/pdf' },
      { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { ext: 'csv', mime: 'text/csv' },
      { ext: 'py', mime: 'text/x-python' },
      { ext: 'jpg', mime: 'image/jpeg' },
      { ext: 'mp4', mime: 'video/mp4' },
      { ext: 'mp3', mime: 'audio/mpeg' }
    ];
    
    let supportedCount = 0;
    const unsupportedTypes = [];
    
    for (const fileType of testFileTypes) {
      const isSupported = window.geminiFilesClient.isSupportedFileType(fileType.mime);
      if (isSupported) {
        supportedCount++;
      } else {
        unsupportedTypes.push(`${fileType.ext} (${fileType.mime})`);
      }
    }
    
    const allSupported = supportedCount === testFileTypes.length;
    this.addTestResult(
      'File Type Support',
      allSupported,
      allSupported ? `All ${testFileTypes.length} test file types are supported` : `Unsupported types: ${unsupportedTypes.join(', ')}`
    );
  }

  /**
   * Test authentication persistence
   */
  async testAuthenticationPersistence() {
    console.log('aiFiverr Test: Testing authentication persistence...');
    
    if (!window.googleAuthService) {
      this.addTestResult('Authentication Persistence', false, 'GoogleAuthService not available');
      return;
    }
    
    try {
      const authService = window.googleAuthService;
      const isInitialized = authService.initialized;
      const hasStoredAuth = !!(authService.accessToken && authService.tokenExpiry);
      const isAuthenticated = authService.isAuthenticated;
      
      this.addTestResult(
        'Authentication Persistence',
        isInitialized,
        `Initialized: ${isInitialized}, Has stored auth: ${hasStoredAuth}, Is authenticated: ${isAuthenticated}`
      );
    } catch (error) {
      this.addTestResult('Authentication Persistence', false, error.message);
    }
  }

  /**
   * Test knowledge base file resolution
   */
  async testKnowledgeBaseFileResolution() {
    console.log('aiFiverr Test: Testing knowledge base file resolution...');
    
    if (!window.knowledgeBaseManager) {
      this.addTestResult('Knowledge Base File Resolution', false, 'KnowledgeBaseManager not available');
      return;
    }
    
    try {
      const kbManager = window.knowledgeBaseManager;
      
      // Test getting all available file references
      const allFiles = kbManager.getAllAvailableFileReferences();
      console.log('aiFiverr Test: Available file references:', allFiles.length);
      
      // Test resolving file references
      const resolvedFiles = await kbManager.resolveKnowledgeBaseFiles(allFiles.slice(0, 3)); // Test first 3 files
      console.log('aiFiverr Test: Resolved files:', resolvedFiles.length);
      
      const hasGeminiUris = resolvedFiles.every(file => !!file.geminiUri);
      
      this.addTestResult(
        'Knowledge Base File Resolution',
        true,
        `Available files: ${allFiles.length}, Resolved files: ${resolvedFiles.length}, All have geminiUri: ${hasGeminiUris}`
      );
    } catch (error) {
      this.addTestResult('Knowledge Base File Resolution', false, error.message);
    }
  }

  /**
   * Test text selection flow
   */
  async testTextSelectionFlow() {
    console.log('aiFiverr Test: Testing text selection flow...');
    
    if (!window.knowledgeBaseManager || !window.promptManager) {
      this.addTestResult('Text Selection Flow', false, 'Required managers not available');
      return;
    }
    
    try {
      const testText = 'This is a test conversation for verification purposes.';
      const testPromptKey = 'summary';
      
      // Test prompt processing
      const result = await window.knowledgeBaseManager.processPrompt(testPromptKey, {
        conversation: testText,
        username: 'TestUser'
      });
      
      const hasPrompt = !!(result && result.prompt);
      const hasFiles = !!(result && result.knowledgeBaseFiles);
      const fileCount = result?.knowledgeBaseFiles?.length || 0;
      
      this.addTestResult(
        'Text Selection Flow',
        hasPrompt,
        `Prompt processed: ${hasPrompt}, Has files: ${hasFiles}, File count: ${fileCount}`
      );
    } catch (error) {
      this.addTestResult('Text Selection Flow', false, error.message);
    }
  }

  /**
   * Test API request construction
   */
  async testAPIRequestConstruction() {
    console.log('aiFiverr Test: Testing API request construction...');
    
    if (!window.geminiClient) {
      this.addTestResult('API Request Construction', false, 'GeminiClient not available');
      return;
    }
    
    try {
      const testPrompt = 'Test prompt for API request construction';
      const testFiles = [
        {
          name: 'test-file.txt',
          mimeType: 'text/plain',
          geminiUri: 'https://generativelanguage.googleapis.com/v1beta/files/test-file-uri'
        }
      ];
      
      // Test building request body
      const requestBody = window.geminiClient.buildRequestBody(testPrompt, {
        knowledgeBaseFiles: testFiles
      });
      
      const hasContents = !!(requestBody && requestBody.contents);
      const hasFileData = requestBody?.contents?.[0]?.parts?.some(part => part.fileData);
      const fileDataCount = requestBody?.contents?.[0]?.parts?.filter(part => part.fileData)?.length || 0;
      
      this.addTestResult(
        'API Request Construction',
        hasContents && hasFileData,
        `Has contents: ${hasContents}, Has file data: ${hasFileData}, File data parts: ${fileDataCount}`
      );
    } catch (error) {
      this.addTestResult('API Request Construction', false, error.message);
    }
  }

  /**
   * Add test result
   */
  addTestResult(testName, passed, details) {
    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`aiFiverr Test: ${status} - ${testName}: ${details}`);
  }

  /**
   * Print test results summary
   */
  printTestResults() {
    console.log('=== aiFiverr Extension Verification Test Results ===');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(result => result.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (failedTests > 0) {
      console.log('\nFailed Tests:');
      this.testResults
        .filter(result => !result.passed)
        .forEach(result => {
          console.log(`- ${result.name}: ${result.details}`);
        });
    }
    
    console.log('\nDetailed Results:', this.testResults);
    console.log('=== Verification Tests Complete ===');
  }
}

// Auto-run tests when loaded
if (typeof window !== 'undefined') {
  window.VerificationTest = VerificationTest;
  
  // Run tests after a short delay to ensure all managers are loaded
  setTimeout(() => {
    const test = new VerificationTest();
    test.runAllTests();
  }, 5000);
}
