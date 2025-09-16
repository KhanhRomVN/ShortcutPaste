import { ClipboardItem, ClipboardFolder, ClipboardSnapshot } from '@/types/clipboard';

const STORAGE_KEYS = {
    CLIPBOARD_ITEMS: 'flexbookmark_clipboard_items',
    CLIPBOARD_FOLDERS: 'flexbookmark_clipboard_folders',
    CLIPBOARD_SNAPSHOTS: 'flexbookmark_clipboard_snapshots'
} as const;

export const clipboardStorage = {
    // Clipboard Items
    async getClipboardItems(): Promise<ClipboardItem[]> {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            return new Promise((resolve) => {
                chrome.storage.local.get(STORAGE_KEYS.CLIPBOARD_ITEMS, (result) => {
                    resolve(result[STORAGE_KEYS.CLIPBOARD_ITEMS] || []);
                });
            });
        }
        const stored = localStorage.getItem(STORAGE_KEYS.CLIPBOARD_ITEMS) || '[]';
        return JSON.parse(stored);
    },

    async saveClipboardItems(items: ClipboardItem[]): Promise<void> {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            return new Promise((resolve) => {
                chrome.storage.local.set({ [STORAGE_KEYS.CLIPBOARD_ITEMS]: items }, resolve);
            });
        }
        localStorage.setItem(STORAGE_KEYS.CLIPBOARD_ITEMS, JSON.stringify(items));
    },

    async addClipboardItem(item: Omit<ClipboardItem, 'id' | 'timestamp'>): Promise<ClipboardItem> {
        const items = await this.getClipboardItems();
        const newItem: ClipboardItem = {
            ...item,
            id: this.generateId(),
            timestamp: Date.now(),
            isFavorite: item.isFavorite || false
        };
        items.unshift(newItem);

        // Keep only last 1000 items
        await this.saveClipboardItems(items.slice(0, 1000));
        return newItem;
    },

    async deleteClipboardItem(id: string): Promise<boolean> {
        const items = await this.getClipboardItems();
        const filtered = items.filter(item => item.id !== id);

        if (filtered.length === items.length) return false;

        await this.saveClipboardItems(filtered);
        return true;
    },

    // Clipboard Folders
    async getClipboardFolders(): Promise<ClipboardFolder[]> {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            return new Promise((resolve) => {
                chrome.storage.local.get(STORAGE_KEYS.CLIPBOARD_FOLDERS, (result) => {
                    const folders = result[STORAGE_KEYS.CLIPBOARD_FOLDERS] || [];
                    resolve(this.buildFolderTree(folders));
                });
            });
        }
        const stored = localStorage.getItem(STORAGE_KEYS.CLIPBOARD_FOLDERS) || '[]';
        const folders = JSON.parse(stored);
        return this.buildFolderTree(folders);
    },

    async saveClipboardFolders(folders: ClipboardFolder[]): Promise<void> {
        const flatFolders = this.flattenFolderTree(folders);
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            return new Promise((resolve) => {
                chrome.storage.local.set({ [STORAGE_KEYS.CLIPBOARD_FOLDERS]: flatFolders }, resolve);
            });
        }
        localStorage.setItem(STORAGE_KEYS.CLIPBOARD_FOLDERS, JSON.stringify(flatFolders));
    },

    async createFolder(name: string, parentId?: string): Promise<ClipboardFolder> {
        const folders = await this.getClipboardFolders();
        const newFolder: ClipboardFolder = {
            id: this.generateId(),
            name,
            parentId,
            children: [],
            items: [],
            createdAt: Date.now(),
            expanded: false
        };

        if (parentId) {
            const parent = this.findFolderById(folders, parentId);
            if (parent) {
                parent.children.push(newFolder);
            }
        } else {
            folders.push(newFolder);
        }

        await this.saveClipboardFolders(folders);
        return newFolder;
    },

    async deleteFolder(id: string): Promise<boolean> {
        const folders = await this.getClipboardFolders();
        const removed = this.removeFolderById(folders, id);

        if (removed) {
            await this.saveClipboardFolders(folders);
        }

        return removed;
    },

    // Clipboard Snapshots
    async getClipboardSnapshots(): Promise<ClipboardSnapshot[]> {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            return new Promise((resolve) => {
                chrome.storage.local.get(STORAGE_KEYS.CLIPBOARD_SNAPSHOTS, (result) => {
                    resolve(result[STORAGE_KEYS.CLIPBOARD_SNAPSHOTS] || []);
                });
            });
        }
        const stored = localStorage.getItem(STORAGE_KEYS.CLIPBOARD_SNAPSHOTS) || '[]';
        return JSON.parse(stored);
    },

    async saveClipboardSnapshots(snapshots: ClipboardSnapshot[]): Promise<void> {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            return new Promise((resolve) => {
                chrome.storage.local.set({ [STORAGE_KEYS.CLIPBOARD_SNAPSHOTS]: snapshots }, resolve);
            });
        }
        localStorage.setItem(STORAGE_KEYS.CLIPBOARD_SNAPSHOTS, JSON.stringify(snapshots));
    },

    async createSnapshot(name: string, description?: string): Promise<ClipboardSnapshot> {
        const items = await this.getClipboardItems();
        const folders = await this.getClipboardFolders();

        const snapshot: ClipboardSnapshot = {
            id: this.generateId(),
            name,
            description,
            items: [...items],
            folders: [...folders],
            createdAt: Date.now()
        };

        const snapshots = await this.getClipboardSnapshots();
        snapshots.unshift(snapshot);
        await this.saveClipboardSnapshots(snapshots);

        return snapshot;
    },

    // Helper methods
    buildFolderTree(folders: any[]): ClipboardFolder[] {
        const folderMap = new Map<string, ClipboardFolder>();
        const rootFolders: ClipboardFolder[] = [];

        // Create folder map
        folders.forEach(folder => {
            folderMap.set(folder.id, { ...folder, children: [], items: [] });
        });

        // Build tree structure
        folders.forEach(folder => {
            const folderNode = folderMap.get(folder.id)!;
            if (folder.parentId && folderMap.has(folder.parentId)) {
                folderMap.get(folder.parentId)!.children.push(folderNode);
            } else {
                rootFolders.push(folderNode);
            }
        });

        return rootFolders;
    },

    flattenFolderTree(folders: ClipboardFolder[]): any[] {
        const result: any[] = [];

        const flatten = (folder: ClipboardFolder) => {
            result.push({
                id: folder.id,
                name: folder.name,
                parentId: folder.parentId,
                createdAt: folder.createdAt,
                expanded: folder.expanded
            });
            folder.children.forEach(flatten);
        };

        folders.forEach(flatten);
        return result;
    },

    findFolderById(folders: ClipboardFolder[], id: string): ClipboardFolder | null {
        for (const folder of folders) {
            if (folder.id === id) return folder;
            const found = this.findFolderById(folder.children, id);
            if (found) return found;
        }
        return null;
    },

    removeFolderById(folders: ClipboardFolder[], id: string): boolean {
        for (let i = 0; i < folders.length; i++) {
            if (folders[i].id === id) {
                folders.splice(i, 1);
                return true;
            }
            if (this.removeFolderById(folders[i].children, id)) {
                return true;
            }
        }
        return false;
    },

    generateId(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
};