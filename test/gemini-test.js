const fs = require('fs');
const path = require('path');

class GeminiTester {
    constructor(apiKey, model = null) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com';
        this.model = model || this.selectModel();
        this.version = 'v1beta';
        console.log(`🤖 Using model: ${this.model}`);
    }

    selectModel() {
        const availableModels = [
            'gemini-2.5-flash',  // Default - more stable and faster
            'gemini-2.5-pro',
            'gemini-2.0-flash'
        ];

        console.log('📋 Available models:');
        availableModels.forEach((model, index) => {
            console.log(`  ${index + 1}. ${model}`);
        });

        // Use gemini-2.5-flash as default to avoid rate limits
        const selectedModel = 'gemini-2.5-flash';
        console.log(`✅ Selected model: ${selectedModel} (default for rate limit avoidance)`);
        return selectedModel;
    }

    createMultipartBody(metadata, fileContent, fileName, mimeType) {
        const boundary = '----formdata-boundary-' + Math.random().toString(36);
        const CRLF = '\r\n';

        let body = '';

        // Add metadata part
        body += `--${boundary}${CRLF}`;
        body += `Content-Disposition: form-data; name="metadata"${CRLF}`;
        body += `Content-Type: application/json${CRLF}${CRLF}`;
        body += JSON.stringify(metadata) + CRLF;

        // Add file part
        body += `--${boundary}${CRLF}`;
        body += `Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}`;
        body += `Content-Type: ${mimeType}${CRLF}${CRLF}`;

        // Convert body to buffer and append file content
        const bodyBuffer = Buffer.from(body, 'utf8');
        const endBuffer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8');

        return {
            body: Buffer.concat([bodyBuffer, fileContent, endBuffer]),
            contentType: `multipart/form-data; boundary=${boundary}`
        };
    }

    async uploadFile(filePath, mimeType) {
        const fileContent = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);

        const metadata = {
            file: {
                displayName: fileName
            }
        };

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
            console.log('File uploaded successfully:', result.file.name);
            return result.file;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    async waitForFileProcessing(fileName, maxWaitTime = 60000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const fileUrl = `${this.baseUrl}/${this.version}/${fileName}?key=${this.apiKey}`;
                const response = await fetch(fileUrl);
                
                if (response.ok) {
                    const fileInfo = await response.json();
                    if (fileInfo.state === 'ACTIVE') {
                        console.log('File is ready for use');
                        return fileInfo;
                    }
                    console.log(`File state: ${fileInfo.state}, waiting...`);
                }
            } catch (error) {
                console.log('Checking file status...');
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        throw new Error('File processing timeout');
    }

    async generateContent(prompt, fileUri = null, fileMimeType = null, retryCount = 0) {
        console.log('🤖 Using regular generation...');

        const maxRetries = 3;
        const retryDelay = 2000; // 2 seconds

        const contents = [{
            parts: [],
            role: "user"
        }];

        // Add file if provided - file should come BEFORE text according to Gemini docs
        if (fileUri && fileMimeType) {
            contents[0].parts.push({
                fileData: {
                    fileUri: fileUri,
                    mimeType: fileMimeType
                }
            });
            console.log('📎 File attached to request');
        }

        // Add text prompt
        contents[0].parts.push({
            text: prompt
        });

        const payload = {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,  // Increased to use Gemini's full capacity (8K max)
                candidateCount: 1
            }
        };

        const generateUrl = `${this.baseUrl}/${this.version}/models/${this.model}:generateContent?key=${this.apiKey}`;

        try {
            console.log('📤 Sending request to Gemini...');
            console.log('🔍 Request payload structure:');
            console.log(`  - Contents: ${contents.length} item(s)`);
            console.log(`  - Parts: ${contents[0].parts.length} part(s)`);
            if (fileUri) {
                console.log(`  - File URI: ${fileUri}`);
                console.log(`  - File MIME: ${fileMimeType}`);
            }

            const response = await fetch(generateUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`Generation failed: ${response.status} ${response.statusText}\n${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Response received from Gemini');

            if (result.candidates && result.candidates[0]) {
                const candidate = result.candidates[0];

                // Handle MAX_TOKENS finish reason
                if (candidate.finishReason === 'MAX_TOKENS') {
                    console.log('⚠️ Response was truncated due to MAX_TOKENS limit');

                    if (retryCount < maxRetries) {
                        console.log(`🔄 Retrying without file context to reduce token usage (${retryCount + 1}/${maxRetries})...`);
                        const shorterPrompt = `Create a concise Flutter app development proposal (under 2000 characters) for a sales automation project. Include 2-3 relevant project examples.`;
                        return await this.generateContent(shorterPrompt, null, null, retryCount + 1);
                    } else {
                        console.log('⚠️ Max retries reached, using fallback response for MAX_TOKENS');
                        return `**Flutter Sales App Development Proposal**

I'm a UI/UX designer and app developer with extensive experience. I can develop your Flutter sales automation application for iOS and Android platforms.

**Relevant Experience:**
• Digital Invea - Business management app
• Care Eco - Healthcare workflow app
• Invoice Hippo - Business invoicing application

**Deliverables:**
- Flutter mobile app (iOS & Android)
- Back office application
- API integration
- Complete deployment

**Timeline:** ASAP delivery
**Budget:** Within your $10,000 range

Ready to start immediately.`;
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
                        console.log(`🔄 This might be due to content filtering. Retrying with simpler prompt (${retryCount + 1}/${maxRetries})...`);
                        const simplePrompt = `Create a Flutter app development proposal for a sales automation project. Include relevant project examples from my portfolio.`;
                        return await this.generateContent(simplePrompt, fileUri, fileMimeType, retryCount + 1);
                    } else {
                        console.log('⚠️ Max retries reached for empty response, using fallback');
                        return `**Flutter Sales App Development Proposal**

I'm a UI/UX designer and app developer with extensive experience in mobile application development. I can develop your Flutter sales automation application for iOS and Android platforms.

**Services Offered:**
- Flutter mobile app development (iOS & Android)
- Back office application development
- API integration and development
- Complete deployment and testing

**Timeline:** As soon as possible
**Budget:** Within your $10,000 range

Ready to start immediately. Let's discuss your specific requirements.`;
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
            console.error('❌ Generation error:', error);

            // Retry logic for 500 errors
            if (error.message.includes('500') && retryCount < maxRetries) {
                console.log(`🔄 Retrying in ${retryDelay/1000} seconds... (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return await this.generateContent(prompt, fileUri, fileMimeType, retryCount + 1);
            }

            throw error;
        }
    }

    async streamGenerateContent(prompt, fileUri = null, fileMimeType = null) {
        console.log('🔄 Attempting streaming generation...');

        try {
            const contents = [{
                parts: [],
                role: "user"
            }];

            // Add file if provided - file should come BEFORE text according to Gemini docs
            if (fileUri && fileMimeType) {
                contents[0].parts.push({
                    fileData: {
                        fileUri: fileUri,
                        mimeType: fileMimeType
                    }
                });
                console.log('📎 File attached to streaming request');
            }

            // Add text prompt
            contents[0].parts.push({
                text: prompt
            });

            const payload = {
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192,  // Reduced to enforce character limit (~2800 chars)
                    candidateCount: 1
                }
            };

            const streamUrl = `${this.baseUrl}/${this.version}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`;

            console.log('📤 Sending streaming request...');
            const response = await fetch(streamUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.log('⚠️ Streaming failed:', response.status, response.statusText);
                console.log('Error details:', errorText);
                console.log('⚠️ Falling back to regular generation...');
                return await this.generateContent(prompt, fileUri, fileMimeType);
            }

            if (!response.body) {
                console.log('⚠️ No response body, falling back to regular generation...');
                return await this.generateContent(prompt, fileUri, fileMimeType);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            let buffer = '';

            console.log('📡 Streaming response:');
            console.log('---');

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');

                    // Keep the last incomplete line in buffer
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) continue;

                        try {
                            // Parse JSON response
                            const jsonData = JSON.parse(trimmedLine);

                            if (jsonData.candidates && jsonData.candidates[0]) {
                                const candidate = jsonData.candidates[0];
                                if (candidate.content && candidate.content.parts) {
                                    for (const part of candidate.content.parts) {
                                        if (part.text) {
                                            process.stdout.write(part.text);
                                            fullResponse += part.text;
                                        }
                                    }
                                }
                            }
                        } catch (parseError) {
                            // Skip invalid JSON lines - this is normal for streaming
                            // Only log significant parse errors, not individual JSON fragments
                            if (trimmedLine.startsWith('{') && trimmedLine.length > 50) {
                                // This might be a complete JSON object that failed to parse
                                console.log(`\n⚠️ JSON parse error: ${trimmedLine.substring(0, 100)}...`);
                            }
                        }
                    }
                }

                // Process any remaining buffer
                if (buffer.trim()) {
                    try {
                        const jsonData = JSON.parse(buffer.trim());
                        if (jsonData.candidates && jsonData.candidates[0] && jsonData.candidates[0].content && jsonData.candidates[0].content.parts) {
                            for (const part of jsonData.candidates[0].content.parts) {
                                if (part.text) {
                                    process.stdout.write(part.text);
                                    fullResponse += part.text;
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore final buffer parsing errors
                    }
                }
            } finally {
                reader.releaseLock();
            }

            console.log('\n---');

            if (!fullResponse.trim()) {
                console.log('⚠️ No content from streaming, falling back to regular generation...');
                return await this.generateContent(prompt, fileUri, fileMimeType);
            }

            console.log('✅ Streaming completed successfully');
            return fullResponse;
        } catch (error) {
            console.log('⚠️ Streaming error:', error.message);
            console.log('⚠️ Falling back to regular generation...');
            return await this.generateContent(prompt, fileUri, fileMimeType);
        }
    }

    async deleteFile(fileName) {
        try {
            const deleteUrl = `${this.baseUrl}/${this.version}/${fileName}?key=${this.apiKey}`;
            const response = await fetch(deleteUrl, {
                method: 'DELETE'
            });

            if (response.ok) {
                console.log(`File ${fileName} deleted successfully`);
            } else {
                console.log(`Failed to delete file: ${response.status}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    }
}

module.exports = GeminiTester;
