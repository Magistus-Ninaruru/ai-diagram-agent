export async function POST(req: Request) {
  try {
    const { url, icons } = await req.json();

    if (!url) {
      return Response.json(
        { success: false, error: "No iconfont URL provided" },
        { status: 400 }
      );
    }

    if (!icons || icons.trim().length === 0) {
      return Response.json(
        { success: false, error: "No icon names provided" },
        { status: 400 }
      );
    }

    // Normalise protocol-relative URLs
    const href = url.startsWith("//") ? `https:${url}` : url;

    // Fetch the CSS file
    let cssText: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(href, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      clearTimeout(timeout);
      if (!res.ok) {
        return Response.json(
          { success: false, error: `Failed to fetch CSS (HTTP ${res.status})` },
          { status: 200 }
        );
      }
      cssText = await res.text();
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : "Unknown error";
      if (msg.includes("abort") || msg.includes("timeout")) {
        return Response.json(
          { success: false, error: "Request timed out — check the URL" },
          { status: 200 }
        );
      }
      return Response.json(
        { success: false, error: `Cannot fetch CSS: ${msg}` },
        { status: 200 }
      );
    }

    // Parse all icon class names from the CSS
    // iconfont.cn uses patterns like: .icon-xxx:before { content: "..."; }
    // Also handle custom prefixes by matching any class with :before/:after
    const iconClassRegex = /\.icon-([a-zA-Z0-9_-]+)\s*(?::+before)/g;
    const foundIcons = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = iconClassRegex.exec(cssText)) !== null) {
      foundIcons.add(match[1]);
    }

    if (foundIcons.size === 0) {
      return Response.json(
        {
          success: false,
          error: "No icon classes found in CSS — verify the URL points to an iconfont.cn font-class stylesheet",
          debug: cssText.substring(0, 200),
        },
        { status: 200 }
      );
    }

    // Check which user-specified icons exist
    // Strip "icon-" prefix if user included it (common mistake)
    const requestedIcons = icons
      .split(",")
      .map((s: string) => s.trim().replace(/^icon-/, ""))
      .filter((s: string) => s.length > 0);

    const missingIcons = requestedIcons.filter(
      (name: string) => !foundIcons.has(name)
    );

    if (missingIcons.length > 0) {
      return Response.json(
        {
          success: false,
          error: `Icons not found: ${missingIcons.join(", ")}`,
          missing: missingIcons,
          found: requestedIcons.length - missingIcons.length,
          total: requestedIcons.length,
          available: Array.from(foundIcons),
        },
        { status: 200 }
      );
    }

    return Response.json({
      success: true,
      found: requestedIcons.length,
      total: requestedIcons.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { success: false, error: message },
      { status: 200 }
    );
  }
}
