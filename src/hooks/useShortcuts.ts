import { useEffect, useCallback } from 'react';
import { Snippet } from '@/types';
import { ContentScriptManager } from '@/background/content-script-manager';

export const useShortcuts = () => {
  const setupShortcuts = useCallback(async () => {
    // Listen for command events from background
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'pasteSnippetDirect') {
          pasteSnippet(message.snippetId).then(success => {
            sendResponse({ success });
          });
          return true; // Keep message channel open for async response
        }
        return false;
      });
    }
  }, []);

  const pasteSnippet = useCallback(async (snippetId: string) => {
    try {
      const activeTab = await ContentScriptManager.getActiveTab();
      if (!activeTab?.id) return false;

      // Ensure content script is injected
      if (!await ContentScriptManager.isContentScriptInjected(activeTab.id)) {
        await ContentScriptManager.injectContentScript(activeTab.id);
      }

      const response = await ContentScriptManager.sendMessageToTab(activeTab.id, {
        action: 'pasteSnippet',
        snippetId
      });

      return response?.success === true;
    } catch (error) {
      console.error('Failed to paste snippet:', error);
      return false;
    }
  }, []);

  const openOverlay = useCallback(async () => {
    try {
      const activeTab = await ContentScriptManager.getActiveTab();
      if (!activeTab?.id) return false;

      // Ensure content script is injected
      if (!await ContentScriptManager.isContentScriptInjected(activeTab.id)) {
        await ContentScriptManager.injectContentScript(activeTab.id);
      }

      const response = await ContentScriptManager.sendMessageToTab(activeTab.id, {
        action: 'openOverlay'
      });

      return response?.success === true;
    } catch (error) {
      console.error('Failed to open overlay:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    setupShortcuts();
  }, [setupShortcuts]);

  return {
    pasteSnippet,
    openOverlay,
    setupShortcuts
  };
};