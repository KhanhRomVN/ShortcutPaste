import { SnippetManager } from '@/shared/utils/snippets';
import { Snippet } from '@/types';
import { storage } from '@/shared/utils/storage';

export class OverlayHandler {
  private overlay: HTMLElement | null = null;
  private snippets: Snippet[] = [];
  private selectedIndex = 0;
  private searchTerm = '';

  async showOverlay(): Promise<void> {
    if (this.overlay) {
      this.hideOverlay();
      return;
    }

    this.snippets = await SnippetManager.getAllSnippets();
    this.createOverlay();
    this.renderOverlay();
    this.setupEventListeners();
  }

  hideOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.cleanupEventListeners();
  }

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'shortcutpaste-overlay';
    this.overlay.innerHTML = `
      <div class="shortcutpaste-overlay-header">
        <span>Select Snippet</span>
        <span style="font-size: 12px; opacity: 0.7">Esc to close</span>
      </div>
      <div class="shortcutpaste-overlay-search">
        <input type="text" placeholder="Search snippets..." />
      </div>
      <div class="shortcutpaste-overlay-list"></div>
    `;

    document.body.appendChild(this.overlay);

    // Focus search input
    const searchInput = this.overlay.querySelector('input');
    if (searchInput) {
      searchInput.focus();
    }
  }

  private renderOverlay(): void {
    if (!this.overlay) return;

    const listElement = this.overlay.querySelector('.shortcutpaste-overlay-list');
    if (!listElement) return;

    const filteredSnippets = this.filterSnippets();
    
    if (filteredSnippets.length === 0) {
      listElement.innerHTML = '<div class="shortcutpaste-overlay-empty">No snippets found</div>';
      return;
    }

    listElement.innerHTML = filteredSnippets
      .map((snippet, index) => `
        <div class="shortcutpaste-overlay-item ${index === this.selectedIndex ? 'selected' : ''}" data-id="${snippet.id}">
          <div class="shortcutpaste-overlay-item-title">${this.escapeHtml(snippet.title)}</div>
          <div class="shortcutpaste-overlay-item-content">${this.escapeHtml(snippet.content)}</div>
        </div>
      `)
      .join('');
  }

  private filterSnippets(): Snippet[] {
    if (!this.searchTerm.trim()) {
      return this.snippets;
    }

    const searchLower = this.searchTerm.toLowerCase();
    return this.snippets.filter(snippet =>
      snippet.title.toLowerCase().includes(searchLower) ||
      snippet.content.toLowerCase().includes(searchLower) ||
      snippet.category?.toLowerCase().includes(searchLower)
    );
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    
    const searchInput = this.overlay?.querySelector('input');
    if (searchInput) {
      searchInput.addEventListener('input', this.handleSearchInput);
    }

    const listItems = this.overlay?.querySelectorAll('.shortcutpaste-overlay-item');
    listItems?.forEach(item => {
      item.addEventListener('click', this.handleItemClick);
    });
  }

  private cleanupEventListeners(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.overlay) return;

    const filteredSnippets = this.filterSnippets();
    
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.hideOverlay();
        break;

      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, filteredSnippets.length - 1);
        this.renderOverlay();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.renderOverlay();
        break;

      case 'Enter':
        event.preventDefault();
        if (filteredSnippets.length > 0) {
          this.selectSnippet(filteredSnippets[this.selectedIndex].id);
        }
        break;
    }
  };

  private handleSearchInput = (event: Event): void => {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.selectedIndex = 0;
    this.renderOverlay();
  };

  private handleItemClick = (event: Event): void => {
    const target = event.currentTarget as HTMLElement;
    const snippetId = target.dataset.id;
    if (snippetId) {
      this.selectSnippet(snippetId);
    }
  };

  private async selectSnippet(snippetId: string): Promise<void> {
    const snippet = await SnippetManager.getSnippetById(snippetId);
    if (!snippet) return;

    // Send message to paste the snippet
    chrome.runtime.sendMessage({
      action: 'pasteSnippetDirect',
      snippetId: snippet.id
    });

    // Add to history
    await storage.addToHistory({
      snippetId: snippet.id,
      timestamp: Date.now(),
      url: window.location.href,
      elementType: document.activeElement?.tagName || 'unknown'
    });

    this.hideOverlay();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}