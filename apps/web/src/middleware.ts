import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const protectedRoutes = ["/admin", "/seller", "/dashboard", "/my-bids", "/my-orders", "/favorites", "/notifications", "/profile"];
const authRoutes = ["/login", "/register"];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract locale from path
  const pathnameLocale = routing.locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  const locale = pathnameLocale || routing.defaultLocale;
  const pathnameWithoutLocale = pathnameLocale
    ? pathname.slice(`/${locale}`.length) || "/"
    : pathname;

  // Check if it's a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // Check if it's an auth route
  const isAuthRoute = authRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // Get auth token from cookies
  const token = request.cookies.get("access_token")?.value;

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !token) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && token) {
    // Decode JWT to check role and redirect accordingly
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const role = payload.role;
      if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        return NextResponse.redirect(new URL(`/${locale}/admin/dashboard`, request.url));
      }
    } catch {
      // If JWT decode fails, redirect to homepage
    }
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - _next (Next.js internals)
    // - Static files with extensions
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
