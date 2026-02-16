import { NextRequest, NextResponse } from "next/server"
import { verifyToken, cookieName } from "./lib/auth-edge"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/app")) {
    const token = req.cookies.get(cookieName())?.value
    if (!token) return NextResponse.redirect(new URL("/login", req.url))
    const session = await verifyToken(token)
    if (!session) {
      const res = NextResponse.redirect(new URL("/login", req.url))
      res.cookies.set(cookieName(), "", { maxAge: 0, path: "/" })
      return res
    }
  }

  if (pathname === "/login" || pathname === "/signup") {
    const token = req.cookies.get(cookieName())?.value
    if (token && (await verifyToken(token))) {
      return NextResponse.redirect(new URL("/app", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
}
