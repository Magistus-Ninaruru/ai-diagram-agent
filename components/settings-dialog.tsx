"use client";

import { useState, useCallback } from "react";
import { Settings, Plus, Trash2, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { LLMSettings, ProviderConfig } from "@/lib/settings";

interface SettingsDialogProps {
  settings: LLMSettings;
  onSave: (settings: LLMSettings) => void;
}

export function SettingsDialog({ settings, onSave }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LLMSettings>(settings);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newModel, setNewModel] = useState("");
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testError, setTestError] = useState("");

  const handleOpen = (o: boolean) => {
    if (o) setDraft(structuredClone(settings));
    setOpen(o);
  };

  const activeProvider = draft.providers.find(
    (p) => p.id === draft.selectedProvider
  );

  const handleTestConnection = useCallback(async () => {
    if (!activeProvider) return;
    const modelId = draft.selectedModel || activeProvider.models[0];
    if (!modelId) {
      setTestStatus("error");
      setTestError("Add at least one model first");
      return;
    }
    setTestStatus("testing");
    setTestError("");
    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: activeProvider.id,
          model: modelId,
          baseUrl: activeProvider.baseUrl,
          apiKey: activeProvider.apiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
        setTestError(data.error || "Connection failed");
      }
    } catch {
      setTestStatus("error");
      setTestError("Network error");
    }
  }, [activeProvider, draft.selectedModel]);

  const updateProvider = (
    providerId: string,
    updates: Partial<ProviderConfig>
  ) => {
    setDraft((prev) => ({
      ...prev,
      providers: prev.providers.map((p) =>
        p.id === providerId ? { ...p, ...updates } : p
      ),
    }));
    // Reset test status when credentials change
    if ("baseUrl" in updates || "apiKey" in updates) {
      setTestStatus("idle");
      setTestError("");
    }
  };

  const addModel = (providerId: string) => {
    if (!newModel.trim()) return;
    updateProvider(providerId, {
      models: [
        ...(draft.providers.find((p) => p.id === providerId)?.models || []),
        newModel.trim(),
      ],
    });
    setNewModel("");
  };

  const removeModel = (providerId: string, model: string) => {
    const provider = draft.providers.find((p) => p.id === providerId);
    if (!provider) return;
    updateProvider(providerId, {
      models: provider.models.filter((m) => m !== model),
    });
    // If removed model was selected, reset selection
    if (draft.selectedModel === model) {
      const remaining = provider.models.filter((m) => m !== model);
      setDraft((prev) => ({
        ...prev,
        selectedModel: remaining[0] || "",
      }));
    }
  };

  const handleSave = () => {
    onSave(draft);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>LLM Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Provider selector */}
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={draft.selectedProvider}
              onValueChange={(v) =>
                v &&
                setDraft((prev) => {
                  const provider = prev.providers.find((p) => p.id === v);
                  return {
                    ...prev,
                    selectedProvider: v,
                    selectedModel: provider?.models[0] || "",
                  };
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {draft.providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Provider config */}
          {activeProvider && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={activeProvider.baseUrl}
                  onChange={(e) =>
                    updateProvider(activeProvider.id, {
                      baseUrl: e.target.value,
                    })
                  }
                  placeholder="https://api.openai.com/v1"
                />
                <p className="text-[11px] text-muted-foreground">
                  API endpoint. Use a custom URL for proxies or compatible
                  services.
                </p>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys[activeProvider.id] ? "text" : "password"}
                    value={activeProvider.apiKey}
                    onChange={(e) =>
                      updateProvider(activeProvider.id, {
                        apiKey: e.target.value,
                      })
                    }
                    placeholder="sk-..."
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() =>
                      setShowKeys((prev) => ({
                        ...prev,
                        [activeProvider.id]: !prev[activeProvider.id],
                      }))
                    }
                  >
                    {showKeys[activeProvider.id] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Test Connection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={testStatus === "testing"}
                    onClick={handleTestConnection}
                    className="gap-1.5"
                  >
                    {testStatus === "testing" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    {testStatus === "testing" ? "Testing..." : "Test Connection"}
                  </Button>
                  {testStatus === "success" && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Connected
                    </span>
                  )}
                  {testStatus === "error" && (
                    <span className="flex items-center gap-1 text-xs text-destructive">
                      <XCircle className="h-3.5 w-3.5" />
                      {testError}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Test using the active model (or first model if none selected).
                </p>
              </div>

              <Separator />

              {/* Models */}
              <div className="space-y-2">
                <Label>Models</Label>
                <div className="space-y-1.5">
                  {activeProvider.models.map((model) => (
                    <div
                      key={model}
                      className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                    >
                      <span className="font-mono text-xs">{model}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeModel(activeProvider.id, model)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="Add model name..."
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addModel(activeProvider.id);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => addModel(activeProvider.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Active model */}
              <div className="space-y-2">
                <Label>Active Model</Label>
                {activeProvider.models.length > 0 ? (
                  <Select
                    value={draft.selectedModel}
                    onValueChange={(v) =>
                      v &&
                      setDraft((prev) => ({ ...prev, selectedModel: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProvider.models.map((m) => (
                        <SelectItem key={m} value={m}>
                          <span className="font-mono text-xs">{m}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Add at least one model above.
                  </p>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Draw.io URL */}
          <div className="space-y-2">
            <Label>Draw.io URL</Label>
            <Input
              value={draft.drawioUrl}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, drawioUrl: e.target.value }))
              }
              placeholder="Leave empty for auto-detect (default)"
            />
            <p className="text-[11px] text-muted-foreground">
              Custom draw.io editor URL. Self-host with Docker:{" "}
              <code className="bg-muted px-1 rounded">docker run -d -p 8080:8080 jgraph/drawio</code>{" "}
              then enter <code className="bg-muted px-1 rounded">http://localhost:8080</code>
            </p>
          </div>

          <Separator />

          {/* Iconfont.cn */}
          <div className="space-y-3">
            <Label>Iconfont.cn Icons</Label>
            <div className="space-y-2">
              <Input
                value={draft.iconfontUrl}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, iconfontUrl: e.target.value }))
                }
                placeholder="//at.alicdn.com/t/c/font_xxx.css"
              />
              <p className="text-[11px] text-muted-foreground">
                Font-class CSS link from your{" "}
                <a
                  href="https://www.iconfont.cn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  iconfont.cn
                </a>{" "}
                project. Find it under &quot;Font class&quot; tab.
              </p>
            </div>
            <div className="space-y-2">
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={draft.iconfontIcons}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, iconfontIcons: e.target.value }))
                }
                placeholder="server, database, cloud, user, network, settings, lock, search"
                rows={2}
              />
              <p className="text-[11px] text-muted-foreground">
                Comma-separated <strong>CSS class names</strong> from your iconfont project (the part after{" "}
                <code className="bg-muted px-1 rounded">icon-</code>).
                Use the exact name shown in the Font class tab, e.g.{" "}
                <code className="bg-muted px-1 rounded">oss</code> not{" "}
                <code className="bg-muted px-1 rounded line-through">对象存储oss</code>.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
