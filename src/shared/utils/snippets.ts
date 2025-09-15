import { Snippet } from '@/types';
import { storage } from './storage';

export class SnippetManager {
    static async getAllSnippets(): Promise<Snippet[]> {
        return storage.getSnippets();
    }

    static async getSnippetById(id: string): Promise<Snippet | undefined> {
        const snippets = await this.getAllSnippets();
        return snippets.find(s => s.id === id);
    }

    static async createSnippet(snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Snippet> {
        const snippets = await this.getAllSnippets();
        const newSnippet: Snippet = {
            ...snippet,
            id: this.generateId(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        snippets.push(newSnippet);
        await storage.saveSnippets(snippets);
        return newSnippet;
    }

    static async updateSnippet(id: string, updates: Partial<Omit<Snippet, 'id'>>): Promise<Snippet | undefined> {
        const snippets = await this.getAllSnippets();
        const index = snippets.findIndex(s => s.id === id);

        if (index === -1) return undefined;

        snippets[index] = {
            ...snippets[index],
            ...updates,
            updatedAt: Date.now()
        };

        await storage.saveSnippets(snippets);
        return snippets[index];
    }

    static async deleteSnippet(id: string): Promise<boolean> {
        const snippets = await this.getAllSnippets();
        const filtered = snippets.filter(s => s.id !== id);

        if (filtered.length === snippets.length) return false;

        await storage.saveSnippets(filtered);
        return true;
    }

    static async searchSnippets(query: string): Promise<Snippet[]> {
        const snippets = await this.getAllSnippets();
        const lowerQuery = query.toLowerCase();

        return snippets.filter(snippet =>
            snippet.title.toLowerCase().includes(lowerQuery) ||
            snippet.content.toLowerCase().includes(lowerQuery) ||
            snippet.category?.toLowerCase().includes(lowerQuery)
        );
    }

    private static generateId(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
}