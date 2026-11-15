import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const boxParam = url.searchParams.get("box") || url.searchParams.get("sandbox");
  const existing = request.cookies.get("pulma_sandbox")?.value;

  // If a specific sandbox parameter is passed via URL query and differs from cookie:
  if (boxParam) {
    const clean = boxParam.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
    if (clean && clean !== existing) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-pulma-sandbox", clean);
      const res = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      res.cookies.set("pulma_sandbox", clean, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return res;
    }
  }

  // If visitor does not have a sandbox cookie yet, assign a fresh one:
  if (!existing) {
    const rand = Math.random().toString(36).slice(2, 8);
    const time = Date.now().toString(36).slice(-2);
    const newId = `sbx_${rand}${time}`;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pulma-sandbox", newId);
    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    res.cookies.set("pulma_sandbox", newId, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
