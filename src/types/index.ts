export interface Snippet {
    id: string;
    title: string;
    content: string;
    shortcut?: string;
    category?: string;
    createdAt: number;
    updatedAt: number;
}

export interface SnippetCategory {
    id: string;
    name: string;
    color?: string;
}

export interface ShortcutConfig {
    command: string;
    key: string;
    description: string;
}

export interface PasteEvent {
    snippetId: string;
    timestamp: number;
    url: string;
    elementType: string;
}