import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/app", "/admin"];
const adminPaths = ["/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie =
    req.cookies.get("authjs.session-token") ??
    req.cookies.get("__Secure-authjs.session-token");

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (isProtected && !sessionCookie) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
