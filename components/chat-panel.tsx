"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Send,
  ImagePlus,
  X,
  Bot,
  User,
  Sparkles,
  AlertCircle,
  PanelLeftOpen,
  SquarePen,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { parseDiagrams } from "@/lib/parse-diagram";
import { SettingsDialog } from "@/components/settings-dialog";
import { ChatHistoryPanel } from "@/components/chat-history-panel";
import {
  type LLMSettings,
  getActiveProvider,
} from "@/lib/settings";
import { type SerializedMessage, deriveTitle } from "@/lib/chat-history";

/** Shape returned by the conversations API */
interface ConversationRecord {
  id: string;
  title: string;
  messages: SerializedMessage[];
  mermaidCode: string;
  drawioXml: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatPanelProps {
  settings: LLMSettings;
  onSettingsChange: (settings: LLMSettings) => void;
  onMermaidCode: (code: string) => void;
  onDrawioXml: (xml: string) => void;
  /** Current diagram state — needed for saving with conversation */
  mermaidCode: string;
  drawioXml: string;
}

/** Extract text content from UIMessage parts */
function getMessageText(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

export function ChatPanel({
  settings,
  onSettingsChange,
  onMermaidCode,
  onDrawioXml,
  mermaidCode,
  drawioXml,
}: ChatPanelProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastParsedRef = useRef<string>("");

  // ---- Conversation history state ----
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationRecord | null>(null);
  const activeConvRef = useRef<ConversationRecord | null>(null);
  activeConvRef.current = activeConv;

  // Load conversations from server after mount
  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data: ConversationRecord[]) => {
        if (Array.isArray(data)) {
          setConversations(data);
          // Restore the most recent conversation if available
          if (data.length > 0) {
            const latest = data[0]; // already sorted by updatedAt desc
            setActiveConv(latest);
            // Restore messages in the chat
            const restored = latest.messages.map((m) => ({
              ...m,
              parts: m.parts as Array<{ type: string; text?: string }>,
            }));
            setMessages(restored as Parameters<typeof setMessages>[0]);
            onMermaidCode(latest.mermaidCode);
            onDrawioXml(latest.drawioXml);
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeProvider = getActiveProvider(settings);

  // Keep a ref to always read the latest settings
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, id, trigger, messageId }) => {
          const s = settingsRef.current;
          const provider = getActiveProvider(s);
          return {
            body: {
              messages,
              id,
              trigger,
              messageId,
              provider: s.selectedProvider,
              model: s.selectedModel,
              baseUrl: provider?.baseUrl || "",
              apiKey: provider?.apiKey || "",
            },
          };
        },
      }),
    []
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
    experimental_throttle: 50, // Cap UI updates to ~20fps for smooth streaming
    onFinish: ({ message }) => {
      const text = getMessageText(message.parts);
      const diagrams = parseDiagrams(text);
      if (diagrams.mermaid) onMermaidCode(diagrams.mermaid);
      if (diagrams.drawioXml) onDrawioXml(diagrams.drawioXml);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // ---- Debounced save: only persist after streaming settles (1s idle) ----
  const diagramRef = useRef({ mermaidCode, drawioXml });
  diagramRef.current = { mermaidCode, drawioXml };
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (messages.length === 0) return;

    // Clear previous debounce timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    // Debounce: save after 1s of no changes (or immediately if not streaming)
    const delay = isLoading ? 1000 : 0;
    saveTimerRef.current = setTimeout(() => {
      const conv = activeConvRef.current;
      const serialized: SerializedMessage[] = messages.map((m) => ({
        id: m.id,
        role: m.role as SerializedMessage["role"],
        parts: m.parts as SerializedMessage["parts"],
      }));
      const title = deriveTitle(serialized);
      const mCode = diagramRef.current.mermaidCode;
      const dXml = diagramRef.current.drawioXml;

      if (conv?.id) {
        // Update existing conversation on server
        fetch(`/api/conversations/${conv.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, messages: serialized, mermaidCode: mCode, drawioXml: dXml }),
        })
          .then((r) => r.json())
          .then((updated: ConversationRecord) => {
            setActiveConv(updated);
            setConversations((prev) => {
              const idx = prev.findIndex((c) => c.id === updated.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = updated;
                return next;
              }
              return [updated, ...prev];
            });
          })
          .catch(() => {});
      } else {
        // Create new conversation on server
        fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, messages: serialized, mermaidCode: mCode, drawioXml: dXml }),
        })
          .then((r) => r.json())
          .then((created: ConversationRecord) => {
            setActiveConv(created);
            setConversations((prev) => [created, ...prev]);
          })
          .catch(() => {});
      }
    }, delay);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isLoading]);

  // ---- Conversation actions ----
  const saveCurrentAndSwitch = useCallback(
    (target: ConversationRecord) => {
      // Restore target messages & diagrams
      const restored = target.messages.map((m) => ({
        ...m,
        parts: m.parts as Array<{ type: string; text?: string }>,
      }));
      setMessages(restored as Parameters<typeof setMessages>[0]);
      setActiveConv(target);
      onMermaidCode(target.mermaidCode);
      onDrawioXml(target.drawioXml);
      lastParsedRef.current = "";
    },
    [setMessages, onMermaidCode, onDrawioXml]
  );

  const handleNewChat = useCallback(() => {
    setActiveConv(null);
    setMessages([]);
    onMermaidCode("");
    onDrawioXml("");
    lastParsedRef.current = "";
    setShowHistory(false);
  }, [setMessages, onMermaidCode, onDrawioXml]);

  const handleSelectConv = useCallback(
    (id: string) => {
      if (id === activeConv?.id) {
        setShowHistory(false);
        return;
      }
      const target = conversations.find((c) => c.id === id);
      if (target) {
        saveCurrentAndSwitch(target);
        setShowHistory(false);
      }
    },
    [activeConv?.id, conversations, saveCurrentAndSwitch]
  );

  const handleDeleteConv = useCallback(
    (id: string) => {
      fetch(`/api/conversations/${id}`, { method: "DELETE" }).catch(() => {});
      setConversations((prev) => prev.filter((c) => c.id !== id));
      // If we deleted the active conversation, start a new one
      if (id === activeConv?.id) {
        handleNewChat();
      }
    },
    [activeConv?.id, handleNewChat]
  );

  // Parse streaming messages for real-time diagram updates (debounced 300ms)
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    const text = getMessageText(lastAssistant.parts);
    if (text === lastParsedRef.current) return;

    if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
    parseTimerRef.current = setTimeout(() => {
      lastParsedRef.current = text;
      const diagrams = parseDiagrams(text);
      if (diagrams.mermaid) onMermaidCode(diagrams.mermaid);
      if (diagrams.drawioXml) onDrawioXml(diagrams.drawioXml);
    }, 300);

    return () => {
      if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
    };
  }, [messages, onMermaidCode, onDrawioXml]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSettingsSave = useCallback(
    (newSettings: LLMSettings) => {
      onSettingsChange(newSettings);
    },
    [onSettingsChange]
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = useCallback(() => {
    const text =
      inputText.trim() ||
      (imagePreview
        ? "Please analyze this architecture diagram and recreate it in both Mermaid and draw.io format."
        : "");

    if (!text && !imagePreview) return;

    sendMessage({ text });
    setInputText("");
    removeImage();
  }, [inputText, imagePreview, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const availableModels = activeProvider?.models || [];

  // Sort conversations: most recent first
  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
    [conversations]
  );

  return (
    <div className="flex h-full">
      {/* History sidebar */}
      {showHistory && (
        <div className="w-56 shrink-0">
          <ChatHistoryPanel
            conversations={sortedConversations}
            activeId={activeConv?.id || ""}
            onSelect={handleSelectConv}
            onDelete={handleDeleteConv}
            onClose={() => setShowHistory(false)}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex flex-1 h-full flex-col glass-panel min-w-0">
        {/* Header */}
        <div className="glass-header flex items-center justify-between px-3 py-3 gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setShowHistory((v) => !v)}
              title="Chat history"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleNewChat}
              title="New chat"
            >
              <SquarePen className="h-4 w-4" />
            </Button>
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0 ml-1" />
            <h2 className="text-xs font-semibold truncate">
              {!activeConv || activeConv.title === "New Chat"
                ? "AI Diagram Assistant"
                : activeConv.title}
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {availableModels.length > 0 && (
              <Select
                value={settings.selectedModel}
                onValueChange={(v) =>
                  v &&
                  handleSettingsSave({ ...settings, selectedModel: v })
                }
              >
                <SelectTrigger className="w-[130px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      <span className="font-mono">{m}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <SettingsDialog settings={settings} onSave={handleSettingsSave} />
          </div>
        </div>

        {/* No API key warning */}
        {activeProvider && !activeProvider.apiKey && (
          <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b text-xs text-yellow-700 dark:text-yellow-300">
            No API key configured for {activeProvider.name}. Click the gear
            icon to add one.
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bot className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h3 className="font-medium text-sm">
                  Describe a diagram to get started
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                  For example: &quot;Draw a microservices architecture with an
                  API gateway, 3 services, and a database&quot;
                </p>
                <div className="mt-4 grid gap-2 w-full max-w-[280px]">
                  {[
                    "Flowchart for user login process",
                    "Microservices architecture diagram",
                    "Database ER diagram for e-commerce",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      className="text-xs text-left px-3 py-2 rounded-lg border hover:bg-muted transition-colors"
                      onClick={() => setInputText(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => {
              const text = getMessageText(message.parts);
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <MessageContent content={text} />
                  </div>
                  {message.role === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-xl px-3.5 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
                <div className="bg-destructive/10 text-destructive rounded-xl px-3.5 py-2.5 text-sm max-w-[85%]">
                  <p className="font-medium text-xs mb-0.5">Error</p>
                  <p className="text-xs opacity-80">{error.message}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Dual-agent pipeline visualization */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2.5 px-3 py-2">
            {/* Agent 1: Generator */}
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-500 ${
                status === "submitted"
                  ? "border-blue-400/60 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 shadow-[0_0_12px_-3px_rgba(59,130,246,0.4)]"
                  : "border-green-400/40 bg-green-50/50 dark:bg-green-500/5 text-green-600 dark:text-green-400"
              }`}
            >
              {status === "submitted" ? (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                </span>
              ) : (
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              )}
              Agent 1
            </div>

            {/* Arrow connector */}
            <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />

            {/* Agent 2: Optimizer */}
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-500 ${
                status === "streaming"
                  ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 shadow-[0_0_12px_-3px_rgba(16,185,129,0.4)]"
                  : "border-border text-muted-foreground/50"
              }`}
            >
              {status === "streaming" ? (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
              ) : (
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
              )}
              Agent 2
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-3">
          {imagePreview && (
            <div className="relative mb-2 inline-block">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="h-16 w-auto rounded-lg border object-cover"
              />
              <button
                onClick={removeImage}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the diagram you want..."
              className="min-h-[36px] max-h-[120px] resize-none text-sm"
              rows={1}
            />
            <Button
              type="button"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={isLoading || (!inputText.trim() && !imagePreview)}
              onClick={handleSend}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Render message content, hiding raw code blocks and showing status badges */
function MessageContent({ content }: { content: string }) {
  const hasMermaid = /```mermaid[\s\S]*?```/.test(content);
  const hasDrawio = /```drawio-xml[\s\S]*?```/.test(content);

  let display = content;
  display = display.replace(/```mermaid[\s\S]*?```/g, "").trim();
  display = display.replace(/```drawio-xml[\s\S]*?```/g, "").trim();

  return (
    <div className="space-y-2">
      {(hasMermaid || hasDrawio) && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-300">
            Reviewed &amp; optimised
          </span>
          {hasMermaid && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
              Mermaid ✓
            </span>
          )}
          {hasDrawio && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-300">
              Draw.io ✓
            </span>
          )}
        </div>
      )}
      {display && (
        <p className="whitespace-pre-wrap leading-relaxed">{display}</p>
      )}
    </div>
  );
}
