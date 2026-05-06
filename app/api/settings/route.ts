import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { DEFAULT_PROVIDERS, DEFAULT_SETTINGS } from "@/lib/settings";

/** GET /api/settings — load user's LLM settings */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  if (!row) {
    // Return defaults if no settings saved yet
    return NextResponse.json(DEFAULT_SETTINGS);
  }

  // Merge saved providers with defaults (ensures new providers are included)
  const savedProviders = row.providers as unknown as typeof DEFAULT_PROVIDERS;
  const mergedProviders = DEFAULT_PROVIDERS.map((dp) => {
    const saved = savedProviders.find(
      (p: { id: string }) => p.id === dp.id
    );
    return saved ? { ...dp, ...saved } : dp;
  });

  return NextResponse.json({
    providers: mergedProviders,
    selectedProvider: row.selectedProvider,
    selectedModel: row.selectedModel,
    drawioUrl: row.drawioUrl,
    iconfontUrl: row.iconfontUrl,
    iconfontIcons: row.iconfontIcons,
  });
}

/** PUT /api/settings — save/update user's LLM settings */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      providers: body.providers ?? DEFAULT_PROVIDERS,
      selectedProvider: body.selectedProvider ?? "openai",
      selectedModel: body.selectedModel ?? "gpt-4o",
      drawioUrl: body.drawioUrl ?? "",
      iconfontUrl: body.iconfontUrl ?? "",
      iconfontIcons: body.iconfontIcons ?? "",
    },
    update: {
      providers: body.providers,
      selectedProvider: body.selectedProvider,
      selectedModel: body.selectedModel,
      drawioUrl: body.drawioUrl,
      iconfontUrl: body.iconfontUrl,
      iconfontIcons: body.iconfontIcons,
    },
  });

  return NextResponse.json(settings);
}
