// Manager for content script communication

export class ContentScriptManager {
  static async injectContentScript(tabId: number): Promise<void> {
    try {
      const isInjected = await this.isContentScriptInjected(tabId);
      if (isInjected) return;

      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-main.js'] // Changed from .ts to .js
      });
    } catch (error) {
      console.error('Failed to inject content script:', error);
    }
  }

  static async sendMessageToTab(tabId: number, message: any): Promise<any> {
    try {
      // Đảm bảo content script đã được inject
      await this.injectContentScript(tabId);

      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.error('Failed to send message to tab:', error);
      return null;
    }
  }

  static async getActiveTab(): Promise<chrome.tabs.Tab | null> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab || null;
    } catch (error) {
      console.error('Failed to get active tab:', error);
      return null;
    }
  }

  static async isContentScriptInjected(tabId: number): Promise<boolean> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      return response?.success === true;
    } catch {
      return false;
    }
  }
}