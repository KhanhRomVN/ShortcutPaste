export class PasteHandler {
  /**
   * Paste content to the currently active element on the page
   */
  async pasteContent(content: string): Promise<boolean> {
    const activeElement = document.activeElement as HTMLElement | null;
    if (!activeElement) return false;

    try {
      // Handle different types of input elements
      if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        this.pasteToInput(activeElement as HTMLInputElement | HTMLTextAreaElement, content);
      } else if (activeElement.isContentEditable) {
        this.pasteToContentEditable(activeElement, content);
      } else {
        // Element is not editable
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error pasting content:', error);
      return false;
    }
  }

  /**
   * Paste content to input or textarea elements
   */
  private pasteToInput(element: HTMLInputElement | HTMLTextAreaElement, content: string): void {
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;

    // Insert content at cursor position
    element.value = element.value.substring(0, start) + content + element.value.substring(end);

    // Set cursor position after inserted content
    element.selectionStart = element.selectionEnd = start + content.length;

    // Trigger input events for frameworks like React/Vue to detect changes
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    // Focus the element to ensure it's active
    element.focus();
  }

  /**
   * Paste content to contentEditable elements
   */
  private pasteToContentEditable(element: HTMLElement, content: string): void {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      // No selection, append to the end
      element.innerHTML += content;
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    // Create text node to preserve formatting
    const textNode = document.createTextNode(content);
    range.insertNode(textNode);

    // Move cursor to end of inserted content
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);

    // Trigger input event for frameworks to detect changes
    element.dispatchEvent(new Event('input', { bubbles: true }));

    // Focus the element to ensure it's active
    element.focus();
  }

  /**
   * Check if the current active element can receive pasted content
   */
  isActiveElementPasteable(): boolean {
    const activeElement = document.activeElement as HTMLElement | null;

    if (!activeElement) return false;

    // Check if element is an input/textarea
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      const inputElement = activeElement as HTMLInputElement | HTMLTextAreaElement;
      return !inputElement.disabled && !inputElement.readOnly;
    }

    // Check if element is contentEditable
    if (activeElement.isContentEditable) {
      return true;
    }

    return false;
  }

  /**
   * Get information about the currently active element
   */
  getActiveElementInfo(): {
    tagName: string;
    type: string;
    canPaste: boolean;
    selectionStart?: number;
    selectionEnd?: number;
  } | null {
    const activeElement = document.activeElement as HTMLElement | null;

    if (!activeElement) return null;

    const info = {
      tagName: activeElement.tagName,
      type: 'unknown',
      canPaste: this.isActiveElementPasteable()
    };

    if (activeElement.tagName === 'INPUT') {
      const inputElement = activeElement as HTMLInputElement;
      return {
        ...info,
        type: inputElement.type || 'text',
        selectionStart: inputElement.selectionStart || 0,
        selectionEnd: inputElement.selectionEnd || 0
      };
    }

    if (activeElement.tagName === 'TEXTAREA') {
      const textareaElement = activeElement as HTMLTextAreaElement;
      return {
        ...info,
        type: 'textarea',
        selectionStart: textareaElement.selectionStart || 0,
        selectionEnd: textareaElement.selectionEnd || 0
      };
    }

    if (activeElement.isContentEditable) {
      return {
        ...info,
        type: 'contenteditable'
      };
    }

    return info;
  }
}