import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req: NextRequest & { auth: any }) => {
  // In development mode, skip all auth
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next()
  }

  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth")

  // Allow access to auth pages without login
  if (isAuthPage) {
    return NextResponse.next()
  }

  // Redirect to signin if not logged in
  if (!isLoggedIn) {
    const signInUrl = new URL("/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api/auth|api/workflows|api/admin|api/pubsub|api/columns/.*/updates|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}