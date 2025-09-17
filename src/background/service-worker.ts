// src/background/service-worker.ts
// Inline the dependencies instead of importing them to avoid module loading issues

// Inline clipboard storage functionality
class ClipboardStorage {
    private readonly STORAGE_KEYS = {
        ITEMS: 'clipboard_items',
        FOLDERS: 'clipboard_folders'
    };

    async getClipboardItems(): Promise<any[]> {
        try {
            const result = await chrome.storage.local.get(this.STORAGE_KEYS.ITEMS);
            return result[this.STORAGE_KEYS.ITEMS] || [];
        } catch (error) {
            console.error('Failed to get clipboard items:', error);
            return [];
        }
    }

    async saveClipboardItems(items: any[]): Promise<void> {
        try {
            await chrome.storage.local.set({ [this.STORAGE_KEYS.ITEMS]: items });
        } catch (error) {
            console.error('Failed to save clipboard items:', error);
            throw error;
        }
    }
}

// Inline logger functionality
class Logger {
    private logs: any[] = [];
    private maxLogs = 1000;

    log(level: string, message: string, context?: any, source?: string) {
        const logEntry = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            level,
            message,
            context,
            source: source || 'service-worker'
        };

        this.logs.unshift(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }

        // Log to console
        const consoleMethod = (console as any)[level] || console.log;
        consoleMethod(`[${source || 'service-worker'}]`, message, context || '');
    }

    info(message: string, context?: any, source?: string) {
        this.log('info', message, context, source);
    }

    warn(message: string, context?: any, source?: string) {
        this.log('warn', message, context, source);
    }

    error(message: string, context?: any, source?: string) {
        this.log('error', message, context, source);
    }

    debug(message: string, context?: any, source?: string) {
        this.log('debug', message, context, source);
    }
}

// Initialize inline instances
const clipboardStorage = new ClipboardStorage();
const logger = new Logger();

// Content Script Manager
class ContentScriptManager {
    static async injectContentScript(tabId: number): Promise<void> {
        try {
            const isInjected = await this.isContentScriptInjected(tabId);
            if (isInjected) {
                console.log(`Content script already injected in tab ${tabId}`);
                return;
            }

            console.log(`Injecting content script into tab ${tabId}`);
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content-main.js']
            });

            await new Promise(resolve => setTimeout(resolve, 200));
            console.log(`Content script injected successfully in tab ${tabId}`);
        } catch (error) {
            console.error('Failed to inject content script:', error);
            throw error;
        }
    }

    static async sendMessageToTab(tabId: number, message: any, retries = 3): Promise<any> {
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`Sending message to tab ${tabId} (attempt ${i + 1}/${retries})`);

                await this.injectContentScript(tabId);

                const finalMessage = {
                    ...message,
                    action: message.action === 'pasteClipboardItem' ? 'pasteDirectValue' : message.action
                };

                const response = await chrome.tabs.sendMessage(tabId, finalMessage);

                if (response && response.success) {
                    console.log(`Message sent successfully to tab ${tabId}`);
                    return response;
                } else {
                    console.warn(`Message failed in tab ${tabId}, response:`, response);
                }
            } catch (error) {
                console.error(`Failed to send message to tab ${tabId} (attempt ${i + 1}):`, error);

                if (i === retries - 1) {
                    throw error;
                }

                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        throw new Error(`Failed to send message after ${retries} attempts`);
    }

    static async getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                console.warn('No active tab found');
                return undefined;
            }

            console.log('Active tab:', {
                id: tab.id,
                url: tab.url,
                title: tab.title
            });

            return tab;
        } catch (error) {
            console.error('Failed to get active tab:', error);
            return undefined;
        }
    }

    static async isContentScriptInjected(tabId: number): Promise<boolean> {
        try {
            const response = await Promise.race([
                chrome.tabs.sendMessage(tabId, { action: 'ping' }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 1000)
                )
            ]);

            const isInjected = response && (response as any).success === true;
            console.log(`Content script ${isInjected ? 'is' : 'is not'} injected in tab ${tabId}`);
            return isInjected;
        } catch (error) {
            console.log(`Content script not detected in tab ${tabId}:`, error);
            return false;
        }
    }

    static isTabSupported(tab: chrome.tabs.Tab): boolean {
        if (!tab.url) {
            console.warn('Tab URL is undefined');
            return false;
        }

        const unsupportedUrls = [
            'chrome://',
            'chrome-extension://',
            'moz-extension://',
            'about:',
            'edge://',
            'safari-extension://'
        ];

        const isSupported = !unsupportedUrls.some(prefix => tab.url!.startsWith(prefix));

        if (!isSupported) {
            console.warn(`Tab URL not supported: ${tab.url}`);
        }

        return isSupported;
    }
}

console.log('🚀 Service Worker loaded and running');
logger.info('Service Worker loaded and running');

// Check if commands API is available
if (chrome.commands) {
    logger.info('🎹 Commands API is available');

    chrome.commands.getAll().then((commands) => {
        logger.info('🔧 Registered commands on startup:', commands);
        commands.forEach(cmd => {
            logger.info(`  - ${cmd.name}: ${cmd.shortcut || 'No shortcut assigned'} - ${cmd.description || 'No description'}`);
        });

        if (commands.length === 0) {
            logger.warn('⚠️ No commands found! Extension may need to be reinstalled.');
        }
    }).catch(error => {
        logger.error('❌ Failed to get commands:', error);
    });
} else {
    logger.error('❌ Commands API is not available!');
}

// Command handling for keyboard shortcuts
if (chrome.commands) {
    chrome.commands.onCommand.addListener(async (command: string, tab?: chrome.tabs.Tab) => {
        logger.info(`🎹 Keyboard command received: ${command}`);
        logger.info('📍 Command received from tab:', tab ? {
            id: tab.id,
            url: tab.url,
            title: tab.title
        } : 'No tab info');

        try {
            if (command === 'paste_favorite_clipboard') {
                await handlePasteFavoriteCommand(tab);
            } else {
                logger.warn(`❓ Unknown command: ${command}`);
            }
        } catch (error) {
            logger.error('💥 Error handling command:', error);
            await showErrorNotification(`Failed to execute command: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}

async function handlePasteFavoriteCommand(tab?: chrome.tabs.Tab) {
    logger.info('📋 Processing paste_favorite_clipboard command...');

    try {
        const clipboardItems = await clipboardStorage.getClipboardItems();
        logger.info(`📦 Found ${clipboardItems.length} clipboard items`);

        // Find the favorite item - ensure we have a valid array
        if (!Array.isArray(clipboardItems) || clipboardItems.length === 0) {
            logger.warn('⚠️ No clipboard items found');
            await showNoFavoriteNotification();
            return;
        }

        const favoriteItem = clipboardItems.find(item =>
            item && typeof item === 'object' && item.isFavorite === true
        );

        logger.info('⭐ Favorite item:', favoriteItem ? {
            id: favoriteItem.id,
            title: favoriteItem.title,
            type: favoriteItem.type,
            contentLength: favoriteItem.content?.length || 0
        } : 'None found');

        if (!favoriteItem) {
            logger.warn('⚠️ No favorite clipboard item found');
            await showNoFavoriteNotification();
            return;
        }

        // Validate favorite item content
        if (!favoriteItem.content || typeof favoriteItem.content !== 'string') {
            logger.error('❌ Favorite item has invalid content', favoriteItem);
            await showErrorNotification('Favorite item content is invalid');
            return;
        }

        let activeTab = tab;
        if (!activeTab) {
            activeTab = await ContentScriptManager.getActiveTab();
            if (!activeTab) {
                logger.error('❌ No active tab found');
                await showErrorNotification('No active tab found');
                return;
            }
        }

        if (!activeTab.id) {
            logger.error('❌ Active tab has no ID');
            await showErrorNotification('Invalid tab');
            return;
        }

        if (!ContentScriptManager.isTabSupported(activeTab)) {
            logger.warn('⚠️ Cannot inject into system page:', activeTab.url);
            await chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon-48.png',
                title: 'ShortcutPaste',
                message: 'Cannot paste on this page. Try using it on a regular webpage.'
            });
            return;
        }

        logger.info(`📝 Attempting to paste content: "${favoriteItem.content.substring(0, 50)}..."`);
        logger.info(`📤 Sending to tab ID: ${activeTab.id}, URL: ${activeTab.url}`);

        try {
            // Use a more specific action name and include validation
            const response = await ContentScriptManager.sendMessageToTab(activeTab.id, {
                action: 'pasteDirectValue',
                content: favoriteItem.content,
                contentType: favoriteItem.type || 'text',
                itemId: favoriteItem.id
            });

            if (response?.success) {
                logger.info('✅ Direct paste successful!');
                await showSuccessNotification('Content pasted successfully!');
            } else {
                logger.error('❌ Direct paste failed:', response);
                await showErrorNotification(
                    response?.error || 'Failed to paste content directly'
                );
            }
        } catch (error) {
            logger.error('💥 Failed to direct paste content:', error);

            // Provide more specific error message
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('Could not establish connection')) {
                await showErrorNotification('Unable to connect to webpage. Try refreshing the page.');
            } else if (errorMessage.includes('Extension context invalidated')) {
                await showErrorNotification('Extension needs to be reloaded. Please refresh the extension.');
            } else {
                await showErrorNotification(`Failed to paste content: ${errorMessage}`);
            }
        }

    } catch (error) {
        logger.error('💥 Critical error in handlePasteFavoriteCommand:', error);

        // More specific error handling
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('storage')) {
            await showErrorNotification('Storage error: Unable to read clipboard data');
        } else if (errorMessage.includes('Unable to download all specified images')) {
            await showErrorNotification('Content processing error: Please try again');
        } else {
            await showErrorNotification(`Critical error: ${errorMessage}`);
        }
    }
}

async function showNoFavoriteNotification() {
    try {
        await chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon-48.png',
            title: 'ShortcutPaste',
            message: 'No favorite clipboard item found. Please set a favorite item first.'
        });
        logger.info('📢 Notification shown: No favorite item found');
    } catch (notifError) {
        logger.warn('📢 Notification failed:', notifError);
    }
}

async function showSuccessNotification(message: string) {
    try {
        await chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon-48.png',
            title: 'ShortcutPaste',
            message: message
        });
        logger.info('📢 Success notification shown:', message);
    } catch (notifError) {
        logger.warn('📢 Success notification failed:', notifError);
    }
}

async function showErrorNotification(message: string) {
    try {
        await chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon-48.png',
            title: 'ShortcutPaste Error',
            message: message
        });
        logger.info('📢 Error notification shown:', message);
    } catch (notifError) {
        logger.warn('📢 Error notification failed:', notifError);
    }
}

// Message handling
chrome.runtime.onMessage.addListener((request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    logger.info('📨 Runtime message received:', request);

    if (request.action === "getAuthToken") {
        getAuthToken(request.interactive || false)
            .then(token => sendResponse({ success: true, token }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === "removeAuthToken") {
        removeAuthToken(request.token)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === "clearAllTokens") {
        clearAllAuthTokens()
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === "getUserInfo") {
        getUserInfo(request.token)
            .then(userInfo => sendResponse({ success: true, userInfo }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === "testCommand") {
        logger.info('🧪 Manual command test triggered');
        handlePasteFavoriteCommand().then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    return true;
});

// Chrome Identity API helpers
async function getAuthToken(interactive: boolean = false): Promise<string> {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken(
            { interactive },
            (result: chrome.identity.GetAuthTokenResult) => {
                if (chrome.runtime.lastError) {
                    const error = new Error(chrome.runtime.lastError.message);
                    logger.error('Failed to get auth token:', error);
                    reject(error);
                    return;
                }

                if (!result?.token) {
                    const error = new Error('No token received');
                    logger.error('Failed to get auth token:', error);
                    reject(error);
                    return;
                }

                logger.info('✅ Auth token obtained successfully');
                resolve(result.token);
            }
        );
    });
}

async function removeAuthToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.identity.removeCachedAuthToken(
            { token },
            () => {
                if (chrome.runtime.lastError) {
                    const error = new Error(chrome.runtime.lastError.message);
                    logger.error('Failed to remove auth token:', error);
                    reject(error);
                    return;
                }
                logger.info('✅ Auth token removed successfully');
                resolve();
            }
        );
    });
}

async function clearAllAuthTokens(): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.identity.clearAllCachedAuthTokens(() => {
            if (chrome.runtime.lastError) {
                const error = new Error(chrome.runtime.lastError.message);
                logger.error('Failed to clear auth tokens:', error);
                reject(error);
                return;
            }
            logger.info('✅ All auth tokens cleared successfully');
            resolve();
        });
    });
}

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
        logger.info('✅ User info fetched successfully');
        return userInfo;
    } catch (error) {
        logger.error('Error fetching user info:', error);
        throw error;
    }
}

// Handle extension errors
self.addEventListener('error', (event) => {
    logger.error('💥 ShortcutPaste service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    logger.error('💥 ShortcutPaste service worker unhandled rejection:', event.reason);
});

// Periodic check to ensure commands are registered
setInterval(async () => {
    try {
        const commands = await chrome.commands.getAll();
        if (commands.length === 0) {
            logger.warn('⚠️ Commands not found during periodic check - extension may need reinstall');
        }
    } catch (error) {
        logger.error('❌ Error during periodic command check:', error);
    }
}, 300000); // Check every 5 minutes