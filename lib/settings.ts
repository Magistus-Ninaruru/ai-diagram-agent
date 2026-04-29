export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
}

export interface LLMSettings {
  providers: ProviderConfig[];
  selectedProvider: string;
  selectedModel: string;
  drawioUrl: string; // Custom draw.io URL (empty = use defaults with fallback)
}

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKey: "",
    models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
  },
  {
    id: "google",
    name: "Google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: "",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  },
  {
    id: "custom",
    name: "Custom (OpenAI-Compatible)",
    baseUrl: "",
    apiKey: "",
    models: [],
  },
];

export const DEFAULT_SETTINGS: LLMSettings = {
  providers: DEFAULT_PROVIDERS,
  selectedProvider: "openai",
  selectedModel: "gpt-4o",
  drawioUrl: "",
};

export function getActiveProvider(settings: LLMSettings): ProviderConfig | undefined {
  return settings.providers.find((p) => p.id === settings.selectedProvider);
}
