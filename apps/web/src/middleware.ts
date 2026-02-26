import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const protectedRoutes = ["/dashboard", "/admin"];
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

  // Redirect to dashboard if accessing auth route while authenticated
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // Check admin routes
  if (pathnameWithoutLocale.startsWith("/admin")) {
    // In a real app, you'd decode the JWT and check the role
    // For now, we'll let the client handle the role check
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
