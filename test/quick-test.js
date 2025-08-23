/**
 * Quick Test for Critical Issues
 * Run this in browser console to test the fixes
 */

window.runQuickTest = async function() {
  console.log('🚀 aiFiverr Quick Test Started');
  
  const results = {
    backgroundConnection: false,
    authentication: false,
    fileAttachment: false,
    overallSuccess: false
  };
  
  try {
    // Test 1: Background Script Connection
    console.log('\n1️⃣ Testing Background Script Connection...');
    try {
      const pingResponse = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (pingResponse && pingResponse.success) {
        console.log('✅ Background script connection: SUCCESS');
        results.backgroundConnection = true;
      } else {
        console.log('❌ Background script connection: FAILED - No response');
      }
    } catch (error) {
      console.log('❌ Background script connection: FAILED -', error.message);
      if (error.message.includes('Receiving end does not exist')) {
        console.log('   🔍 This is the "Receiving end does not exist" error!');
      }
    }
    
    // Test 2: Authentication Status
    console.log('\n2️⃣ Testing Authentication...');
    try {
      const authResponse = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'GOOGLE_AUTH_STATUS' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (authResponse && authResponse.success) {
        if (authResponse.isAuthenticated) {
          console.log('✅ Authentication: SUCCESS - Authenticated as', authResponse.user?.email || 'unknown');
          results.authentication = true;
        } else {
          console.log('⚠️  Authentication: Not authenticated (but connection works)');
          console.log('   💡 Try signing in through the extension popup');
        }
      } else {
        console.log('❌ Authentication: FAILED -', authResponse?.error || 'Unknown error');
      }
    } catch (error) {
      console.log('❌ Authentication: FAILED -', error.message);
    }
    
    // Test 3: File Attachment
    console.log('\n3️⃣ Testing File Attachment...');
    try {
      if (!window.knowledgeBaseManager) {
        console.log('❌ File Attachment: FAILED - Knowledge base manager not available');
      } else {
        const availableFiles = window.knowledgeBaseManager.getAllAvailableFileReferences();
        console.log(`   📁 Found ${availableFiles.length} available files`);
        
        if (availableFiles.length === 0) {
          console.log('⚠️  File Attachment: No files to test');
          console.log('   💡 Upload some files through the extension popup first');
        } else {
          // Test resolving first file
          const testFile = availableFiles[0];
          console.log('   🔍 Testing file resolution for:', testFile.name);
          
          const resolvedFiles = await window.knowledgeBaseManager.resolveKnowledgeBaseFiles([testFile]);
          
          if (resolvedFiles.length > 0 && resolvedFiles[0].geminiUri) {
            console.log('✅ File Attachment: SUCCESS - File has geminiUri:', resolvedFiles[0].geminiUri.substring(0, 50) + '...');
            results.fileAttachment = true;
          } else {
            console.log('❌ File Attachment: FAILED - File missing geminiUri');
            console.log('   🔍 This is the geminiUri issue!');
          }
        }
      }
    } catch (error) {
      console.log('❌ File Attachment: FAILED -', error.message);
    }
    
    // Test 4: Complete Flow Test
    console.log('\n4️⃣ Testing Complete Flow...');
    try {
      if (results.backgroundConnection && window.knowledgeBaseManager && window.geminiClient) {
        // Test prompt processing
        const promptResult = await window.knowledgeBaseManager.processPrompt('summary', {
          conversation: 'Test conversation for quick test',
          username: 'TestUser'
        });
        
        const hasPrompt = !!(promptResult && (typeof promptResult === 'string' || promptResult.prompt));
        const hasFiles = !!(promptResult && promptResult.knowledgeBaseFiles && promptResult.knowledgeBaseFiles.length > 0);
        
        console.log(`   📝 Prompt processing: ${hasPrompt ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   📎 Files attached: ${hasFiles ? promptResult.knowledgeBaseFiles.length : 0}`);
        
        if (hasPrompt) {
          console.log('✅ Complete Flow: Components working correctly');
        } else {
          console.log('❌ Complete Flow: Some components failed');
        }
      } else {
        console.log('❌ Complete Flow: Prerequisites not met');
      }
    } catch (error) {
      console.log('❌ Complete Flow: FAILED -', error.message);
    }
    
    // Overall Results
    console.log('\n📊 QUICK TEST RESULTS:');
    console.log('========================');
    console.log(`Background Connection: ${results.backgroundConnection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Authentication: ${results.authentication ? '✅ PASS' : '⚠️  NOT AUTHENTICATED'}`);
    console.log(`File Attachment: ${results.fileAttachment ? '✅ PASS' : '❌ FAIL'}`);
    
    results.overallSuccess = results.backgroundConnection && (results.authentication || results.fileAttachment);
    
    if (results.overallSuccess) {
      console.log('\n🎉 OVERALL: CRITICAL ISSUES APPEAR TO BE FIXED!');
    } else {
      console.log('\n⚠️  OVERALL: CRITICAL ISSUES STILL NEED ATTENTION');
      
      if (!results.backgroundConnection) {
        console.log('   🔧 Fix needed: Background script connection ("Receiving end does not exist")');
      }
      if (!results.fileAttachment) {
        console.log('   🔧 Fix needed: File attachment (geminiUri missing)');
      }
    }
    
    console.log('\n💡 To run this test again, type: runQuickTest()');
    
    return results;
    
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return results;
  }
};

// Auto-run if in browser
if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime) {
  console.log('🔧 aiFiverr Quick Test loaded. Run runQuickTest() to test the fixes.');
}
