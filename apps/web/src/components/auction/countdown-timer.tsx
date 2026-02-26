"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn, getTimeRemaining } from "@/lib/utils";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  endDate: string | Date;
  compact?: boolean;
  onExpired?: () => void;
  className?: string;
  showIcon?: boolean;
}

export function CountdownTimer({
  endDate,
  compact = false,
  onExpired,
  className,
  showIcon = false,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(endDate));

  const getUrgencyClass = useCallback(() => {
    if (timeLeft.isExpired) return "timer-urgent";
    if (timeLeft.total < 60 * 60 * 1000) return "timer-urgent"; // < 1 hour
    if (timeLeft.total < 24 * 60 * 60 * 1000) return "timer-warning"; // < 1 day
    return "timer-normal";
  }, [timeLeft.isExpired, timeLeft.total]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(endDate);
      setTimeLeft(remaining);

      if (remaining.isExpired) {
        clearInterval(interval);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate, onExpired]);

  if (timeLeft.isExpired) {
    return (
      <div className={cn("text-red-500 font-semibold text-sm", className)}>
        Sona Erdi
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("text-xs", getUrgencyClass(), className)}>
        {showIcon && <Clock className="mr-1 inline h-3 w-3" />}
        {timeLeft.days > 0 && `${timeLeft.days}g `}
        {String(timeLeft.hours).padStart(2, "0")}:
        {String(timeLeft.minutes).padStart(2, "0")}:
        {String(timeLeft.seconds).padStart(2, "0")}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", getUrgencyClass(), className)}>
      {showIcon && <Clock className="h-5 w-5" />}
      <div className="flex gap-1">
        {timeLeft.days > 0 && (
          <TimeBlock value={timeLeft.days} label="Gun" />
        )}
        <TimeBlock value={timeLeft.hours} label="Saat" />
        <TimeBlock value={timeLeft.minutes} label="Dk" />
        <TimeBlock value={timeLeft.seconds} label="Sn" />
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--muted)] text-xl font-bold tabular-nums">
        {String(value).padStart(2, "0")}
      </div>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </span>
    </div>
  );
}
