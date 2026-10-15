import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Protects every route except the landing page, /login, Next.js internals,
 * and the Auth.js API routes themselves. API calls get a 401 JSON response;
 * page visits are redirected to /login.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (req.auth) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL("/login", req.url);
  url.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login|$).*)"],
};
