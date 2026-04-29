import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Edge-compatible auth config (no Prisma imports).
 * Used by middleware and as the base for the full auth config.
 */
export const authConfig = {
  providers: [GitHub],
  session: { strategy: "jwt" as const },
  pages: { signIn: "/login" },
  callbacks: {
    /** Attach user.id to the JWT so it's available in session */
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    /** Expose userId in the session object */
    session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
    /** Allow unauthenticated access to /login and auth API */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname.startsWith("/login");
      const isAuthApi = nextUrl.pathname.startsWith("/api/auth");

      if (isAuthApi) return true;
      if (isLoginPage) return true;
      if (isLoggedIn) return true;

      // Redirect to login
      return Response.redirect(new URL("/login", nextUrl));
    },
  },
} satisfies NextAuthConfig;
