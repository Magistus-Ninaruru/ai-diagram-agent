"use client";

import { MessageSquare, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HistoryConversation {
  id: string;
  title: string;
  messages: unknown[];
  updatedAt: string | number;
}

interface ChatHistoryPanelProps {
  conversations: HistoryConversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function formatDate(ts: string | number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChatHistoryPanel({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onClose,
}: ChatHistoryPanelProps) {
  return (
    <div className="flex h-full flex-col glass-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          History
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No conversations yet
            </p>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-start gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
                conv.id === activeId
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-foreground"
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-50" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{conv.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDate(conv.updatedAt)}
                  {conv.messages.length > 0 && (
                    <span> · {conv.messages.length} msgs</span>
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
