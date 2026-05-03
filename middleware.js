import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isApiRoute = req.nextUrl.pathname.startsWith("/api");

    // If it's an API route and user is not authenticated, return 401 Unauthorized
    // We handle this inside the function to avoid redirection to signin page for APIs
    if (isApiRoute && !token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login first." },
        { status: 401 }
      );
    }

    // Role-based access control (Direktur only)
    // User Management: Direktur only
    if (req.nextUrl.pathname.startsWith("/user-management") && token?.role !== "direktur") {
      return NextResponse.rewrite(new URL("/dashboard", req.url))
    }

    // Settings: Direktur & Admin
    if (req.nextUrl.pathname.startsWith("/settings") && token?.role !== "direktur" && token?.role !== "admin") {
      return NextResponse.rewrite(new URL("/dashboard", req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isApiRoute = req.nextUrl.pathname.startsWith("/api");
        // For API routes, we allow the middleware function to handle the response (return 401)
        // For pages, we let withAuth redirect to login if no token
        if (isApiRoute) return true;
        return !!token;
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/user-management/:path*",
    "/settings/:path*",
    // Protect all API routes except auth ones
    "/api/((?!auth).*)",
  ],
}
