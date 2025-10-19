import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("music_bot_session")
  const isLoginPage = request.nextUrl.pathname === "/login"
  const isApiAuth = request.nextUrl.pathname.startsWith("/api/auth")
  const isHealthCheck = request.nextUrl.pathname === "/api/bot/health"

  // Allow auth API routes and health check
  if (isApiAuth || isHealthCheck) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!sessionCookie && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect to dashboard if already authenticated and trying to access login
  if (sessionCookie && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
