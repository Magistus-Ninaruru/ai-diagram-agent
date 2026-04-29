"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { MermaidCanvas } from "@/components/mermaid-canvas";
import { DrawioCanvas, type DrawioCanvasHandle } from "@/components/drawio-canvas";
import { ChatPanel } from "@/components/chat-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { type LLMSettings, DEFAULT_SETTINGS } from "@/lib/settings";

export default function Home() {
  const { data: session } = useSession();
  const [mermaidCode, setMermaidCode] = useState("");
  const [drawioXml, setDrawioXml] = useState("");
  const [settings, setSettings] = useState<LLMSettings>(DEFAULT_SETTINGS);

  // Load settings from server after mount
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.providers) setSettings(data);
      })
      .catch(() => {});
  }, []);

  const drawioRef = useRef<DrawioCanvasHandle>(null);

  const handleMermaidCode = useCallback((code: string) => {
    setMermaidCode(code);
  }, []);

  const handleDrawioXml = useCallback(
    (xml: string) => {
      setDrawioXml(xml);
      drawioRef.current?.loadXml(xml);
    },
    []
  );

  const handleSettingsChange = useCallback((newSettings: LLMSettings) => {
    setSettings(newSettings);
    // Persist to server
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    }).catch(() => {});
  }, []);

  return (
    <div className="h-full flex flex-col glass-bg">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Top bar */}
      <header className="glass-header relative z-10 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <img
            src="/icon.png"
            alt="AI Diagram Agent"
            className="h-5 w-5"
          />
          <h1 className="text-sm font-semibold tracking-tight text-gray-800 dark:text-gray-100">
            AI Diagram Agent
          </h1>
          <span className="text-[10px] text-muted-foreground/50 font-medium">v 1.0.0</span>
        </div>
        <div className="flex items-center gap-2">
          {session?.user && (
            <div className="flex items-center gap-2">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-6 w-6 rounded-full ring-1 ring-white/30 shadow-sm"
                />
              )}
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {session.user.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <ResizablePanelGroup orientation="horizontal" className="relative z-10 flex-1">
        {/* Left panel: Diagrams */}
        <ResizablePanel defaultSize={65} minSize={30}>
          <ResizablePanelGroup orientation="vertical">
            {/* Mermaid canvas */}
            <ResizablePanel defaultSize={45} minSize={15}>
              <MermaidCanvas code={mermaidCode} />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Draw.io canvas */}
            <ResizablePanel defaultSize={55} minSize={15}>
              <DrawioCanvas
                ref={drawioRef}
                initialXml={drawioXml}
                onXmlChange={setDrawioXml}
                drawioUrl={settings.drawioUrl || undefined}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel: AI Chat */}
        <ResizablePanel defaultSize={35} minSize={20}>
          <ChatPanel
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onMermaidCode={handleMermaidCode}
            onDrawioXml={handleDrawioXml}
            mermaidCode={mermaidCode}
            drawioXml={drawioXml}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
