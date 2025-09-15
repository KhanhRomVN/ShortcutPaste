import React, { useState } from "react";
import { Snippet } from "@/types";
import { useSnippets } from "@/hooks/useSnippets";
import SnippetEditor from "./SnippetEditor";
import ShortcutManager from "./ShortcutManager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Plus, Settings, Keyboard } from "lucide-react";

const SettingsPanel: React.FC = () => {
  const { snippets, createSnippet, updateSnippet, deleteSnippet } =
    useSnippets();
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [activeTab, setActiveTab] = useState("snippets");

  const handleCreateSnippet = () => {
    const newSnippet: Omit<Snippet, "id" | "createdAt" | "updatedAt"> = {
      title: "New Snippet",
      content: "",
      category: "general",
    };
    createSnippet(newSnippet).then((snippet) => {
      setSelectedSnippet(snippet);
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-text-primary">
          ShortcutPaste Settings
        </h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="snippets" className="flex items-center gap-2">
            <Settings size={16} />
            Snippets
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="flex items-center gap-2">
            <Keyboard size={16} />
            Shortcuts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="snippets">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Snippet Management</CardTitle>
                  <CardDescription>
                    Create and manage your text snippets for quick pasting
                  </CardDescription>
                </div>
                <Button
                  onClick={handleCreateSnippet}
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  New Snippet
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-text-primary">
                    Your Snippets
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {snippets.map((snippet) => (
                      <div
                        key={snippet.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedSnippet?.id === snippet.id
                            ? "bg-primary/10 border-primary"
                            : "bg-card-background border-border-default hover:bg-sidebar-item-hover"
                        }`}
                        onClick={() => setSelectedSnippet(snippet)}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-text-primary">
                            {snippet.title}
                          </h4>
                          {snippet.shortcut && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                              {snippet.shortcut}
                            </span>
                          )}
                        </div>
                        {snippet.category && (
                          <span className="text-xs text-text-secondary">
                            {snippet.category}
                          </span>
                        )}
                        <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                          {snippet.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-4">
                    {selectedSnippet
                      ? "Edit Snippet"
                      : "Select a snippet to edit"}
                  </h3>
                  {selectedSnippet && (
                    <SnippetEditor
                      snippet={selectedSnippet}
                      onSave={updateSnippet}
                      onDelete={deleteSnippet}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shortcuts">
          <ShortcutManager snippets={snippets} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPanel;
