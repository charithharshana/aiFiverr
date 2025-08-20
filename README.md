# aiFiverr - AI-Powered Fiverr Assistant

A comprehensive Chrome extension that enhances your Fiverr experience with AI-powered chat sessions, proposal generation, and conversation analysis. Built with continuous chat context like ChatGPT, cross-browser compatibility, and smart API key rotation.

## 🚀 Features

### 🤖 Continuous AI Chat Sessions
- **ChatGPT-like Experience**: Maintains conversation context throughout entire sessions
- **Session Persistence**: Chat history saved and restored across browser sessions
- **Smart Context Management**: Automatically includes Fiverr conversation context in AI responses
- **Multiple Sessions**: Manage separate conversations for different clients/projects

### 🔄 API Key Rotation & Management
- **Smart Key Rotation**: Automatically rotates between multiple API keys
- **Health Monitoring**: Tracks key performance and quota usage
- **Session-based Keys**: Uses same key within a conversation for consistency
- **Automatic Failover**: Switches to healthy keys when others fail

### 📤 Export/Import Functionality
- **Cross-Browser Compatibility**: Export data from one browser, import to another
- **Multiple Formats**: JSON, CSV, and Markdown export options
- **Complete Data Backup**: Sessions, settings, knowledge base, and more
- **Selective Import**: Choose what data to import (sessions, settings, etc.)

### 🎯 Fiverr Integration
- **Auto-Detection**: Automatically detects Fiverr chat boxes and input fields
- **Conversation Extraction**: Pulls entire conversation history for AI context
- **Proposal Generation**: AI-powered proposal creation based on project briefs
- **Message Analysis**: Analyze client messages for tone, intent, and key points
- **Text Selection AI**: Select any text on Fiverr pages for instant AI processing

### 🧠 Knowledge Base System
- **Custom Variables**: Store personal info, services, experience for reuse
- **Custom Prompts**: Create and manage specialized AI prompts
- **Templates**: Pre-built message templates with variable substitution
- **Smart Suggestions**: AI uses your knowledge base for personalized responses

## 📦 Installation

### From Source
1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The aiFiverr icon should appear in your extensions toolbar

### Setup
1. Click the aiFiverr extension icon
2. Go to Settings tab
3. Add your Gemini API keys (one per line)
4. Configure your knowledge base variables
5. Start using AI assistance on Fiverr!

## 🔑 Getting Gemini API Keys

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key
5. Add multiple keys for better reliability and higher quotas

## 💡 Usage

### Basic Usage
1. **Navigate to Fiverr**: Open any Fiverr conversation or project page
2. **AI Buttons Appear**: Extension automatically adds AI assistance buttons
3. **Generate Replies**: Click "Generate Reply" on chat inputs
4. **Analyze Messages**: Click the 🤖 icon on messages for analysis
5. **Create Proposals**: Use "Generate Proposal" on project briefs
6. **Text Selection AI**: Select any text to see floating AI action icon

### Keyboard Shortcuts
- `Ctrl+Shift+A`: Open floating AI assistant

### Advanced Features

#### Text Selection AI (NEW!)
Select any text on Fiverr pages to instantly access AI tools:
1. **Select Text**: Highlight any message, project brief, or content
2. **Floating Icon**: Green action icon appears near your selection
3. **AI Menu**: Click icon to see available AI prompts
4. **Process & Insert**: AI generates response you can edit and insert

Perfect for:
- Analyzing client messages for tone and intent
- Translating and explaining foreign language text
- Generating professional responses to inquiries
- Summarizing long project descriptions
- Creating proposals based on brief requirements

#### Knowledge Base Variables
Set up variables in Settings > Knowledge Base:
```
bio: I'm a full-stack developer with 5+ years experience...
services: Web development, API integration, database design
experience: Built 100+ websites, worked with Fortune 500 companies
```

#### Custom Prompts
Create specialized prompts for different scenarios:
- Professional replies
- Proposal generation
- Message analysis
- Conversation summarization

#### Templates
Pre-built message templates with variables:
```
Hi {{client_name}},
Thank you for choosing my {{service_type}} services!
I'll deliver your project by {{deadline}}.
Best regards, {{my_name}}
```

## 🔧 Configuration

### API Key Settings
- **Multiple Keys**: Add multiple API keys for redundancy
- **Auto-Rotation**: Keys rotate automatically for load balancing
- **Health Monitoring**: Unhealthy keys are automatically disabled
- **Session Persistence**: Same key used throughout a conversation

### Preferences
- **Auto-save**: Automatically save chat sessions
- **Notifications**: Show success/error notifications
- **Key Rotation**: Enable/disable automatic key rotation
- **Context Length**: Maximum conversation context length

### Export/Import
- **Export All**: Complete backup of all extension data
- **Export Sessions**: Chat sessions only
- **Import Options**: Selective import with compatibility checks
- **Cross-Browser**: Move data between different browsers

## 🏗️ Architecture

### Core Components
- **Background Script**: Manages API keys, sessions, and cross-tab communication
- **Content Scripts**: Fiverr page integration and UI injection
- **Storage Manager**: Persistent data storage and caching
- **Session Manager**: Chat session lifecycle and context management
- **API Manager**: Smart API key rotation and health monitoring
- **Gemini Client**: AI integration with streaming support

### File Structure
```
aiFiverr/
├── manifest.json                 # Extension manifest
├── background/
│   └── background.js            # Background service worker
├── content/
│   ├── main.js                  # Main content script
│   ├── utils/                   # Utility functions
│   ├── fiverr/                  # Fiverr-specific integration
│   ├── ai/                      # AI and session management
│   └── styles/                  # CSS styles
├── popup/                       # Extension popup interface
├── icons/                       # Extension icons
└── docs/                        # Documentation and examples
```

## 🔒 Privacy & Security

### Data Storage
- **Local Storage**: All data stored locally in browser
- **No Cloud Sync**: No data sent to external servers (except AI APIs)
- **Encrypted Export**: API keys obfuscated in exports
- **User Control**: Complete control over data export/import

### API Security
- **Key Rotation**: Reduces risk of key compromise
- **Health Monitoring**: Detects and disables compromised keys
- **Rate Limiting**: Prevents quota exhaustion
- **Error Handling**: Graceful handling of API failures

## 🛠️ Development

### Prerequisites
- Chrome browser with Developer mode enabled
- Gemini API keys for testing
- Basic knowledge of Chrome extensions

### Local Development
1. Clone the repository
2. Make your changes
3. Reload the extension in `chrome://extensions/`
4. Test on Fiverr pages

### Building
The extension is ready to use as-is. No build process required.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support & Contact

### Common Issues
- **No AI responses**: Check API keys in Settings
- **Extension not loading**: Refresh the page and check console
- **Export/import fails**: Ensure valid JSON format

### Getting Help
- Check the console for error messages
- Verify API keys are valid and have quota
- Ensure you're on a Fiverr page for full functionality

### Contact & Links
- 🌐 **Contact**: [charithharshana.com/contact](https://www.charithharshana.com/contact)
- 📺 **YouTube Tutorials**: [@wcharithharshana](https://www.youtube.com/@wcharithharshana)
- 📘 **Facebook**: [wcharithharshana](https://www.facebook.com/wcharithharshana)
- 💻 **GitHub**: [charithharshana/aiFiverr](https://github.com/charithharshana/aiFiverr)

## 🔮 Roadmap

- [ ] Support for additional AI providers (OpenAI, Claude)
- [ ] Advanced conversation analytics
- [ ] Team collaboration features
- [ ] Mobile app companion
- [ ] Integration with other freelance platforms

## 📊 Version History

### v1.0.0 (Current)
- Initial release
- Continuous chat sessions
- API key rotation
- Export/import functionality
- Knowledge base system
- Fiverr integration
- Modern UI/UX

---

**Made with ❤️ for the Fiverr community by [Charith Harshana](https://www.charithharshana.com/contact)**

### Developer
- **Name**: Charith Harshana
- **Website**: [charithharshana.com](https://www.charithharshana.com/contact)
- **YouTube**: [@wcharithharshana](https://www.youtube.com/@wcharithharshana)
- **Facebook**: [wcharithharshana](https://www.facebook.com/wcharithharshana)