import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    console.log(`[Middleware] Executing for path: ${path}, token exists: ${!!token}, role: ${token?.role}`);
    
    const isApiRoute = path.startsWith("/api");
    const isAuthRoute = path === "/" || path === "/login";

    // 1. Redirect logged-in users away from the login page
    if (isAuthRoute && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 2. Let unauthenticated users access the login page normally
    if (isAuthRoute && !token) {
      return NextResponse.next();
    }

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
    if (path.startsWith("/user-management") && token?.role !== "direktur") {
      return NextResponse.rewrite(new URL("/dashboard", req.url))
    }

    // Settings: Direktur & Admin
    if (path.startsWith("/settings") && token?.role !== "direktur" && token?.role !== "admin") {
      return NextResponse.rewrite(new URL("/dashboard", req.url))
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        const isApiRoute = path.startsWith("/api");
        const isAuthRoute = path === "/" || path === "/login";
        
        console.log(`[Middleware Authorized] path: ${path}, token exists: ${!!token}`);

        // For API routes and Auth routes, we allow the middleware function body to handle them
        if (isApiRoute || isAuthRoute) return true;
        
        // For all other pages, we let withAuth block and redirect to login if no token
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
