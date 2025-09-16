import { ClipboardItem, ClipboardFolder } from '../../types/clipboard';

class ClipboardStorage {
    private readonly STORAGE_KEYS = {
        ITEMS: 'clipboard_items',
        FOLDERS: 'clipboard_folders'
    };

    async getClipboardItems(): Promise<ClipboardItem[]> {
        try {
            const result = await chrome.storage.local.get(this.STORAGE_KEYS.ITEMS);
            return result[this.STORAGE_KEYS.ITEMS] || [];
        } catch (error) {
            console.error('Failed to get clipboard items:', error);
            return [];
        }
    }

    async saveClipboardItems(items: ClipboardItem[]): Promise<void> {
        try {
            await chrome.storage.local.set({ [this.STORAGE_KEYS.ITEMS]: items });
        } catch (error) {
            console.error('Failed to save clipboard items:', error);
            throw error;
        }
    }

    async addClipboardItem(itemData: Omit<ClipboardItem, 'id' | 'timestamp'>): Promise<ClipboardItem> {
        const newItem: ClipboardItem = {
            ...itemData,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            isFavorite: itemData.isFavorite || false
        };

        const items = await this.getClipboardItems();
        const updatedItems = [newItem, ...items.slice(0, 999)]; // Keep max 1000 items

        await this.saveClipboardItems(updatedItems);
        return newItem;
    }

    async deleteClipboardItem(id: string): Promise<boolean> {
        try {
            const items = await this.getClipboardItems();
            const updatedItems = items.filter(item => item.id !== id);
            await this.saveClipboardItems(updatedItems);
            return true;
        } catch (error) {
            console.error('Failed to delete clipboard item:', error);
            return false;
        }
    }

    async getClipboardFolders(): Promise<ClipboardFolder[]> {
        try {
            const result = await chrome.storage.local.get(this.STORAGE_KEYS.FOLDERS);
            return result[this.STORAGE_KEYS.FOLDERS] || [];
        } catch (error) {
            console.error('Failed to get clipboard folders:', error);
            return [];
        }
    }

    async saveClipboardFolders(folders: ClipboardFolder[]): Promise<void> {
        try {
            await chrome.storage.local.set({ [this.STORAGE_KEYS.FOLDERS]: folders });
        } catch (error) {
            console.error('Failed to save clipboard folders:', error);
            throw error;
        }
    }

    async createFolder(name: string, parentId?: string): Promise<ClipboardFolder> {
        const newFolder: ClipboardFolder = {
            id: crypto.randomUUID(),
            name,
            parentId,
            children: [],
            expanded: true,
            createdAt: Date.now(),
            items: []
        };

        const folders = await this.getClipboardFolders();

        if (parentId) {
            // Add as child to parent folder
            const addToParent = (folderList: ClipboardFolder[]): ClipboardFolder[] => {
                return folderList.map(folder => {
                    if (folder.id === parentId) {
                        return { ...folder, children: [...folder.children, newFolder] };
                    }
                    if (folder.children.length > 0) {
                        return { ...folder, children: addToParent(folder.children) };
                    }
                    return folder;
                });
            };

            const updatedFolders = addToParent(folders);
            await this.saveClipboardFolders(updatedFolders);
        } else {
            // Add as root folder
            const updatedFolders = [...folders, newFolder];
            await this.saveClipboardFolders(updatedFolders);
        }

        return newFolder;
    }

    async deleteFolder(id: string): Promise<boolean> {
        try {
            const removeFolder = (folderList: ClipboardFolder[]): ClipboardFolder[] => {
                return folderList
                    .filter(folder => folder.id !== id)
                    .map(folder => ({
                        ...folder,
                        children: removeFolder(folder.children)
                    }));
            };

            const folders = await this.getClipboardFolders();
            const updatedFolders = removeFolder(folders);
            await this.saveClipboardFolders(updatedFolders);

            // Also remove items in this folder
            const items = await this.getClipboardItems();
            const updatedItems = items.filter(item => item.folderId !== id);
            await this.saveClipboardItems(updatedItems);

            return true;
        } catch (error) {
            console.error('Failed to delete folder:', error);
            return false;
        }
    }
}

export const clipboardStorage = new ClipboardStorage();