// Manager for content script communication

export class ContentScriptManager {
    static async injectContentScript(tabId: number): Promise<void> {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['src/content-scripts/content-main.ts']
        });
      } catch (error) {
        console.error('Failed to inject content script:', error);
      }
    }
  
    static async sendMessageToTab(tabId: number, message: any): Promise<any> {
      try {
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
        const response = await this.sendMessageToTab(tabId, { action: 'ping' });
        return response?.success === true;
      } catch {
        return false;
      }
    }
  }