import { SnippetManager } from '@/shared/utils/snippets';
import { OverlayHandler } from './overlay-handler';
import { PasteHandler } from './paste-handler';

class ContentScriptMain {
  private overlayHandler: OverlayHandler;
  private pasteHandler: PasteHandler;

  constructor() {
    this.overlayHandler = new OverlayHandler();
    this.pasteHandler = new PasteHandler();
    
    this.initialize();
  }

  private initialize() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Inject styles
    this.injectStyles();
  }

  private async handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
    try {
      switch (message.action) {
        case 'openOverlay':
          await this.overlayHandler.showOverlay();
          sendResponse({ success: true });
          break;

        case 'pasteSnippet':
          const success = await this.pasteHandler.pasteSnippet(message.snippetId);
          sendResponse({ success });
          break;

        case 'getActiveElementInfo':
          const info = this.getActiveElementInfo();
          sendResponse(info);
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private getActiveElementInfo() {
    const activeElement = document.activeElement;
    if (!activeElement) return { hasFocus: false };

    const isInput = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
    const isContentEditable = activeElement.isContentEditable;

    return {
      hasFocus: true,
      isInput,
      isContentEditable,
      tagName: activeElement.tagName,
      type: (activeElement as HTMLInputElement).type,
      value: (activeElement as HTMLInputElement | HTMLTextAreaElement).value
    };
  }

  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .shortcutpaste-overlay {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--dropdown-background);
        border: 1px solid var(--border-default);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        min-width: 300px;
        max-width: 500px;
        max-height: 400px;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .shortcutpaste-overlay-header {
        padding: 12px 16px;
        background: var(--sidebar-background);
        border-bottom: 1px solid var(--border-default);
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .shortcutpaste-overlay-search {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-default);
      }

      .shortcutpaste-overlay-search input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--border-default);
        border-radius: 4px;
        background: var(--input-background);
        color: var(--text-primary);
      }

      .shortcutpaste-overlay-list {
        max-height: 300px;
        overflow-y: auto;
      }

      .shortcutpaste-overlay-item {
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid var(--border-default);
        transition: background-color 0.15s ease;
      }

      .shortcutpaste-overlay-item:hover {
        background: var(--dropdown-item-hover);
      }

      .shortcutpaste-overlay-item.selected {
        background: var(--primary);
        color: white;
      }

      .shortcutpaste-overlay-item-title {
        font-weight: 500;
        margin-bottom: 4px;
      }

      .shortcutpaste-overlay-item-content {
        font-size: 12px;
        opacity: 0.7;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .shortcutpaste-overlay-empty {
        padding: 24px 16px;
        text-align: center;
        color: var(--text-secondary);
      }
    `;

    document.head.appendChild(style);
  }
}

// Initialize content script
new ContentScriptMain();