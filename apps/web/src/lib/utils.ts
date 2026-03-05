/**
 * Yardimci Fonksiyonlar Modulu (Utilities)
 *
 * Uygulama genelinde kullanilan ortak yardimci fonksiyonlari icerir:
 * - CSS sinif birlestirme (cn)
 * - Para birimi formatlama (formatCurrency)
 * - Tarih formatlama (formatDate, formatRelativeTime)
 * - Geri sayim hesaplama (getTimeRemaining)
 * - Teklif artis miktarlari hesaplama (generateBidIncrements)
 * - Metin kisaltma (truncateText)
 * - URL-uyumlu slug olusturma (slugify)
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, type Locale } from "date-fns";
import { tr, enUS, ar } from "date-fns/locale";

/**
 * CSS sinif isimlerini birlestirir ve Tailwind catismalarini cozer.
 * clsx ile kosullu siniflar olusturur, twMerge ile cakisan Tailwind siniflarini temizler.
 * Ornek: cn("px-4 py-2", isActive && "bg-blue-500", "px-8") => "py-2 px-8 bg-blue-500"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Dil kodlarindan date-fns locale nesnelerine esleme tablosu
const localeMap: Record<string, Locale> = {
  tr,
  en: enUS,
  ar,
};

/**
 * Sayisal degeri para birimi formatinda gosterir.
 * Intl.NumberFormat API'sini kullanarak yerellestirilmis para birimi ciktisi uretir.
 * Varsayilan: TRY (Turk Lirasi), tr-TR formati
 * Ornek: formatCurrency(1500) => "1.500 TL"
 */
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

/**
 * Tarihi belirtilen formatta ve dilde biclmlendirir.
 * Gecersiz veya bos tarih degerleri icin "-" dondurur.
 * Ornek: formatDate("2024-03-15T10:30:00") => "15 Mar 2024 10:30"
 */
export function formatDate(
  date: string | Date,
  formatStr: string = "dd MMM yyyy HH:mm",
  locale: string = "tr"
): string {
  if (!date) return "-";
  // String ise Date nesnesine cevir
  const dateObj = typeof date === "string" ? new Date(date) : date;
  // Gecersiz tarih kontrolu
  if (isNaN(dateObj.getTime())) return "-";
  return format(dateObj, formatStr, { locale: localeMap[locale] || tr });
}

/**
 * Tarihi simdiki zamana gore goreli olarak gosterir.
 * Ornek: "3 saat once", "2 gun once", "5 dakika icinde"
 * addSuffix: true ile "once" / "icinde" son eki eklenir
 */
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

/**
 * Muzayede bitis tarihine kalan sureyi hesaplar.
 * Gun, saat, dakika ve saniye olarak ayristirilmis geri sayim degerleri dondurur.
 * Bitis tarihi gecmisse isExpired: true dondurur.
 * Muzayede detay sayfasindaki geri sayim sayaci icin kullanilir.
 */
export function getTimeRemaining(endDate: string | Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  isExpired: boolean;
} {
  // Bos deger kontrolu
  if (!endDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isExpired: true };
  }
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  // Gecersiz tarih kontrolu
  if (isNaN(end.getTime())) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isExpired: true };
  }
  // Kalan sure (milisaniye cinsinden)
  const total = end.getTime() - Date.now();

  // Sure dolmussa sifir degerler ve isExpired: true dondur
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isExpired: true };
  }

  // Milisaniyeyi gun, saat, dakika ve saniyeye ayristir
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
    isExpired: false,
  };
}

/**
 * Mevcut fiyata gore uygun teklif artis miktarlarini belirler.
 * Fiyat arttikca artis miktarlari da orantili olarak artar.
 * Ornek: 500 TL fiyat icin => [25, 50, 100, 250] TL artis secenekleri
 * Kullanici teklif verirken hizli artis butonlarinda kullanilir.
 */
export function generateBidIncrements(currentPrice: number): number[] {
  if (currentPrice < 100) return [5, 10, 25, 50];
  if (currentPrice < 1000) return [25, 50, 100, 250];
  if (currentPrice < 10000) return [100, 250, 500, 1000];
  if (currentPrice < 100000) return [500, 1000, 2500, 5000];
  return [1000, 5000, 10000, 25000];
}

/**
 * Uzun metinleri belirtilen karakter sayisinda keser ve "..." ekler.
 * Metin zaten kisaysa oldugu gibi dondurur.
 * Ornek: truncateText("Cok uzun bir aciklama metni", 10) => "Cok uzun b..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

/**
 * Metni URL-uyumlu slug formatina donusturur.
 * Kucuk harfe cevirir, ozel karakterleri siler, bosluklari tire ile degistirir.
 * Ornek: slugify("Antika Vazo Koleksiyonu") => "antika-vazo-koleksiyonu"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")      // Harf, rakam, bosluk ve tire disindaki karakterleri sil
    .replace(/[\s_]+/g, "-")        // Bosluk ve alt cizgileri tire ile degistir
    .replace(/^-+|-+$/g, "");       // Bas ve sondaki tireleri temizle
}
