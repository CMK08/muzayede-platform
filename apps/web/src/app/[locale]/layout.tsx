import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { routing } from "@/i18n/routing";
import { Providers } from "./providers";

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

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps): Promise<React.JSX.Element> {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "tr" | "en" | "ar")) {
    notFound();
  }

  const messages = await getMessages();

  return (
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
  );
}
