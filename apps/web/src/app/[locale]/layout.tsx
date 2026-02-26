import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { routing } from "@/i18n/routing";
import { Providers } from "./providers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Muzayede - Turkiye'nin Online Muzayede Platformu",
    template: "%s | Muzayede",
  },
  description:
    "Turkiye'nin en guvenilir online muzayede platformu. Benzersiz urunleri kesfedin, teklif verin ve kazanin.",
  keywords: [
    "muzayede",
    "online muzayede",
    "acik artirma",
    "teklif",
    "antika",
    "koleksiyon",
    "sanat",
    "turkiye",
  ],
  authors: [{ name: "Muzayede" }],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://muzayede.com",
    siteName: "Muzayede",
    title: "Muzayede - Turkiye'nin Online Muzayede Platformu",
    description:
      "Turkiye'nin en guvenilir online muzayede platformu. Benzersiz urunleri kesfedin, teklif verin ve kazanin.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Muzayede - Online Muzayede Platformu",
    description: "Benzersiz urunleri kesfedin ve teklif verin.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "tr" | "en" | "ar")) {
    notFound();
  }

  const messages = await getMessages();
  const direction = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <Providers>{children}</Providers>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
