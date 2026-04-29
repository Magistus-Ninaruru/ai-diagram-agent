import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/** GET /api/conversations — list all conversations for the current user */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      messages: true,
      mermaidCode: true,
      drawioXml: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(conversations);
}

/** POST /api/conversations — create a new conversation */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const conversation = await prisma.conversation.create({
    data: {
      userId: session.user.id,
      title: body.title || "New Chat",
      messages: body.messages || [],
      mermaidCode: body.mermaidCode || "",
      drawioXml: body.drawioXml || "",
    },
  });

  return NextResponse.json(conversation, { status: 201 });
}
