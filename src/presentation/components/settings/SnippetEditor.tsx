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
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Save, Trash2 } from "lucide-react";

interface SnippetEditorProps {
  snippet: Snippet;
  onSave: (
    id: string,
    updates: Partial<Omit<Snippet, "id">>
  ) => Promise<Snippet | undefined>;
  onDelete: (id: string) => Promise<boolean>;
}

const SnippetEditor: React.FC<SnippetEditorProps> = ({
  snippet,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState(snippet.title);
  const [content, setContent] = useState(snippet.content);
  const [category, setCategory] = useState(snippet.category || "");
  const [shortcut, setShortcut] = useState(snippet.shortcut || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(snippet.id, {
        title,
        content,
        category: category || undefined,
        shortcut: shortcut || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this snippet?")) {
      await onDelete(snippet.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Snippet</CardTitle>
        <CardDescription>
          Modify your snippet content and settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Snippet title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Snippet content"
            rows={6}
            className="font-mono text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="General"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortcut">Shortcut</Label>
            <Input
              id="shortcut"
              value={shortcut}
              onChange={(e) => setShortcut(e.target.value.toUpperCase())}
              placeholder="Ctrl+Shift+1"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="flex items-center gap-2"
          >
            <Trash2 size={16} />
            Delete
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !content.trim()}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SnippetEditor;
