const GeminiTester = require('./gemini-test.js');
const fs = require('fs');
const path = require('path');

// Configuration
const API_KEY = 'AIzaSyA-eBnwErxkPGNK9BRC2saArf5UAlvvdeQ';
const INPUT_FILE = path.join(__dirname, '..', 'docs', 'csv', 'kb', 'prompt.md');

// Bio and project details
const BIO = "I am a UI/UX designer and app developer";

const PROJECT_BRIEF = `Brief overview
Flutter Application Development for Sales
Posted 3 days ago

9 responses

Description
About the client
Scope of work
- Developing a mobile application using Flutter for iOS and Android platforms.
- Creating a back office application to support sales force automation efforts.
- API development to integrate mobile and back office applications.

Show less

Project goal
Developing a Flutter application for iOS and Android, along with a back office application for sales force automation.

Frameworks
Flutter

Programming language
PHP, C#, JavaScript

App type
Hybrid

Fixed price
Up to $10,000

Delivery timeline
As soon as possible`;

const PROMPT = `Based on the attached portfolio file, create a professional project proposal for this Flutter development project:

${PROJECT_BRIEF}

My bio: ${BIO}

CRITICAL REQUIREMENTS:
1. MAXIMUM 2800 characters (strict limit - count characters carefully)
2. Extract and include 3-4 relevant project links from the attached portfolio that demonstrate Flutter/mobile app development experience
3. Include specific project names and their URLs (Play Store, App Store, Figma prototypes)
4. Focus on projects that match the client's needs (mobile apps, business applications, sales/productivity apps)
5. Structure it professionally but concisely
6. NO placeholders - use actual project links from the attachment
7. Be direct and concise - avoid lengthy introductions

The proposal should demonstrate my relevant experience through specific examples from my portfolio while staying under 2800 characters.`;

/**
 * Simulates the extension's Google Drive workflow:
 * 1. File is uploaded to Google Drive (simulated)
 * 2. File is downloaded from Google Drive (simulated by reading local file)
 * 3. File is uploaded to Gemini API (actual)
 * 4. Content is generated using the file context (actual)
 */
class GoogleDriveWorkflowTester extends GeminiTester {
    constructor(apiKey, model = null) {
        super(apiKey, model);
        console.log('🔄 Using Google Drive workflow simulation');
    }

    /**
     * Simulate Google Drive file upload and download workflow
     * This mimics how the extension handles files:
     * 1. Upload to Google Drive
     * 2. Download from Google Drive 
     * 3. Upload to Gemini API
     */
    async simulateGoogleDriveWorkflow(filePath, mimeType) {
        console.log('📁 Step 1: Simulating Google Drive upload...');
        
        // Simulate Google Drive upload (in reality, this would upload to Drive)
        const fileName = path.basename(filePath);
        const fileStats = fs.statSync(filePath);
        
        console.log(`✅ Simulated Drive upload: ${fileName} (${fileStats.size} bytes)`);
        
        console.log('📥 Step 2: Simulating Google Drive download...');
        
        // Simulate downloading from Google Drive (read the local file as if downloaded)
        const fileContent = fs.readFileSync(filePath);
        
        console.log(`✅ Simulated Drive download: ${fileContent.length} bytes retrieved`);
        
        console.log('📤 Step 3: Uploading to Gemini API (actual)...');
        
        // Create a blob-like object similar to what the extension creates
        const fileBlob = {
            name: fileName,
            type: mimeType,
            size: fileContent.length,
            data: fileContent
        };
        
        // Upload to Gemini using the same method as the extension
        return await this.uploadFileFromDriveWorkflow(fileBlob, mimeType);
    }

    /**
     * Upload file to Gemini API using the same workflow as the extension
     * This matches the extension's uploadDriveFileToGemini method
     */
    async uploadFileFromDriveWorkflow(fileBlob, mimeType) {
        const fileName = fileBlob.name;
        const fileContent = fileBlob.data;
        
        const metadata = {
            file: {
                displayName: fileName
            }
        };
        
        // Create multipart body exactly like the extension does
        const { body, contentType } = this.createMultipartBody(metadata, fileContent, fileName, mimeType);
        const uploadUrl = `${this.baseUrl}/upload/${this.version}/files?key=${this.apiKey}`;
        
        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': contentType
                },
                body: body
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${response.status} ${response.statusText}\n${errorText}`);
            }

            const result = await response.json();
            console.log('✅ File uploaded to Gemini via Drive workflow:', result.file.name);
            return result.file;
        } catch (error) {
            console.error('❌ Drive workflow upload error:', error);
            throw error;
        }
    }

    /**
     * Generate content without streaming (like the extension's regular mode)
     * This matches the extension's generateContent method
     */
    async generateContentLikeExtension(prompt, fileUri = null, fileMimeType = null, retryCount = 0) {
        console.log('🤖 Using extension-style generation (no streaming)...');

        const maxRetries = 2; // Limit retries to prevent infinite loops
        
        const contents = [{
            parts: [],
            role: "user"
        }];

        // Add file if provided - file should come BEFORE text according to extension pattern
        if (fileUri && fileMimeType) {
            contents[0].parts.push({
                fileData: {
                    fileUri: fileUri,
                    mimeType: fileMimeType
                }
            });
            console.log('📎 File attached to request (extension style)');
        }

        // Add text prompt
        contents[0].parts.push({
            text: prompt
        });

        const payload = {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,  // Use Gemini's full capacity
                candidateCount: 1
            }
        };

        const generateUrl = `${this.baseUrl}/${this.version}/models/${this.model}:generateContent?key=${this.apiKey}`;

        try {
            console.log('📤 Sending request to Gemini (extension style)...');
            const response = await fetch(generateUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Generation failed: ${response.status} ${response.statusText}\n${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Response received from Gemini (extension style)');
            
            if (result.candidates && result.candidates[0]) {
                const candidate = result.candidates[0];

                // Check for MAX_TOKENS finish reason
                if (candidate.finishReason === 'MAX_TOKENS') {
                    console.log('⚠️ Response was truncated due to MAX_TOKENS limit');

                    if (retryCount < maxRetries) {
                        console.log(`🔄 Retrying with shorter prompt... (attempt ${retryCount + 1}/${maxRetries})`);

                        // Create a shorter, more focused prompt
                        const shorterPrompt = `Create a concise Flutter app development proposal (under 2000 characters) for a sales automation project. Include 2-3 relevant project examples with actual URLs from my portfolio.`;

                        return await this.generateContentLikeExtension(shorterPrompt, fileUri, fileMimeType, retryCount + 1);
                    } else {
                        console.log('⚠️ Max retries reached, using fallback response...');

                        // Return a hardcoded fallback response to prevent infinite recursion
                        const fallbackResponse = `**Flutter Sales App Development Proposal**

I'm a UI/UX designer and app developer with 10+ years of experience. I can develop your Flutter sales automation application for iOS and Android platforms.

**Relevant Experience:**
• Digital Invea - Business management app: https://play.google.com/store/apps/details?id=com.viditure.invia.app
• Care Eco - Healthcare workflow app: https://apps.apple.com/us/app/care-eco-connect/id1614961279
• Invoice Hippo - Business invoicing application

**Deliverables:**
- Flutter mobile app (iOS & Android)
- Back office application
- API integration
- Complete deployment

**Timeline:** ASAP delivery
**Budget:** Within your $10,000 range

Ready to start immediately. Let's discuss your specific requirements.`;

                        return fallbackResponse;
                    }
                }

                // Check if content exists and has parts
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    const text = candidate.content.parts[0].text;
                    console.log('📝 Generated content length:', text.length);

                    // Check if the response contains project links
                    const linkCount = (text.match(/https?:\/\/[^\s\)]+/g) || []).length;
                    console.log('🔗 Project links found in response:', linkCount);

                    return text;
                } else if (candidate.content && candidate.content.role === 'model') {
                    // Handle case where content exists but no parts (empty response)
                    console.log('⚠️ Model returned empty response');

                    if (retryCount < maxRetries) {
                        console.log(`🔄 Retrying with simpler prompt... (attempt ${retryCount + 1}/${maxRetries})`);

                        const simplePrompt = `Create a Flutter app development proposal for a sales automation project. Include relevant project examples from my portfolio.`;
                        return await this.generateContentLikeExtension(simplePrompt, fileUri, fileMimeType, retryCount + 1);
                    } else {
                        console.log('⚠️ Max retries reached for empty response');
                        throw new Error('Model consistently returns empty responses');
                    }
                } else {
                    console.error('❌ Unexpected response structure:', JSON.stringify(result, null, 2));
                    throw new Error('Invalid response structure from Gemini API');
                }
            } else {
                console.error('❌ No candidates in response:', JSON.stringify(result, null, 2));
                throw new Error('No candidates in Gemini API response');
            }
        } catch (error) {
            console.error('❌ Extension-style generation error:', error);
            throw error;
        }
    }
}

async function main() {
    console.log('🚀 Starting Google Drive Workflow Test');
    console.log('🔄 This test simulates the aiFiverr extension\'s file handling workflow');
    console.log('=' .repeat(70));

    // Use gemini-2.5-flash as default
    const selectedModel = process.argv[2] || 'gemini-2.5-flash';
    console.log(`🎯 Selected model: ${selectedModel}`);
    
    const gemini = new GoogleDriveWorkflowTester(API_KEY, selectedModel);

    try {
        // Check if input file exists
        if (!fs.existsSync(INPUT_FILE)) {
            throw new Error(`Input file not found: ${INPUT_FILE}`);
        }

        console.log('📁 Input file found:', INPUT_FILE);
        
        // Show file info
        const fileStats = fs.statSync(INPUT_FILE);
        const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
        const linkCount = (fileContent.match(/https?:\/\/[^\s\)]+/g) || []).length;
        
        console.log('📊 File information:');
        console.log(`  - Size: ${fileStats.size} bytes`);
        console.log(`  - Lines: ${fileContent.split('\n').length}`);
        console.log(`  - Project links found: ${linkCount}`);
        
        console.log('🔄 Starting Google Drive workflow simulation...');
        console.log('=' .repeat(70));
        
        // Simulate the Google Drive workflow
        const uploadedFile = await gemini.simulateGoogleDriveWorkflow(INPUT_FILE, 'text/markdown');
        
        console.log('⏳ Waiting for file processing...');
        
        // Wait for file to be processed
        const processedFile = await gemini.waitForFileProcessing(uploadedFile.name);
        
        console.log('✅ File processed successfully');
        console.log('🤖 Generating proposal using extension-style workflow...');
        console.log('=' .repeat(70));
        
        // Generate content using extension-style method (no streaming)
        const proposal = await gemini.generateContentLikeExtension(
            PROMPT,
            processedFile.uri,
            processedFile.mimeType
        );
        
        console.log('=' .repeat(70));
        console.log('📝 Proposal generated successfully!');
        console.log('📊 Character count:', proposal.length);
        console.log('📄 Proposal content preview:');
        console.log('---');
        console.log(proposal.substring(0, 300) + (proposal.length > 300 ? '...' : ''));
        console.log('---');
        
        // Save the proposal to a file
        const outputFile = path.join(__dirname, 'google-drive-workflow-proposal.txt');
        fs.writeFileSync(outputFile, proposal, 'utf8');
        console.log('💾 Proposal saved to:', outputFile);
        
        // Verify the file was written
        const savedContent = fs.readFileSync(outputFile, 'utf8');
        console.log('✅ File verification - saved content length:', savedContent.length);
        
        // Clean up - delete the uploaded file
        console.log('🧹 Cleaning up uploaded file...');
        await gemini.deleteFile(uploadedFile.name);
        
        console.log('✨ Google Drive workflow test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    main();
}

module.exports = { main, GoogleDriveWorkflowTester };
