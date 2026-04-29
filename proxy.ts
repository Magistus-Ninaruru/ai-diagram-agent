import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
  // Protect everything except static assets, public files, and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
