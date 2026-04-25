import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME } from "@/lib/authConstants";
import { hmacToken, timingSafeEqualHex } from "@/lib/hmacToken";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.next();
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  const pass = process.env.APP_PASSCODE;
  if (!secret || !pass) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const expected = await hmacToken(secret, `plant:${pass}`);
  const v = request.cookies.get(COOKIE_NAME)?.value;
  if (!v || !timingSafeEqualHex(v, expected)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const u = new URL("/login", request.url);
    u.searchParams.set("next", pathname);
    return NextResponse.redirect(u);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon\\.ico|.*\\.png|.*\\.svg|.*\\.webmanifest).*)"]
};
