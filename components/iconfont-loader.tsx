"use client";

import { useEffect, useRef } from "react";

interface IconfontLoaderProps {
  url: string;
}

/**
 * Dynamically loads an iconfont.cn font-class CSS stylesheet into <head>.
 * Cleans up on URL change or unmount.
 */
export function IconfontLoader({ url }: IconfontLoaderProps) {
  const linkRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    // Remove previous link if any
    if (linkRef.current) {
      linkRef.current.remove();
      linkRef.current = null;
    }

    if (!url) return;

    // Normalise protocol-relative URLs
    const href = url.startsWith("//") ? `https:${url}` : url;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.iconfont = "true";
    document.head.appendChild(link);
    linkRef.current = link;

    return () => {
      link.remove();
      linkRef.current = null;
    };
  }, [url]);

  return null;
}
