import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const runtime = "edge";
export const maxDuration = 30;

function getModel(
  provider: string,
  modelId: string,
  baseUrl: string,
  apiKey: string
) {
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
    const { provider, model: modelId, baseUrl, apiKey } = await req.json();

    if (!modelId) {
      return Response.json(
        { success: false, error: "No model specified" },
        { status: 400 }
      );
    }

    const model = getModel(provider, modelId, baseUrl, apiKey);

    // Make a minimal request to validate the connection
    await generateText({
      model,
      prompt: "Say OK",
      maxOutputTokens: 5,
    });

    return Response.json({ success: true });
  } catch (err: unknown) {
    let message = "Connection failed";

    if (err instanceof Error) {
      const msg = err.message || "";
      if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
        message = "Invalid API key";
      } else if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
        message = "Model not found";
      } else if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
        message = "Rate limited — try again later";
      } else if (msg.toLowerCase().includes("econnrefused")) {
        message = "Cannot connect to server";
      } else if (msg.toLowerCase().includes("fetch failed")) {
        message = "Cannot reach the API endpoint";
      } else {
        message = msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
      }
    }

    return Response.json({ success: false, error: message }, { status: 200 });
  }
}
