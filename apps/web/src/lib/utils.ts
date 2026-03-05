import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, type Locale } from "date-fns";
import { tr, enUS, ar } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const localeMap: Record<string, Locale> = {
  tr,
  en: enUS,
  ar,
};

export function formatCurrency(
  amount: number,
  currency: string = "TRY",
  locale: string = "tr-TR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(
  date: string | Date,
  formatStr: string = "dd MMM yyyy HH:mm",
  locale: string = "tr"
): string {
  if (!date) return "-";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return "-";
  return format(dateObj, formatStr, { locale: localeMap[locale] || tr });
}

export function formatRelativeTime(
  date: string | Date,
  locale: string = "tr"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: localeMap[locale] || tr,
  });
}

export function getTimeRemaining(endDate: string | Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  isExpired: boolean;
} {
  if (!endDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isExpired: true };
  }
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  if (isNaN(end.getTime())) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isExpired: true };
  }
  const total = end.getTime() - Date.now();

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isExpired: true };
  }

  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
    isExpired: false,
  };
}

export function generateBidIncrements(currentPrice: number): number[] {
  if (currentPrice < 100) return [5, 10, 25, 50];
  if (currentPrice < 1000) return [25, 50, 100, 250];
  if (currentPrice < 10000) return [100, 250, 500, 1000];
  if (currentPrice < 100000) return [500, 1000, 2500, 5000];
  return [1000, 5000, 10000, 25000];
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
