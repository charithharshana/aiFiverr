// Test script to verify knowledge base file attachment functionality
// This script should be run in the browser console on a Fiverr page

(async function testKnowledgeBaseAttachment() {
  console.log('=== TESTING KNOWLEDGE BASE FILE ATTACHMENT ===');
  
  try {
    // 1. Check if required components are available
    console.log('1. Checking required components...');
    
    if (!window.knowledgeBaseManager) {
      console.error('❌ Knowledge base manager not available');
      return;
    }
    console.log('✅ Knowledge base manager available');
    
    if (!window.geminiClient) {
      console.error('❌ Gemini client not available');
      return;
    }
    console.log('✅ Gemini client available');
    
    // 2. Check knowledge base files
    console.log('2. Checking knowledge base files...');
    const allFiles = window.knowledgeBaseManager.getAllFileReferences();
    console.log('Available files:', allFiles);
    
    const filesWithGeminiUri = Object.values(allFiles).filter(file => file.geminiUri);
    console.log('Files with Gemini URI:', filesWithGeminiUri);
    
    if (filesWithGeminiUri.length === 0) {
      console.warn('⚠️ No files with Gemini URI found. Please upload a file first.');
      return;
    }
    
    // 3. Test prompt processing
    console.log('3. Testing prompt processing...');
    
    // Create a test prompt with knowledge base files
    const testPromptKey = 'test_kb_prompt';
    const testPrompt = {
      name: 'Test KB Prompt',
      description: 'Test prompt with knowledge base files',
      prompt: 'Please analyze the attached knowledge base file and tell me what information it contains. Conversation: {conversation}',
      knowledgeBaseFiles: [
        {
          id: Object.keys(allFiles)[0], // Use first available file
          name: Object.values(allFiles)[0].name
        }
      ]
    };
    
    // Save test prompt
    window.knowledgeBaseManager.customPrompts.set(testPromptKey, testPrompt);
    
    // Process the prompt
    const result = await window.knowledgeBaseManager.processPrompt(testPromptKey, {
      conversation: 'This is a test conversation to verify knowledge base file attachment.'
    });
    
    console.log('Processed prompt result:', result);
    
    if (result.knowledgeBaseFiles && result.knowledgeBaseFiles.length > 0) {
      console.log('✅ Knowledge base files resolved:', result.knowledgeBaseFiles);
      
      // Check if files have geminiUri
      const filesWithUri = result.knowledgeBaseFiles.filter(file => file.geminiUri);
      if (filesWithUri.length > 0) {
        console.log('✅ Files have Gemini URI:', filesWithUri.map(f => f.geminiUri));
        
        // 4. Test API request construction
        console.log('4. Testing API request construction...');
        
        // Create a session for testing
        const session = await window.sessionManager.getOrCreateSession('test_kb');
        
        // Test the API call
        try {
          const response = await window.geminiClient.generateChatReply(
            session, 
            result.prompt, 
            { knowledgeBaseFiles: result.knowledgeBaseFiles }
          );
          
          console.log('✅ API call successful!');
          console.log('Response:', response.response.substring(0, 200) + '...');
          
          // Check if response mentions the knowledge base content
          if (response.response.toLowerCase().includes('aifiverr') || 
              response.response.toLowerCase().includes('test knowledge base')) {
            console.log('🎉 SUCCESS: Knowledge base file content appears in response!');
          } else {
            console.log('⚠️ WARNING: Knowledge base content may not be included in response');
          }
          
        } catch (apiError) {
          console.error('❌ API call failed:', apiError);
        }
        
      } else {
        console.error('❌ No files with Gemini URI found after resolution');
      }
    } else {
      console.error('❌ No knowledge base files resolved');
    }
    
    // Cleanup
    window.knowledgeBaseManager.customPrompts.delete(testPromptKey);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.log('=== TEST COMPLETE ===');
})();
