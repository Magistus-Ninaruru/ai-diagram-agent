/** Shared types and helpers for conversation data */

/** Minimal serializable message shape (subset of UIMessage) */
export interface SerializedMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<{ type: string; text?: string; [key: string]: unknown }>;
}

/** Derive a short title from the first user message */
export function deriveTitle(messages: SerializedMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New Chat";
  const text =
    first.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text!)
      .join("") || "New Chat";
  return text.length > 60 ? text.slice(0, 57) + "\u2026" : text;
}
