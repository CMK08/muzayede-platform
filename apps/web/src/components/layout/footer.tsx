"use client";

import React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Gavel,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Footer() {
  const locale = useLocale();
  const t = useTranslations("footer");

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-navy-950 text-gray-300">
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
          <div>
            <h3 className="font-display text-lg font-semibold text-white">
              {t("newsletter")}
            </h3>
            <p className="text-sm text-gray-400">{t("newsletterDesc")}</p>
          </div>
          <div className="flex w-full max-w-md gap-2">
            <Input
              placeholder={t("emailPlaceholder")}
              type="email"
              className="border-white/20 bg-white/5 text-white placeholder:text-gray-500"
            />
            <Button className="shrink-0">{t("subscribe")}</Button>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500">
                <Gavel className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-xl font-bold text-white">
                Muzayede
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              {t("brandDescription")}
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
              {t("quickLinks")}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href={`/${locale}/auctions`}
                  className="text-sm text-gray-400 transition-colors hover:text-primary-400"
                >
                  {t("allAuctions")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/auctions?status=active`}
                  className="text-sm text-gray-400 transition-colors hover:text-primary-400"
                >
                  {t("liveAuctions")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/auctions?status=upcoming`}
                  className="text-sm text-gray-400 transition-colors hover:text-primary-400"
                >
                  {t("upcomingAuctions")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/how-it-works`}
                  className="text-sm text-gray-400 transition-colors hover:text-primary-400"
                >
                  {t("howItWorks")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/sell`}
                  className="text-sm text-gray-400 transition-colors hover:text-primary-400"
                >
                  {t("sellWithUs")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
              {t("legal")}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="text-sm text-gray-400 transition-colors hover:text-primary-400"
                >
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="text-sm text-gray-400 transition-colors hover:text-primary-400"
                >
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/kvkk`}
                  className="text-sm text-gray-400 transition-colors hover:text-primary-400"
                >
                  {t("kvkk")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/cookies`}
                  className="text-sm text-gray-400 transition-colors hover:text-primary-400"
                >
                  {t("cookies")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/about`}
                  className="text-sm text-gray-400 transition-colors hover:text-primary-400"
                >
                  {t("about")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
              {t("contact")}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
                <span>
                  Levent Mah. Buyukdere Cad. No:185
                  <br />
                  Sisli / Istanbul
                </span>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="h-4 w-4 shrink-0 text-primary-400" />
                <a href="tel:+908501234567" className="hover:text-primary-400">
                  0850 123 45 67
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="h-4 w-4 shrink-0 text-primary-400" />
                <a
                  href="mailto:info@muzayede.com"
                  className="hover:text-primary-400"
                >
                  info@muzayede.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-gray-500 sm:flex-row">
          <p>
            &copy; {currentYear} Muzayede. {t("allRightsReserved")}
          </p>
          <div className="flex gap-4">
            <span>SSL {t("securedPayment")}</span>
            <span>|</span>
            <span>{t("licensedPlatform")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
