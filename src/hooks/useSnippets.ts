import { useState, useEffect, useCallback } from 'react';
import { Snippet } from '@/types';
import { SnippetManager } from '@/shared/utils/snippets';

export const useSnippets = () => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSnippets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await SnippetManager.getAllSnippets();
      setSnippets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snippets');
    } finally {
      setLoading(false);
    }
  }, []);

  const createSnippet = useCallback(async (snippetData: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newSnippet = await SnippetManager.createSnippet(snippetData);
      setSnippets(prev => [...prev, newSnippet]);
      return newSnippet;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create snippet');
    }
  }, []);

  const updateSnippet = useCallback(async (id: string, updates: Partial<Omit<Snippet, 'id'>>) => {
    try {
      const updatedSnippet = await SnippetManager.updateSnippet(id, updates);
      if (updatedSnippet) {
        setSnippets(prev => prev.map(s => s.id === id ? updatedSnippet : s));
      }
      return updatedSnippet;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update snippet');
    }
  }, []);

  const deleteSnippet = useCallback(async (id: string) => {
    try {
      const success = await SnippetManager.deleteSnippet(id);
      if (success) {
        setSnippets(prev => prev.filter(s => s.id !== id));
      }
      return success;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete snippet');
    }
  }, []);

  const searchSnippets = useCallback(async (query: string) => {
    try {
      return await SnippetManager.searchSnippets(query);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to search snippets');
    }
  }, []);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  return {
    snippets,
    loading,
    error,
    loadSnippets,
    createSnippet,
    updateSnippet,
    deleteSnippet,
    searchSnippets
  };
};