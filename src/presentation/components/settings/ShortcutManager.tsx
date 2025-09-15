import React, { useState } from "react";
import { Snippet } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Save, Keyboard } from "lucide-react";

interface ShortcutManagerProps {
  snippets: Snippet[];
}

const ShortcutManager: React.FC<ShortcutManagerProps> = ({ snippets }) => {
  const [editingSnippet, setEditingSnippet] = useState<string | null>(null);
  const [shortcutInput, setShortcutInput] = useState("");

  const handleSetShortcut = (
    snippetId: string,
    currentShortcut: string = ""
  ) => {
    setEditingSnippet(snippetId);
    setShortcutInput(currentShortcut);
  };

  const handleSaveShortcut = async (snippetId: string) => {
    // This would typically update the snippet with the new shortcut
    // For now, we'll just log it
    console.log(`Setting shortcut for ${snippetId}: ${shortcutInput}`);
    setEditingSnippet(null);
    setShortcutInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    const key = e.key.toUpperCase();

    if (key === "ESCAPE") {
      setEditingSnippet(null);
      return;
    }

    if (key === "ENTER") {
      if (editingSnippet) {
        handleSaveShortcut(editingSnippet);
      }
      return;
    }

    let newShortcut = "";
    if (e.ctrlKey) newShortcut += "Ctrl+";
    if (e.shiftKey) newShortcut += "Shift+";
    if (e.altKey) newShortcut += "Alt+";
    if (e.metaKey) newShortcut += "Meta+";

    // Don't include modifier keys alone
    if (!["CONTROL", "SHIFT", "ALT", "META"].includes(key)) {
      newShortcut += key;
    }

    setShortcutInput(newShortcut);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard size={20} />
          Keyboard Shortcuts
        </CardTitle>
        <CardDescription>
          Configure keyboard shortcuts for quick snippet pasting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-4">
            {snippets.map((snippet) => (
              <div
                key={snippet.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card-background"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-text-primary">
                    {snippet.title}
                  </h4>
                  <p className="text-sm text-text-secondary">
                    {snippet.content}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {editingSnippet === snippet.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={shortcutInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Press a key combination..."
                        className="w-32"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveShortcut(snippet.id)}
                        className="flex items-center gap-1"
                      >
                        <Save size={14} />
                        Save
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded text-sm">
                        {snippet.shortcut || "No shortcut"}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSetShortcut(snippet.id, snippet.shortcut)
                        }
                      >
                        Set Shortcut
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-sidebar-background rounded-lg">
            <h4 className="font-semibold text-text-primary mb-2">
              Shortcut Guide
            </h4>
            <ul className="text-sm text-text-secondary space-y-1">
              <li>• Global overlay: Ctrl+Shift+Space</li>
              <li>• Quick paste 1-3: Ctrl+Shift+1 to Ctrl+Shift+3</li>
              <li>• Use Ctrl, Shift, Alt, or Meta with any key</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShortcutManager;
