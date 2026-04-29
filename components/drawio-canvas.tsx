"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DrawioCanvasHandle {
  loadXml: (xml: string) => void;
}

interface DrawioCanvasProps {
  initialXml?: string;
  onXmlChange?: (xml: string) => void;
  drawioUrl?: string;
}

// Fallback URLs in order of preference
const DRAWIO_URLS = [
  "https://embed.diagrams.net",
  "https://app.diagrams.net",
  "https://www.draw.io",
];

const CONNECT_TIMEOUT_MS = 15_000;

/**
 * Ensure XML is wrapped in mxfile structure for draw.io compatibility.
 */
function wrapWithMxFile(xml: string): string {
  if (xml.includes("<mxfile")) return xml;
  if (xml.includes("<mxGraphModel")) {
    return `<mxfile><diagram name="Page-1">${xml}</diagram></mxfile>`;
  }
  return `<mxfile><diagram name="Page-1"><mxGraphModel><root>${xml}</root></mxGraphModel></diagram></mxfile>`;
}

export const DrawioCanvas = forwardRef<DrawioCanvasHandle, DrawioCanvasProps>(
  function DrawioCanvas({ initialXml, onXmlChange, drawioUrl }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loading, setLoading] = useState(true);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUrlIdx, setCurrentUrlIdx] = useState(0);
    const pendingXmlRef = useRef<string | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Resolve which URL to use
    const activeUrl = drawioUrl || DRAWIO_URLS[currentUrlIdx] || DRAWIO_URLS[0];

    const iframeSrc = `${activeUrl}/?embed=1&proto=json&spin=1&libraries=1`;

    const sendMessage = useCallback(
      (msg: object) => {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify(msg),
            "*"
          );
        }
      },
      []
    );

    const loadXml = useCallback(
      (xml: string) => {
        const wrapped = wrapWithMxFile(xml);
        if (ready) {
          sendMessage({ action: "load", xml: wrapped, autosave: 1 });
        } else {
          pendingXmlRef.current = wrapped;
        }
      },
      [ready, sendMessage]
    );

    useImperativeHandle(ref, () => ({ loadXml }), [loadXml]);

    // Timeout: if not ready within N seconds, try next URL or show error
    useEffect(() => {
      if (ready || error) return;

      timeoutRef.current = setTimeout(() => {
        if (!drawioUrl && currentUrlIdx < DRAWIO_URLS.length - 1) {
          // Try next URL
          setCurrentUrlIdx((i) => i + 1);
          setLoading(true);
        } else {
          setError(
            `Cannot connect to draw.io (tried ${drawioUrl || DRAWIO_URLS.slice(0, currentUrlIdx + 1).join(", ")}). ` +
            `Check your network or set a custom draw.io URL in Settings.`
          );
          setLoading(false);
        }
      }, CONNECT_TIMEOUT_MS);

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, [ready, error, currentUrlIdx, drawioUrl]);

    // Message handler
    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        // Accept messages from any diagrams.net / draw.io origin, or same-origin for local hosting
        const origin = event.origin || "";
        const isSameOrigin = origin === window.location.origin;
        const isDrawio =
          origin.includes("diagrams.net") || origin.includes("draw.io");

        if (!isSameOrigin && !isDrawio) return;

        let data: { event?: string; xml?: string };
        try {
          data =
            typeof event.data === "string"
              ? JSON.parse(event.data)
              : event.data;
        } catch {
          return;
        }

        // Handle configure event (sent when configure=1 is in URL, or by some versions by default)
        if (data.event === "configure") {
          sendMessage({
            action: "configure",
            config: {
              defaultFonts: ["Helvetica", "Times New Roman"],
            },
          });
          return;
        }

        if (data.event === "init") {
          // Clear timeout
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setReady(true);
          setLoading(false);
          setError(null);

          const xmlToLoad = pendingXmlRef.current || initialXml;
          if (xmlToLoad) {
            const wrapped = wrapWithMxFile(xmlToLoad);
            sendMessage({ action: "load", xml: wrapped, autosave: 1 });
            pendingXmlRef.current = null;
          } else {
            sendMessage({
              action: "load",
              xml: '<mxfile><diagram name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>',
              autosave: 1,
            });
          }
        }

        if (data.event === "autosave" && data.xml) {
          onXmlChange?.(data.xml);
        }

        if (data.event === "save" && data.xml) {
          onXmlChange?.(data.xml);
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }, [initialXml, onXmlChange, sendMessage]);

    // When initialXml prop changes and iframe is ready, load it
    useEffect(() => {
      if (ready && initialXml) {
        sendMessage({
          action: "load",
          xml: wrapWithMxFile(initialXml),
          autosave: 1,
        });
      }
    }, [initialXml, ready, sendMessage]);

    const handleRetry = () => {
      setError(null);
      setLoading(true);
      setReady(false);
      setCurrentUrlIdx(0);
    };

    return (
      <div className="relative h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">
            Draw.io Canvas
          </span>
          <div className="flex items-center gap-2">
            {!ready && !error && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Connecting to {new URL(activeUrl).hostname}...
              </span>
            )}
            {ready && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Connected
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {/* Loading overlay */}
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading draw.io editor...
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {activeUrl}
                </p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center gap-3 max-w-sm text-center px-4">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleRetry}>
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Retry
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground/70 mt-2 space-y-1">
                  <p>Tip: You can self-host draw.io with Docker:</p>
                  <code className="block bg-muted px-2 py-1 rounded text-[11px]">
                    docker run -d -p 8080:8080 jgraph/drawio
                  </code>
                  <p>Then set the URL to <code className="bg-muted px-1 rounded">http://localhost:8080</code> in Settings.</p>
                </div>
              </div>
            </div>
          )}

          {/* iframe - always render so it can attempt connection */}
          <iframe
            key={`drawio-${currentUrlIdx}-${drawioUrl || ""}`}
            ref={iframeRef}
            src={iframeSrc}
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
            style={{ display: error ? "none" : undefined }}
          />
        </div>
      </div>
    );
  }
);
