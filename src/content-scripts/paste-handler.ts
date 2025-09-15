import { SnippetManager } from '@/shared/utils/snippets';
import { storage } from '@/shared/utils/storage';

export class PasteHandler {
  async pasteSnippet(snippetId: string): Promise<boolean> {
    const snippet = await SnippetManager.getSnippetById(snippetId);
    if (!snippet) return false;

    const activeElement = document.activeElement;
    if (!activeElement) return false;

    try {
      if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        this.pasteToInput(activeElement as HTMLInputElement | HTMLTextAreaElement, snippet.content);
      } else if (activeElement.isContentEditable) {
        this.pasteToContentEditable(activeElement, snippet.content);
      } else {
        return false;
      }

      // Add to history
      await storage.addToHistory({
        snippetId: snippet.id,
        timestamp: Date.now(),
        url: window.location.href,
        elementType: activeElement.tagName
      });

      return true;
    } catch (error) {
      console.error('Error pasting snippet:', error);
      return false;
    }
  }

  private pasteToInput(element: HTMLInputElement | HTMLTextAreaElement, content: string): void {
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    
    // Insert content at cursor position
    element.value = element.value.substring(0, start) + content + element.value.substring(end);
    
    // Set cursor position after inserted content
    element.selectionStart = element.selectionEnd = start + content.length;
    
    // Trigger input event for React/Vue/etc. to detect changes
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private pasteToContentEditable(element: HTMLElement, content: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      element.innerHTML += content;
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    const textNode = document.createTextNode(content);
    range.insertNode(textNode);
    
    // Move cursor to end of inserted content
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Trigger input event
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}