import { streamText, convertToModelMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const runtime = "edge";
export const maxDuration = 60;

/** Max conversation turns sent to the model (keeps prefill fast) */
const MAX_CONTEXT_MESSAGES = 30;

const SYSTEM_PROMPT = `You are an expert diagram architect. When asked to create or modify a diagram, generate BOTH:
1. A Mermaid diagram in a \`\`\`mermaid code block
2. A draw.io XML diagram in a \`\`\`drawio-xml code block

Rules:
- Mermaid: pick the best diagram type (flowchart, sequence, class, state, ER, gantt…)
- Draw.io: output valid mxGraphModel XML wrapped in <mxfile><diagram name="Page-1"><mxGraphModel><root>…</root></mxGraphModel></diagram></mxfile>. Use mxCell with geometry, colors, and proper spacing.
- Both diagrams represent the same concept
- Briefly explain the diagram after the code blocks
- If the user uploads an image, recreate it in both formats`;

function getModel(provider: string, modelId: string, baseUrl: string, apiKey: string) {
  switch (provider) {
    case "openai": {
      const openai = createOpenAI({
        baseURL: baseUrl || undefined,
        apiKey: apiKey || process.env.OPENAI_API_KEY || "",
      });
      return openai(modelId);
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        baseURL: baseUrl || undefined,
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY || "",
      });
      return anthropic(modelId);
    }
    case "google": {
      const google = createGoogleGenerativeAI({
        baseURL: baseUrl || undefined,
        apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
      });
      return google(modelId);
    }
    case "custom":
    default: {
      // Custom OpenAI-compatible provider
      const custom = createOpenAI({
        baseURL: baseUrl || undefined,
        apiKey: apiKey || "",
      });
      return custom(modelId);
    }
  }
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      provider = "openai",
      model: modelId = "gpt-4o",
      baseUrl = "",
      apiKey = "",
    } = await req.json();

    const model = getModel(provider, modelId, baseUrl, apiKey);

    const modelMessages = await convertToModelMessages(
      messages.length > MAX_CONTEXT_MESSAGES
        ? messages.slice(-MAX_CONTEXT_MESSAGES)
        : messages
    );

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
    });

    return result.toTextStreamResponse();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[chat] Error:", message);
    return new Response(message, { status: 500 });
  }
}
