import React, { useState, useEffect } from "react";
import ClipboardTreeView from "./ClipboardTreeView";
import ClipboardContentViewer from "./ClipboardContentViewer";
import { ClipboardFolder, ClipboardItem } from "@/types/clipboard";
import { clipboardStorage } from "@/shared/utils/clipboard-storage";
import {
  Search,
  Filter,
  Camera,
  RefreshCw,
  Settings,
  Loader,
  AlertCircle,
} from "lucide-react";

const Popup: React.FC = () => {
  const [folders, setFolders] = useState<ClipboardFolder[]>([]);
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ClipboardItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<
    "all" | "text" | "image" | "url" | "html"
  >("all");

  // Load data on component mount
  useEffect(() => {
    loadClipboardData();
  }, []);

  // Listen for clipboard changes
  useEffect(() => {
    const handleClipboardChange = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text.trim()) {
          await addClipboardItem({
            content: text,
            type: detectContentType(text),
            title: generateTitle(text),
            size: new Blob([text]).size,
          });
          loadClipboardData();
        }
      } catch (error) {
        // Clipboard access failed, ignore
      }
    };

    // Check clipboard every 2 seconds when popup is active
    const interval = setInterval(handleClipboardChange, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadClipboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [loadedFolders, loadedItems] = await Promise.all([
        clipboardStorage.getClipboardFolders(),
        clipboardStorage.getClipboardItems(),
      ]);

      setFolders(loadedFolders);
      setItems(loadedItems);

      // If an item was selected and still exists, keep it selected
      if (selectedItem) {
        const stillExists = loadedItems.find(
          (item) => item.id === selectedItem.id
        );
        if (!stillExists) {
          setSelectedItem(null);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load clipboard data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const detectContentType = (content: string): ClipboardItem["type"] => {
    if (content.startsWith("data:image/")) return "image";
    if (content.startsWith("http://") || content.startsWith("https://"))
      return "url";
    if (content.includes("<") && content.includes(">")) return "html";
    return "text";
  };

  const generateTitle = (content: string, maxLength = 50): string => {
    const firstLine = content.split("\n")[0].trim();
    if (firstLine.length <= maxLength) return firstLine;
    return firstLine.substring(0, maxLength) + "...";
  };

  const addClipboardItem = async (
    itemData: Omit<ClipboardItem, "id" | "timestamp">
  ) => {
    try {
      const newItem = await clipboardStorage.addClipboardItem(itemData);
      setItems((prev) => [newItem, ...prev.slice(0, 999)]);
      return newItem;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add clipboard item"
      );
      return null;
    }
  };

  const handleSelectItem = (item: ClipboardItem) => {
    setSelectedItem(item);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const success = await clipboardStorage.deleteClipboardItem(id);
      if (success) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      const success = await clipboardStorage.deleteFolder(id);
      if (success) {
        await loadClipboardData(); // Reload to update tree structure
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete folder");
    }
  };

  const handleCreateFolder = async (name: string, parentId?: string) => {
    try {
      await clipboardStorage.createFolder(name, parentId);
      await loadClipboardData(); // Reload to update tree structure
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    }
  };

  const handleToggleFolder = async (id: string) => {
    const updateFolderExpanded = (
      folders: ClipboardFolder[]
    ): ClipboardFolder[] => {
      return folders.map((folder) => {
        if (folder.id === id) {
          return { ...folder, expanded: !folder.expanded };
        }
        if (folder.children.length > 0) {
          return { ...folder, children: updateFolderExpanded(folder.children) };
        }
        return folder;
      });
    };

    const updatedFolders = updateFolderExpanded(folders);
    setFolders(updatedFolders);
    await clipboardStorage.saveClipboardFolders(updatedFolders);
  };

  const handleCopyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // You could add a toast notification here
    } catch (err) {
      setError("Failed to copy to clipboard");
    }
  };

  const handleUpdateItem = async (
    id: string,
    updates: Partial<ClipboardItem>
  ) => {
    try {
      const updatedItems = items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
      setItems(updatedItems);
      await clipboardStorage.saveClipboardItems(updatedItems);

      if (selectedItem?.id === id) {
        setSelectedItem({ ...selectedItem, ...updates });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  const handleCaptureScreenshot = async () => {
    try {
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const video = document.createElement("video");

      video.srcObject = stream;
      video.play();

      video.addEventListener("loadedmetadata", () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0);

        // Stop the stream
        stream.getTracks().forEach((track) => track.stop());

        // Convert to data URL
        const dataURL = canvas.toDataURL("image/png");

        // Add as clipboard item
        addClipboardItem({
          content: dataURL,
          type: "image",
          title: `Screenshot ${new Date().toLocaleString()}`,
          size: dataURL.length,
        });
      });
    } catch (err) {
      setError("Failed to capture screenshot");
    }
  };

  // Filter items based on search and type
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || item.type === filterType;

    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="w-[800px] h-[600px] bg-drawer-background text-text-primary flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-8 w-8 mb-4 mx-auto text-primary" />
          <p className="text-text-secondary">Loading clipboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[800px] h-[600px] bg-drawer-background text-text-primary flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <h1 className="text-xl font-semibold">Clipboard Manager</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCaptureScreenshot}
            className="flex items-center gap-2 px-3 py-1.5 bg-button-second-bg hover:bg-button-second-bg-hover rounded-lg text-sm transition-colors"
          >
            <Camera size={14} />
            Screenshot
          </button>

          <button
            onClick={loadClipboardData}
            className="flex items-center gap-2 px-3 py-1.5 bg-button-second-bg hover:bg-button-second-bg-hover rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>

          <button
            onClick={() => window.close()}
            className="flex items-center gap-2 px-3 py-1.5 bg-button-second-bg hover:bg-button-second-bg-hover rounded-lg text-sm transition-colors"
          >
            <Settings size={14} />
            Close
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3 p-4 border-b border-border-default">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clipboard items..."
            className="w-full pl-10 pr-4 py-2 bg-input-background border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-text-secondary" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-input-background border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="text">Text</option>
            <option value="image">Images</option>
            <option value="url">URLs</option>
            <option value="html">HTML</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-400">
            {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Tree View */}
        <div className="w-80 border-r border-border-default bg-sidebar-background">
          <ClipboardTreeView
            folders={folders}
            items={filteredItems}
            selectedItemId={selectedItem?.id}
            onSelectItem={handleSelectItem}
            onDeleteItem={handleDeleteItem}
            onDeleteFolder={handleDeleteFolder}
            onCreateFolder={handleCreateFolder}
            onToggleFolder={handleToggleFolder}
          />
        </div>

        {/* Right Panel - Content Viewer */}
        <div className="flex-1 p-4">
          <ClipboardContentViewer
            item={selectedItem}
            onCopyToClipboard={handleCopyToClipboard}
            onUpdateItem={handleUpdateItem}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-2 border-t border-border-default bg-sidebar-background text-xs text-text-secondary">
        <span>{filteredItems.length} items</span>
        <span>Last updated: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default Popup;
