import { PasteHandler } from './paste-handler';

class ContentScriptMain {
  private pasteHandler: PasteHandler;

  constructor() {
    this.pasteHandler = new PasteHandler();
    this.initialize();
  }

  private initialize() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  private async handleMessage(message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
    try {
      switch (message.action) {
        case 'ping':
          // Respond to ping to confirm content script is loaded
          sendResponse({ success: true });
          break;

        case 'pasteClipboardItem':
          const pasteSuccess = await this.pasteHandler.pasteContent(message.content);
          sendResponse({ success: pasteSuccess });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

// Initialize content script
new ContentScriptMain();