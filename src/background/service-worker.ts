// Chrome Extension Service Worker with proper TypeScript types

import { clipboardStorage } from "@/shared/utils/clipboard-storage";

// --- Bookmark sync functionality ---
chrome.bookmarks.onCreated.addListener(syncBookmarks);
chrome.bookmarks.onRemoved.addListener(syncBookmarks);
chrome.bookmarks.onChanged.addListener(syncBookmarks);
chrome.bookmarks.onMoved.addListener(syncBookmarks);
chrome.bookmarks.onChildrenReordered.addListener(syncBookmarks);

async function syncBookmarks() {
    try {
        const tree = await chrome.bookmarks.getTree();
        await chrome.storage.local.set({ bookmarkTree: tree });

        // Notify all tabs about bookmark updates
        const tabs = await chrome.tabs.query({});
        tabs.forEach(tab => {
            if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { action: "bookmarksUpdated" }).catch(() => {
                    // Ignore errors for tabs that can't receive messages
                });
            }
        });
    } catch (error) {
        console.error("Bookmark sync error:", error);
    }
}

/**
 * Get Other Bookmarks folder ID
 */
async function getOtherBookmarksId(): Promise<string> {
    const tree = await chrome.bookmarks.getTree();
    // Look for "Other Bookmarks" case-insensitive, fallback to root id
    const otherBookmarks = tree[0]?.children?.find(
        node => node.title.toLowerCase().includes("other bookmarks")
    );
    if (otherBookmarks?.id) {
        return otherBookmarks.id;
    }
    // Fallback to root folder
    return tree[0].id;
}

// --- Storage interface and implementation ---
interface Storage {
    getSnippets(): Promise<any[]>;
}

// Simple storage implementation for background script
const storage: Storage = {
    async getSnippets(): Promise<any[]> {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['shortcutpaste_snippets'], (result) => {
                resolve(result.shortcutpaste_snippets || []);
            });
        });
    }
};

// --- Command handling for keyboard shortcuts ---
chrome.commands.onCommand.addListener(async (command: string) => {
    console.log(`Command received: ${command}`);

    try {
        if (command === 'open_snippet_overlay') {
            // Open overlay in active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id) {
                await chrome.tabs.sendMessage(tabs[0].id, { action: 'openOverlay' });
            }
        }
        else if (command === 'paste_favorite_clipboard') {
            // Paste favorite clipboard item
            const clipboardItems = await clipboardStorage.getClipboardItems();
            const favoriteItem = clipboardItems.find(item => item.isFavorite);

            if (favoriteItem) {
                // Send to active tab for pasting
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs[0]?.id) {
                    await chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'pasteClipboardItem',
                        content: favoriteItem.content
                    });
                }
            }
        }
        else if (command.startsWith('paste_snippet_')) {
            // Extract snippet number from command (paste_snippet_1, paste_snippet_2, etc.)
            const snippetNumber = parseInt(command.split('_')[2]);

            if (!isNaN(snippetNumber)) {
                // Get snippets from storage
                const snippets = await storage.getSnippets();

                // Find snippet with matching shortcut or by index
                const targetSnippet = snippets.find(s =>
                    s.shortcut === `Ctrl+Shift+${snippetNumber}` ||
                    s.shortcut === `Command+Shift+${snippetNumber}`
                ) || (snippets.length >= snippetNumber ? snippets[snippetNumber - 1] : null);

                if (targetSnippet) {
                    // Send to active tab for pasting
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tabs[0]?.id) {
                        await chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'pasteSnippet',
                            snippetId: targetSnippet.id
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error handling command:', error);
    }
});

// --- Message handling ---
chrome.runtime.onMessage.addListener((request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    if (request.action === "getBookmarks") {
        chrome.storage.local.get("bookmarkTree", (data: any) => {
            sendResponse(data.bookmarkTree || []);
        });
        return true; // Keep message channel open for async response
    }

    // Handle folder creation requested from popup/page
    if (request.action === "createFolder" && request.folder) {
        // Determine parentId if not provided, then create folder
        (async () => {
            try {
                const folderDetails = { ...request.folder };
                if (!folderDetails.parentId) {
                    folderDetails.parentId = await getOtherBookmarksId();
                }
                chrome.bookmarks.create(folderDetails, (newNode) => {
                    syncBookmarks().catch(console.error);
                    sendResponse(newNode);
                });
            } catch (error) {
                console.error("Error creating folder:", error);
                sendResponse({ error: error instanceof Error ? error.message : String(error) });
            }
        })();
        return true; // Keep channel open for async response
    }

    if (request.action === "getAuthToken") {
        getAuthToken(request.interactive || false)
            .then(token => sendResponse({ success: true, token }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response
    }

    if (request.action === "removeAuthToken") {
        removeAuthToken(request.token)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response
    }

    if (request.action === "clearAllTokens") {
        clearAllAuthTokens()
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response
    }

    if (request.action === "getUserInfo") {
        getUserInfo(request.token)
            .then(userInfo => sendResponse({ success: true, userInfo }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response
    }

    // Default: keep channel open to prevent port-closed errors
    return true;
});

// Initialize on extension install/startup
chrome.runtime.onInstalled.addListener(() => {
    syncBookmarks();
});

chrome.runtime.onStartup.addListener(() => {
    syncBookmarks();
});

// --- Chrome Identity API helpers ---

/**
 * Get OAuth2 token using Chrome Identity API
 */
async function getAuthToken(interactive: boolean = false): Promise<string> {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken(
            { interactive },
            (result: chrome.identity.GetAuthTokenResult) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                if (!result?.token) {
                    reject(new Error('No token received'));
                    return;
                }

                resolve(result.token);
            }
        );
    });
}

/**
 * Remove cached auth token
 */
async function removeAuthToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.identity.removeCachedAuthToken(
            { token },
            () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve();
            }
        );
    });
}

/**
 * Clear all cached auth tokens
 */
async function clearAllAuthTokens(): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.identity.clearAllCachedAuthTokens(() => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve();
        });
    });
}

/**
 * Get user info from Google API using access token
 */
async function getUserInfo(token: string): Promise<any> {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const userInfo = await response.json();
        return userInfo;
    } catch (error) {
        console.error('Error fetching user info:', error);
        throw error;
    }
}

// Handle extension errors
self.addEventListener('error', (event) => {
    console.error('FlexBookmark service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('FlexBookmark service worker unhandled rejection:', event.reason);
});