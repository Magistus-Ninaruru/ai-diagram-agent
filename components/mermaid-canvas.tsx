"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Copy, Check, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MermaidCanvasProps {
  code: string;
}

export function MermaidCanvas({ code }: MermaidCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState(1);
  const renderIdRef = useRef(0);

  const renderDiagram = useCallback(async () => {
    if (!code || !containerRef.current) return;

    try {
      // Wait for all fonts (including iconfont) to finish loading
      // before rendering so <i class="iconfont"> glyphs are available.
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      // Dynamic import to avoid SSR issues
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: "var(--font-geist-sans), sans-serif",
        flowchart: { htmlLabels: true },
      });

      const id = `mermaid-${++renderIdRef.current}`;
      const { svg } = await mermaid.render(id, code);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        setError(null);

        // Make SVG responsive
        const svgEl = containerRef.current.querySelector("svg");
        if (svgEl) {
          svgEl.style.maxWidth = "100%";
          svgEl.style.height = "auto";
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render diagram");
      // Keep old diagram visible if re-render fails during streaming
    }
  }, [code]);

  useEffect(() => {
    const timer = setTimeout(renderDiagram, 300);
    return () => clearTimeout(timer);
  }, [renderDiagram]);

  // Re-render when new fonts load (e.g. iconfont CSS finishes downloading font file)
  useEffect(() => {
    if (!code || typeof document === "undefined" || !document.fonts) return;
    const onLoadingDone = () => renderDiagram();
    document.fonts.addEventListener("loadingdone", onLoadingDone);
    return () => document.fonts.removeEventListener("loadingdone", onLoadingDone);
  }, [code, renderDiagram]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!code) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm">Mermaid diagram will appear here</p>
          <p className="text-xs mt-1 text-muted-foreground/70">
            Ask AI to generate a diagram
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">
          Mermaid Diagram
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setScale((s) => Math.max(0.25, s - 0.25))}
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Diagram */}
      <div className="flex-1 overflow-auto p-4">
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div ref={containerRef} className="flex items-center justify-center" />
        </div>
      </div>

      {/* Error overlay */}
      {error && (
        <div className="absolute bottom-2 left-2 right-2 rounded bg-destructive/10 px-3 py-2 text-xs text-destructive border border-destructive/20">
          {error}
        </div>
      )}
    </div>
  );
}
