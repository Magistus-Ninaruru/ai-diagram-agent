"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Palette, Search, Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface IconBrowserDialogProps {
  iconfontUrl: string;
  iconfontIcons: string;
}

export function IconBrowserDialog({
  iconfontUrl,
  iconfontIcons,
}: IconBrowserDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedIcon, setCopiedIcon] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  // Track font loading: re-render once iconfont font file is available
  const checkFonts = useCallback(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    // Check if the "iconfont" font family is loaded
    const loaded = document.fonts.check("16px iconfont");
    setFontsReady(loaded);
  }, []);

  useEffect(() => {
    if (!open || !iconfontUrl) return;
    checkFonts();
    // Listen for font loading events to re-render when iconfont arrives
    const onDone = () => checkFonts();
    document.fonts?.addEventListener("loadingdone", onDone);
    // Also re-check after a short delay in case fonts already loaded
    const timer = setTimeout(checkFonts, 500);
    return () => {
      document.fonts?.removeEventListener("loadingdone", onDone);
      clearTimeout(timer);
    };
  }, [open, iconfontUrl, checkFonts]);

  const icons = useMemo(() => {
    return iconfontIcons
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [iconfontIcons]);

  const filtered = useMemo(() => {
    if (!search) return icons;
    const q = search.toLowerCase();
    return icons.filter((name) => name.toLowerCase().includes(q));
  }, [icons, search]);

  const handleCopy = (name: string) => {
    navigator.clipboard.writeText(`<i class='iconfont icon-${name}'></i>`);
    setCopiedIcon(name);
    setTimeout(() => setCopiedIcon(null), 1500);
  };

  const hasConfig = iconfontUrl && icons.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Browse icons"
          >
            <Palette className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Icon Library
            {hasConfig && (
              <span className="text-xs font-normal text-muted-foreground">
                {icons.length} icon{icons.length !== 1 && "s"}
              </span>
            )}
            {hasConfig && !fontsReady && (
              <span className="flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Font loading...
              </span>
            )}
            {hasConfig && fontsReady && (
              <span className="text-[10px] text-green-600 dark:text-green-400">
                Font loaded
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {!hasConfig ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No icons configured yet
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[260px]">
              Open Settings and add your iconfont.cn CSS URL and icon names to
              get started.
            </p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search icons..."
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto mt-2 -mx-1">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  No icons match &quot;{search}&quot;
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 p-1" key={`grid-${fontsReady}`}>
                  {filtered.map((name) => (
                    <button
                      key={name}
                      className="group relative flex flex-col items-center gap-1.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 p-3 transition-colors"
                      onClick={() => handleCopy(name)}
                      title={`Click to copy: icon-${name}`}
                    >
                      <i
                        className={`iconfont icon-${name}`}
                        style={{ fontSize: 56, color: "var(--foreground)" }}
                      />
                      <span className="text-[10px] text-muted-foreground truncate max-w-full">
                        {name}
                      </span>
                      {/* Copy feedback */}
                      {copiedIcon === name && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-green-500/10">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                      {/* Copy hint on hover */}
                      {copiedIcon !== name && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Copy className="h-3 w-3 text-muted-foreground/50" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t pt-2 mt-1">
              <p className="text-[10px] text-muted-foreground/60 text-center">
                Click any icon to copy its HTML. These icons are available for AI
                diagram generation.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
