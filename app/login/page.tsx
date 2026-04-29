"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="glass-bg flex min-h-full items-center justify-center">
      {/* Noise overlay for realistic texture */}
      <div className="noise-overlay" />

      {/* Caustic light spot — light refracted through the glass onto the table */}
      <div
        className="pointer-events-none absolute z-0"
        style={{
          width: 340,
          height: 180,
          top: "56%",
          left: "50%",
          transform: "translateX(-50%)",
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.12) 40%, transparent 70%)",
          filter: "blur(18px)",
        }}
      />

      {/* Glass card */}
      <div className="glass-card relative z-10 w-full max-w-sm space-y-8 rounded-2xl px-8 py-10 mx-4">
        {/* Logo / Title */}
        <div className="relative z-10 text-center space-y-3">
          <img
            src="/icon.png"
            alt="AI Diagram Agent"
            className="h-24 w-24 mx-auto"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
              AI Diagram Agent
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Generate Mermaid and draw.io diagrams with AI
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-black/[0.08] dark:via-white/[0.08] to-transparent" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
            continue with
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-black/[0.08] dark:via-white/[0.08] to-transparent" />
        </div>

        {/* GitHub sign-in button */}
        <button
          onClick={() => signIn("github", { callbackUrl: "/" })}
          className="glass-btn relative z-10 flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-white dark:text-[#24292f] cursor-pointer"
        >
          <svg className="h-5 w-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          <span className="relative z-10">Sign in with GitHub</span>
        </button>

        {/* Footer */}
        <p className="relative z-10 text-center text-[10px] text-muted-foreground/50">
          Secure authentication via GitHub OAuth
        </p>
      </div>
    </div>
  );
}
