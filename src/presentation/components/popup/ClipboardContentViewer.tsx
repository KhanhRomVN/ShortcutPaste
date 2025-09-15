// src/presentation/components/popup/clipboard/ClipboardContentViewer.tsx

import React, { useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Image,
  Link,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { ClipboardItem } from "@/types/clipboard";

interface ClipboardContentViewerProps {
  item: ClipboardItem | null;
  onCopyToClipboard: (content: string) => void;
  onUpdateItem?: (id: string, updates: Partial<ClipboardItem>) => void;
}

const ClipboardContentViewer: React.FC<ClipboardContentViewerProps> = ({
  item,
  onCopyToClipboard,
  onUpdateItem,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showRawContent, setShowRawContent] = useState(false);

  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card-background rounded-lg">
        <div className="text-center text-text-secondary">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No item selected</p>
          <p className="text-sm">Select a clipboard item to view its content</p>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getItemIcon = () => {
    switch (item.type) {
      case "image":
        return <Image size={20} className="text-blue-500" />;
      case "url":
        return <Link size={20} className="text-green-500" />;
      case "html":
        return <FileText size={20} className="text-orange-500" />;
      default:
        return <FileText size={20} className="text-gray-500" />;
    }
  };

  const handleStartEdit = () => {
    setEditTitle(item.title);
    setEditContent(item.content);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (
      onUpdateItem &&
      (editTitle !== item.title || editContent !== item.content)
    ) {
      onUpdateItem(item.id, {
        title: editTitle.trim() || item.title,
        content: editContent,
        size: new Blob([editContent]).size,
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle("");
    setEditContent("");
  };

  const handleDownload = () => {
    const blob = new Blob([item.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenUrl = () => {
    if (item.type === "url") {
      window.open(item.content, "_blank");
    }
  };

  const renderContent = () => {
    const content = isEditing ? editContent : item.content;

    if (item.type === "image" && content.startsWith("data:image")) {
      return (
        <div className="space-y-4">
          <img
            src={content}
            alt={item.title}
            className="max-w-full max-h-96 object-contain rounded-lg border border-border-default"
          />
          {showRawContent && (
            <div className="bg-input-background rounded-lg p-3">
              <pre className="text-xs text-text-secondary whitespace-pre-wrap break-all">
                {content.substring(0, 200)}...
              </pre>
            </div>
          )}
        </div>
      );
    }

    if (item.type === "html" && !showRawContent) {
      return (
        <div className="space-y-4">
          <div
            className="bg-white rounded-lg border border-border-default p-4 max-h-96 overflow-auto"
            dangerouslySetInnerHTML={{ __html: content }}
          />
          <button
            onClick={() => setShowRawContent(true)}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Eye size={14} />
            Show Raw HTML
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-64 p-3 border border-border-default rounded-lg bg-input-background text-text-primary font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Content..."
          />
        ) : (
          <div className="bg-input-background rounded-lg p-4 max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap break-words text-sm font-mono text-text-primary">
              {content}
            </pre>
          </div>
        )}

        {item.type === "html" && showRawContent && (
          <button
            onClick={() => setShowRawContent(false)}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <EyeOff size={14} />
            Show Rendered HTML
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-card-background rounded-lg p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {getItemIcon()}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-lg font-semibold bg-input-background border border-border-default rounded px-2 py-1 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Title..."
              />
            ) : (
              <h2 className="text-lg font-semibold text-text-primary truncate">
                {item.title}
              </h2>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
              <span>{formatTime(item.timestamp)}</span>
              <span>•</span>
              <span>{formatFileSize(item.size)}</span>
              <span>•</span>
              <span className="capitalize">{item.type}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-3 py-1.5 bg-button-second-bg text-text-primary text-sm rounded-lg hover:bg-button-second-bg-hover transition-colors"
              >
                <X size={14} />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onCopyToClipboard(item.content)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Copy size={14} />
                Copy
              </button>

              {onUpdateItem && (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-2 px-3 py-1.5 bg-button-second-bg text-text-primary text-sm rounded-lg hover:bg-button-second-bg-hover transition-colors"
                >
                  <Edit3 size={14} />
                  Edit
                </button>
              )}

              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-1.5 bg-button-second-bg text-text-primary text-sm rounded-lg hover:bg-button-second-bg-hover transition-colors"
              >
                <Download size={14} />
                Download
              </button>

              {item.type === "url" && (
                <button
                  onClick={handleOpenUrl}
                  className="flex items-center gap-2 px-3 py-1.5 bg-button-second-bg text-text-primary text-sm rounded-lg hover:bg-button-second-bg-hover transition-colors"
                >
                  <ExternalLink size={14} />
                  Open
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default ClipboardContentViewer;
