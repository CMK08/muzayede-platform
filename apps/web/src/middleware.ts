/**
 * Next.js Middleware -- Cok dilli yonlendirme ve kimlik dogrulama kontrolu.
 *
 * Her gelen istekte sirasiyla:
 *  1. URL yolundan aktif dili (locale) cikarir.
 *  2. Korunmali (protected) bir rotaya erisim yapiliyorsa ve kullanici
 *     oturum acmamissa, giris sayfasina yonlendirir (callbackUrl ile).
 *  3. Zaten oturum acmis bir kullanici login/register sayfasina geliyorsa,
 *     rolu ADMIN ise admin paneline, degilse ana sayfaya yonlendirir.
 *  4. Diger tum durumlar icin next-intl middleware'i calistirilir
 *     (dil yonlendirmesi ve varsayilan dil ataması).
 */
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

// next-intl cok dilli yonlendirme middleware'i
const intlMiddleware = createMiddleware(routing);

// Oturum acilmadan erisilemeyecek rota on ekleri
const protectedRoutes = ["/admin", "/seller", "/dashboard", "/my-bids", "/my-orders", "/favorites", "/notifications", "/profile"];
// Yalnizca oturum acmamis kullanicilarin gorebilecegi sayfalar
const authRoutes = ["/login", "/register"];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // URL yolundan dil kodunu cikar (ornegin /tr/auctions -> "tr")
  const pathnameLocale = routing.locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Dil kodu bulunamazsa varsayilan dili kullan
  const locale = pathnameLocale || routing.defaultLocale;
  // Dil on ekini cikararak saf rota yolunu elde et
  const pathnameWithoutLocale = pathnameLocale
    ? pathname.slice(`/${locale}`.length) || "/"
    : pathname;

  // Rota korunmali mi kontrol et
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // Giris/kayit sayfasi mi kontrol et
  const isAuthRoute = authRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // Cerezlerden JWT erisim tokenini al
  const token = request.cookies.get("access_token")?.value;

  // Korunmali rotaya token olmadan erisim -> giris sayfasina yonlendir
  if (isProtectedRoute && !token) {
    // Giris sonrasi geri donulmesi icin mevcut URL'yi callbackUrl olarak ekle
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Oturum acmis kullaniciyi giris/kayit sayfalarindan uzaklastir
  if (isAuthRoute && token) {
    // JWT payload'ini coz -- role bilgisine gore yonlendirme yap
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const role = payload.role;
      // Admin kullanicilar admin paneline yonlendirilir
      if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        return NextResponse.redirect(new URL(`/${locale}/admin/dashboard`, request.url));
      }
    } catch {
      // JWT cozumleme basarisiz olursa ana sayfaya yonlendir
    }
    // Normal kullanicilar ana sayfaya yonlendirilir
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  // Diger tum istekler icin next-intl middleware'ini calistir (dil yonlendirmesi)
  return intlMiddleware(request);
}

// Middleware'in hangi rotalarda calisacagini belirleyen eslestirici (matcher)
// API rotalari, Next.js dahili dosyalari ve statik dosyalar haric tutuluyor
export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
