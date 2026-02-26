// ---------------------------------------------------------------------------
// Date & Time Utilities
// ---------------------------------------------------------------------------

type DateInput = string | number | Date;

/**
 * Parse various date inputs into a Date object.
 */
function toDate(input: DateInput): Date {
  if (input instanceof Date) return input;
  return new Date(input);
}

/**
 * Format a date using Intl.DateTimeFormat.
 *
 * @param input  ISO string, timestamp, or Date object
 * @param locale BCP-47 locale string (default: "tr-TR")
 * @param options Intl formatting options
 *
 * @example
 * formatDate('2025-06-15T14:30:00Z')
 * // "15 Haziran 2025 17:30" (Europe/Istanbul)
 */
export function formatDate(
  input: DateInput,
  locale = 'tr-TR',
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(input);

  const defaults: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaults).format(date);
}

interface TimeAgoUnit {
  seconds: number;
  label: { tr: string; en: string };
}

const TIME_UNITS: TimeAgoUnit[] = [
  { seconds: 31536000, label: { tr: 'yil', en: 'year' } },
  { seconds: 2592000, label: { tr: 'ay', en: 'month' } },
  { seconds: 604800, label: { tr: 'hafta', en: 'week' } },
  { seconds: 86400, label: { tr: 'gun', en: 'day' } },
  { seconds: 3600, label: { tr: 'saat', en: 'hour' } },
  { seconds: 60, label: { tr: 'dakika', en: 'minute' } },
  { seconds: 1, label: { tr: 'saniye', en: 'second' } },
];

/**
 * Human-readable relative time string.
 *
 * @example
 * timeAgo('2025-06-14T10:00:00Z') // "1 gun once"
 */
export function timeAgo(input: DateInput, locale: 'tr' | 'en' = 'tr'): string {
  const date = toDate(input);
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSeconds < 5) {
    return locale === 'tr' ? 'az once' : 'just now';
  }

  for (const unit of TIME_UNITS) {
    const count = Math.floor(Math.abs(diffSeconds) / unit.seconds);
    if (count >= 1) {
      const suffix = locale === 'tr' ? 'once' : 'ago';
      const prefix = diffSeconds < 0 ? (locale === 'tr' ? '' : 'in ') : '';
      const postfix = diffSeconds < 0 ? (locale === 'tr' ? ' sonra' : '') : ` ${suffix}`;
      return `${prefix}${count} ${unit.label[locale]}${postfix}`;
    }
  }

  return locale === 'tr' ? 'az once' : 'just now';
}

export interface RemainingTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  formatted: string;
}

/**
 * Calculate the remaining time until a target date.
 *
 * @example
 * getRemainingTime('2025-06-16T18:00:00Z')
 * // { days: 1, hours: 3, minutes: 30, seconds: 0, ... formatted: "1g 3s 30d" }
 */
export function getRemainingTime(endDate: DateInput): RemainingTime {
  const end = toDate(endDate);
  const totalSeconds = Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000));
  const isExpired = totalSeconds <= 0;

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let formatted: string;
  if (isExpired) {
    formatted = 'Sona erdi';
  } else if (days > 0) {
    formatted = `${days}g ${hours}s ${minutes}d`;
  } else if (hours > 0) {
    formatted = `${hours}s ${minutes}d ${seconds}sn`;
  } else if (minutes > 0) {
    formatted = `${minutes}d ${seconds}sn`;
  } else {
    formatted = `${seconds}sn`;
  }

  return { days, hours, minutes, seconds, totalSeconds, isExpired, formatted };
}

/**
 * Check whether an auction is currently active based on its start and end dates.
 */
export function isAuctionActive(startDate: DateInput, endDate: DateInput): boolean {
  const now = Date.now();
  return toDate(startDate).getTime() <= now && toDate(endDate).getTime() > now;
}
